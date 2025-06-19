import React, { useState, useEffect } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where
} from "firebase/firestore";
import { db } from "../firebase";

const RELATIONSHIP_OPTIONS = ["Family", "Friends", "Other"];

function emptyContact() {
  return {
    id: null,
    name: "",
    phone: "",
    email: "",
    relationship: "Family",
    notes: ""
  };
}

export default function Contacts({ user }) {
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyContact());
  const [saving, setSaving] = useState(false);

  // Fetch contacts in real-time
  useEffect(() => {
    if (!user) return;
    const contactsRef = collection(db, "users", user.uid, "contacts");
    const q = query(contactsRef, where("uid", "==", user.uid));
    return onSnapshot(contactsRef, (snap) => {
      setContacts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user]);

  // Group contacts
  const grouped = { Family: [], Friends: [], Other: [] };
  contacts.forEach(c => grouped[c.relationship]?.push(c));

  // Open modal (for add or edit)
  const openModal = (contact = null) => {
    setForm(contact ? { ...contact } : emptyContact());
    setShowModal(true);
  };

  // Handle field changes
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  // Save contact
  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    const ref = collection(db, "users", user.uid, "contacts");
    const data = {
      ...form,
      uid: user.uid,
    };
    try {
      if (form.id) {
        // Edit
        await updateDoc(doc(db, "users", user.uid, "contacts", form.id), data);
      } else {
        // Add
        await addDoc(ref, data);
      }
      setShowModal(false);
      setForm(emptyContact());
    } catch (err) {
      alert("Failed to save contact: " + err.message);
    }
    setSaving(false);
  };

  // Delete contact
  const handleDelete = async () => {
    if (!form.id) return;
    if (window.confirm("Are you sure you want to delete this contact?")) {
      await deleteDoc(doc(db, "users", user.uid, "contacts", form.id));
      setShowModal(false);
      setForm(emptyContact());
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 22 }}>
      <h2 style={{ marginBottom: 10 }}>Contacts</h2>
      <button
        style={{
          background: "#2a0516", color: "#fff", border: "none", borderRadius: 5,
          padding: "10px 20px", marginBottom: 26, cursor: "pointer", fontWeight: 600
        }}
        onClick={() => openModal()}
      >
        + Add Contact
      </button>

      {/* List by relationship */}
      {RELATIONSHIP_OPTIONS.map(group => (
        <div key={group} style={{ marginBottom: 25 }}>
          <div style={{
            fontWeight: 700,
            fontSize: 18,
            marginBottom: 7,
            color: "#e97c13"
          }}>{group}:</div>
          {grouped[group]?.length ? (
            grouped[group].map(c => (
              <div
                key={c.id}
                style={{
                  background: "#f8f8fa",
                  border: "1px solid #eee",
                  borderRadius: 9,
                  padding: 16,
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 14, color: "#555" }}>{c.email || c.phone}</div>
                  <div style={{ fontSize: 13, color: "#888" }}>{c.notes}</div>
                </div>
                <button
                  style={{
                    background: "#e97c13",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    padding: "6px 16px",
                    fontWeight: 600,
                    cursor: "pointer",
                    marginLeft: 8
                  }}
                  onClick={() => openModal(c)}
                >
                  Edit
                </button>
              </div>
            ))
          ) : (
            <div style={{ color: "#bbb", marginBottom: 8, fontSize: 15 }}>No contacts.</div>
          )}
        </div>
      ))}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh",
          background: "rgba(36,16,32,0.28)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50
        }}>
          <form
            onSubmit={handleSubmit}
            style={{
              background: "#fff", borderRadius: 12, maxWidth: 370, width: "96vw",
              padding: "26px 24px 18px 24px", boxShadow: "0 4px 24px #2a051634"
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>{form.id ? "Edit" : "Add"} Contact</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Full Name"
                style={{ padding: 10, borderRadius: 5, border: "1px solid #ccc" }}
                autoFocus
              />
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                type="tel"
                placeholder="Phone"
                style={{ padding: 10, borderRadius: 5, border: "1px solid #ccc" }}
              />
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                type="email"
                placeholder="Email"
                style={{ padding: 10, borderRadius: 5, border: "1px solid #ccc" }}
              />
              <select
                name="relationship"
                value={form.relationship}
                onChange={handleChange}
                style={{ padding: 10, borderRadius: 5, border: "1px solid #ccc" }}
              >
                {RELATIONSHIP_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Notes"
                style={{ padding: 10, borderRadius: 5, border: "1px solid #ccc", resize: "vertical" }}
              />
            </div>
            <div style={{
              display: "flex", justifyContent: form.id ? "space-between" : "flex-end",
              marginTop: 22
            }}>
              {form.id && (
                <button
                  type="button"
                  onClick={handleDelete}
                  title="Delete Contact"
                  style={{
                    background: "#ab2c1e",
                    color: "#fff",
                    border: "none",
                    borderRadius: 5,
                    padding: "9px 13px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                  disabled={saving}
                >
                  🗑
                </button>
              )}
              <button
                type="submit"
                style={{
                  background: "#2a0516",
                  color: "#fff",
                  border: "none",
                  borderRadius: 5,
                  padding: "9px 20px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
                disabled={saving}
              >
                {saving ? "Saving..." : "Submit"}
              </button>
            </div>
            <button
              type="button"
              style={{
                background: "none",
                color: "#222",
                border: "none",
                borderRadius: 4,
                padding: 7,
                marginTop: 6,
                cursor: "pointer",
                display: "block",
                marginLeft: "auto"
              }}
              onClick={() => setShowModal(false)}
            >Close</button>
          </form>
        </div>
      )}
    </div>
  );
}

