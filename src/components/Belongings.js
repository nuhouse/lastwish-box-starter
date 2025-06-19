import React, { useEffect, useState, useRef } from "react";
import { db, storage } from "../firebase";
import {
  collection, addDoc, query, where, orderBy, onSnapshot,
  serverTimestamp, doc, updateDoc, deleteDoc
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "firebase/storage";

// Utility for device detection
function isMobile() {
  return /Mobi|Android/i.test(navigator.userAgent);
}

export default function Belongings({ user }) {
  const [belongings, setBelongings] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // Belonging object or null
  const [form, setForm] = useState({
    image: null,
    imageUrl: "",
    contactId: "",
    customContact: "",
    description: "",
    message: "",
  });
  const fileInputRef = useRef();

  // Fetch belongings (for this user)
  useEffect(() => {
    const q = query(
      collection(db, "belongings"),
      where("uid", "==", user.uid),
      orderBy("contactName"),
      // Optional: orderBy("created", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setBelongings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user.uid]);

  // Fetch contacts (for dropdown)
  useEffect(() => {
    const q = query(
      collection(db, "contacts"),
      where("uid", "==", user.uid)
    );
    const unsub = onSnapshot(q, snap => {
      setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user.uid]);

  // Group belongings by contact/beneficiary
  const grouped = {};
  belongings.forEach(b => {
    const key = b.contactId === "other" ? b.customContact : (contacts.find(c => c.id === b.contactId)?.name || "Unknown");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(b);
  });

  // Handle image input (camera for mobile)
  const handleImageInput = (e) => {
    setForm(f => ({ ...f, image: e.target.files[0] || null }));
  };

  // Open add form
  const openAddForm = () => {
    setForm({
      image: null,
      imageUrl: "",
      contactId: "",
      customContact: "",
      description: "",
      message: ""
    });
    setEditing(null);
    setShowForm(true);
  };

  // Open edit form
  const openEditForm = (belonging) => {
    setForm({
      image: null,
      imageUrl: belonging.imageUrl || "",
      contactId: belonging.contactId,
      customContact: belonging.customContact || "",
      description: belonging.description,
      message: belonging.message
    });
    setEditing(belonging);
    setShowForm(true);
  };

  // Handle dropdown (contacts)
  const handleContactChange = (e) => {
    setForm(f => ({
      ...f,
      contactId: e.target.value,
      customContact: e.target.value === "other" ? f.customContact : ""
    }));
  };

  // Handle "Other" contact name input
  const handleCustomContactChange = (e) => {
    setForm(f => ({
      ...f,
      customContact: e.target.value
    }));
  };

  // Save (add or update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    let imageUrl = form.imageUrl;
    let imageName = null;
    if (form.image) {
      imageName = `${user.uid}_${Date.now()}_${form.image.name}`;
      const storageRef = ref(storage, `belongings/${user.uid}/${imageName}`);
      const uploadTask = uploadBytesResumable(storageRef, form.image);
      await new Promise((resolve, reject) => {
        uploadTask.on("state_changed", null, reject, () => resolve());
      });
      imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
    }
    const belongingData = {
      uid: user.uid,
      contactId: form.contactId,
      customContact: form.contactId === "other" ? form.customContact : "",
      contactName: form.contactId === "other"
        ? form.customContact
        : (contacts.find(c => c.id === form.contactId)?.name || ""),
      description: form.description,
      message: form.message,
      imageUrl: imageUrl || "",
      imageName: imageName || editing?.imageName || "",
      created: serverTimestamp(),
    };
    if (editing) {
      await updateDoc(doc(db, "belongings", editing.id), belongingData);
    } else {
      await addDoc(collection(db, "belongings"), belongingData);
    }
    setShowForm(false);
    setForm({
      image: null, imageUrl: "", contactId: "", customContact: "", description: "", message: ""
    });
  };

  // Delete
  const handleDelete = async () => {
    if (!editing) return;
    if (!window.confirm("Delete this belonging?")) return;
    if (editing.imageName) {
      try {
        await deleteObject(ref(storage, `belongings/${user.uid}/${editing.imageName}`));
      } catch {}
    }
    await deleteDoc(doc(db, "belongings", editing.id));
    setShowForm(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0 24px 0" }}>
        <h2>Belongings</h2>
        <button
          onClick={openAddForm}
          style={{
            background: "#2a0516", color: "#fff", border: "none", borderRadius: 6,
            padding: "9px 24px", fontWeight: 600, fontSize: 17, cursor: "pointer"
          }}
        >Add Belonging</button>
      </div>

      {/* --- LIST OF BELONGINGS, GROUPED --- */}
      <div>
        {Object.keys(grouped).length === 0 && (
          <div style={{ color: "#645155", padding: 24 }}>No belongings added yet.</div>
        )}
        {Object.entries(grouped).map(([contact, items]) => (
          <div key={contact} style={{ marginBottom: 28 }}>
            <div style={{
              fontWeight: 600, fontSize: 20, color: "#2a0516",
              borderBottom: "1.5px solid #eee", marginBottom: 10
            }}>{contact}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
              {items.map(b => (
                <div key={b.id} style={{
                  background: "#fff",
                  borderRadius: 12,
                  boxShadow: "0 1px 6px #0001",
                  padding: 14,
                  minWidth: 220,
                  maxWidth: 280,
                  marginBottom: 8,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center"
                }}>
                  {b.imageUrl && (
                    <img
                      src={b.imageUrl}
                      alt="Belonging"
                      style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, marginBottom: 10 }}
                    />
                  )}
                  <div style={{ fontWeight: 500, color: "#2a0516", marginBottom: 7 }}>{b.description}</div>
                  <div style={{ color: "#645155", fontSize: 14, marginBottom: 5 }}>{b.message}</div>
                  <button
                    style={{
                      marginTop: 4,
                      background: "#e97c13", color: "#fff", border: "none", borderRadius: 4,
                      padding: "5px 13px", fontWeight: 600, cursor: "pointer"
                    }}
                    onClick={() => openEditForm(b)}
                  >Edit</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* --- ADD/EDIT FORM MODAL --- */}
      {showForm && (
        <div style={{
          position: "fixed", zIndex: 99, left: 0, top: 0, width: "100vw", height: "100vh",
          background: "#0007", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <form
            onSubmit={handleSubmit}
            style={{
              background: "#fff",
              padding: 30,
              borderRadius: 13,
              minWidth: 320,
              maxWidth: 420,
              width: "95vw",
              boxShadow: "0 4px 28px #0002",
              display: "flex",
              flexDirection: "column",
              gap: 16
            }}
          >
            <div style={{ fontSize: 21, fontWeight: 700, color: "#2a0516", marginBottom: 5 }}>
              {editing ? "Edit Belonging" : "Add Belonging"}
            </div>

            {/* Image: Camera on mobile, file on all */}
            <div>
              <label style={{ fontWeight: 500 }}>Image</label><br />
              {isMobile() && (
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageInput}
                  ref={fileInputRef}
                  style={{ margin: "7px 0" }}
                />
              )}
              {!isMobile() && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageInput}
                  ref={fileInputRef}
                  style={{ margin: "7px 0" }}
                />
              )}
              {form.imageUrl && !form.image && (
                <img
                  src={form.imageUrl}
                  alt="Current"
                  style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 7, marginTop: 8 }}
                />
              )}
            </div>

            {/* Contact Dropdown */}
            <div>
              <label style={{ fontWeight: 500 }}>Beneficiary</label><br />
              <select
                value={form.contactId}
                onChange={handleContactChange}
                required
                style={{ width: "100%", padding: 7, borderRadius: 5, border: "1px solid #ccc" }}
              >
                <option value="">Select a contact...</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="other">Other contact</option>
              </select>
              {form.contactId === "other" && (
                <input
                  type="text"
                  placeholder="Enter beneficiary name"
                  value={form.customContact}
                  onChange={handleCustomContactChange}
                  style={{ width: "100%", marginTop: 7, padding: 7, borderRadius: 5, border: "1px solid #ccc" }}
                  required
                />
              )}
            </div>

            {/* Description */}
            <div>
              <label style={{ fontWeight: 500 }}>Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                required
                minLength={2}
                maxLength={500}
                style={{ width: "100%", minHeight: 36, padding: 7, borderRadius: 5, border: "1px solid #ccc" }}
              />
            </div>

            {/* Message */}
            <div>
              <label style={{ fontWeight: 500 }}>Message to beneficiary</label>
              <textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                required
                minLength={2}
                maxLength={500}
                style={{ width: "100%", minHeight: 36, padding: 7, borderRadius: 5, border: "1px solid #ccc" }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <button
                type="submit"
                style={{
                  background: "#2a0516", color: "#fff", border: "none", borderRadius: 5,
                  padding: "9px 24px", fontWeight: 600, fontSize: 17, cursor: "pointer"
                }}
              >
                {editing ? "Update" : "Add"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  style={{
                    background: "#fff",
                    color: "#980000",
                    border: "1.5px solid #980000",
                    borderRadius: 6,
                    padding: "8px 19px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >Delete</button>
              )}
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  background: "#ccc", color: "#333", border: "none", borderRadius: 5,
                  padding: "8px 19px", fontWeight: 600, marginLeft: 9, cursor: "pointer"
                }}
              >Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
