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
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    image: null,
    imageUrl: "",
    contactId: "",
    customContact: "",
    description: "",
    message: "",
  });
  const fileInputRef = useRef();

  useEffect(() => {
    const q = query(
      collection(db, "belongings"),
      where("uid", "==", user.uid),
      orderBy("contactName"),
    );
    const unsub = onSnapshot(q, snap => {
      setBelongings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user.uid]);

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

  // Group belongings by contact
  const grouped = {};
  belongings.forEach(b => {
    const key = b.contactId === "other" ? b.customContact : (contacts.find(c => c.id === b.contactId)?.name || "Unknown");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(b);
  });

  const handleImageInput = (e) => {
    setForm(f => ({ ...f, image: e.target.files[0] || null }));
  };

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

  const handleContactChange = (e) => {
    setForm(f => ({
      ...f,
      contactId: e.target.value,
      customContact: e.target.value === "other" ? f.customContact : ""
    }));
  };

  const handleCustomContactChange = (e) => {
    setForm(f => ({
      ...f,
      customContact: e.target.value
    }));
  };

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

  // --- Main render ---
  return (
    <div className="belongings-root">
      <div className="belongings-header">
        <h2>Belongings</h2>
        <button className="btn-main belongings-add-btn" onClick={openAddForm}>Add Belonging</button>
      </div>

      {/* Grouped list in columns */}
      <div className="belongings-grid">
        {Object.keys(grouped).length === 0 && (
          <div className="belongings-empty">No belongings added yet.</div>
        )}
        {Object.entries(grouped).map(([contact, items]) => (
          <div className="belongings-col" key={contact}>
            <div className="belongings-section-title">{contact}</div>
            {items.map(b => (
              <div className="belongings-card" key={b.id}>
                {b.imageUrl && (
                  <img
                    src={b.imageUrl}
                    alt="Belonging"
                    className="belongings-card-img"
                  />
                )}
                <div className="belongings-card-desc">{b.description}</div>
                <div className="belongings-card-message">{b.message}</div>
                <button
                  className="btn-main belongings-card-edit"
                  onClick={() => openEditForm(b)}
                  style={{ marginTop: 7 }}
                >Edit</button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* --- FORM MODAL --- */}
      {showForm && (
        <div className="belongings-modal-bg" onClick={() => setShowForm(false)}>
          <form
            onSubmit={handleSubmit}
            className="belongings-modal-card"
            onClick={e => e.stopPropagation()}
          >
            <div className="belongings-modal-title">
              {editing ? "Edit Belonging" : "Add Belonging"}
            </div>
            {/* Image upload */}
            <div>
              <label>Image</label><br />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageInput}
                ref={fileInputRef}
                className="belongings-input"
                {...(isMobile() ? { capture: "environment" } : {})}
              />
              {form.imageUrl && !form.image && (
                <img
                  src={form.imageUrl}
                  alt="Current"
                  className="belongings-modal-thumb"
                />
              )}
            </div>
            {/* Contact dropdown */}
            <div>
              <label>Beneficiary</label><br />
              <select
                value={form.contactId}
                onChange={handleContactChange}
                required
                className="belongings-input"
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
                  required
                  className="belongings-input"
                />
              )}
            </div>
            {/* Description */}
            <div>
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                required
                minLength={2}
                maxLength={500}
                className="belongings-input"
              />
            </div>
            {/* Message */}
            <div>
              <label>Message to beneficiary</label>
              <textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                required
                minLength={2}
                maxLength={500}
                className="belongings-input"
              />
            </div>
            <div className="belongings-modal-actions">
              <button type="submit" className="btn-main">{editing ? "Update" : "Add"}</button>
              {editing && (
                <button type="button" className="btn-danger" onClick={handleDelete}>Delete</button>
              )}
              <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
