// src/components/Contacts.js
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";

// Relationship options
const RELATIONSHIP_OPTIONS = [
  { value: "Family", label: "Family" },
  { value: "Friends", label: "Friends" },
  { value: "Other", label: "Other" }
];

// Group contacts into sections
function groupContacts(contacts) {
  return {
    Family: contacts.filter((c) => c.relationship === "Family"),
    Friends: contacts.filter((c) => c.relationship === "Friends"),
    Other: contacts.filter((c) => c.relationship === "Other"),
  };
}

export default function Contacts({ user }) {
  const [contacts, setContacts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    relationship: "Family",
    notes: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch contacts for current user, sorted by relationship then name
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "contacts"),
      where("uid", "==", user.uid),
      orderBy("relationship"),
      orderBy("name")
    );
    const unsub = onSnapshot(q, (snap) => {
      setContacts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user?.uid]);

  // Open modal for add/edit
  function openModal(contact = null) {
    if (contact) {
      setForm({
        name: contact.name || "",
        phone: contact.phone || "",
        email: contact.email || "",
        relationship: contact.relationship || "Family",
        notes: contact.notes || "",
      });
      setEditingId(contact.id);
    } else {
      setForm({
        name: "",
        phone: "",
        email: "",
        relationship: "Family",
        notes: "",
      });
      setEditingId(null);
    }
    setModalOpen(true);
  }

  // Close and reset modal
  function closeModal() {
    setModalOpen(false);
    setForm({
      name: "",
      phone: "",
      email: "",
      relationship: "Family",
      notes: "",
    });
    setEditingId(null);
  }

  // Handle input change
  function onInput(e) {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  // Submit new or edited contact
  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        // Update existing
        await updateDoc(doc(db, "contacts", editingId), {
          ...form,
          updated: serverTimestamp(),
        });
      } else {
        // Add new
        await addDoc(collection(db, "contacts"), {
          ...form,
          uid: user.uid,
          created: serverTimestamp(),
        });
      }
      closeModal();
    } catch (err) {
      alert("Error saving contact: " + err.message);
    }
    setSaving(false);
  }

  // Delete contact (with confirmation)
  async function handleDelete() {
    if (!editingId) return;
    if (window.confirm("Are you sure you want to delete this contact?")) {
      await deleteDoc(doc(db, "contacts", editingId));
      closeModal();
    }
  }

  // Group contacts for display
  const grouped = groupContacts(contacts);

  return (
    <div style={{ maxWidth: 850, margin: "0 auto", padding: 24 }}>
      <h2 style={{ color: "#2a0516", fontWeight: 700, marginBottom: 30 }}>Contacts</h2>
      <button
        style={{
          background: "#2a0516",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "10px 26px",
          fontWeight: 600,
          marginBottom: 28,
          cursor: "pointer",
          fontSize: 18
        }}
        onClick={() => openModal()}
      >
        + Add Contact
      </button>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(290px,1fr))",
        gap: 30,
      }}>
        {["Family", "Friends", "Other"].map((section) => (
          <div key={section}>
            <div style={{
              fontWeight: 600,
              fontSize: 20,
              color: "#645155",
              borderBottom: "2px solid #eee",
              paddingBottom: 8,
              marginBottom: 12,
              letterSpacing: 1
            }}>{section}</div>
            {grouped[section].length === 0 && (
              <div style={{ color: "#999", fontSize: 15, marginBottom: 10 }}>No contacts yet.</div>
            )}
            {grouped[section].map((contact) => (
              <div key={contact.id}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  boxShadow: "0 1px 6px 0 #0001",
                  marginBottom: 16,
                  padding: "18px 16px",
                  position: "relative",
                  transition: "box-shadow .18s",
                  cursor: "pointer"
                }}
                onClick={() => openModal(contact)}
              >
                <div style={{ fontWeight: 600, fontSize: 17, color: "#2a0516", marginBottom: 3 }}>
                  {contact.name}
                </div>
                <div style={{ color: "#575787", fontSize: 15 }}>{contact.relationship}</div>
                <div style={{ color: "#555", fontSize: 14 }}>{contact.email}</div>
                <div style={{ color: "#555", fontSize: 14 }}>{contact.phone}</div>
                {contact.notes && (
                  <div style={{ color: "#7d6e83", fontSize: 13, marginTop: 6 }}>{contact.notes}</div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* MODAL for Add/Edit Contact */}
      {modalOpen && (
        <div style={{
          position: "fixed",
          zIndex: 1000,
          inset: 0,
          background: "rgba(34,15,30,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 18,
            minWidth: 320,
            maxWidth: 400,
            width: "96vw",
            boxShadow: "0 8px 40px 0 #0003",
            padding: 30,
            position: "relative"
          }}>
            <div style={{ fontWeight: 700, fontSize: 21, color: "#2a0516", marginBottom: 16 }}>
              {editingId ? "Edit Contact" : "Add Contact"}
            </div>
            <form onSubmit={handleSubmit} autoComplete="off">
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  placeholder="Name"
                  onChange={onInput}
                  required
                  minLength={2}
                  style={{
                    border: "1px solid #ccc", borderRadius: 6, padding: "10px 11px", fontSize: 16
                  }}
                />
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  placeholder="Phone"
                  onChange={onInput}
                  style={{
                    border: "1px solid #ccc", borderRadius: 6, padding: "10px 11px", fontSize: 16
                  }}
                />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  placeholder="Email"
                  onChange={onInput}
                  style={{
                    border: "1px solid #ccc", borderRadius: 6, padding: "10px 11px", fontSize: 16
                  }}
                />
                <select
                  name="relationship"
                  value={form.relationship}
                  onChange={onInput}
                  style={{
                    border: "1px solid #ccc", borderRadius: 6, padding: "10px 11px", fontSize: 16
                  }}
                  required
                >
                  {RELATIONSHIP_OPTIONS.map(opt =>
                    <option value={opt.value} key={opt.value}>{opt.label}</option>
                  )}
                </select>
                <textarea
                  name="notes"
                  value={form.notes}
                  placeholder="Notes"
                  onChange={onInput}
                  rows={2}
                  style={{
                    border: "1px solid #ccc", borderRadius: 6, padding: "10px 11px", fontSize: 16, resize: "vertical"
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 25 }}>
                <button
                  type="button"
                  style={{
                    background: "#ccc", color: "#333", border: "none", borderRadius: 6,
                    padding: "10px 20px", fontWeight: 500, marginRight: 6, cursor: "pointer"
                  }}
                  onClick={closeModal}
                  disabled={saving}
                >Cancel</button>
                {editingId && (
                  <button
                    type="button"
                    style={{
                      background: "#a62828", color: "#fff", border: "none", borderRadius: 6,
                      padding: "10px 18px", fontWeight: 500, marginRight: 6, cursor: "pointer"
                    }}
                    onClick={handleDelete}
                    disabled={saving}
                  >Delete</button>
                )}
                <button
                  type="submit"
                  style={{
                    background: "#2a0516", color: "#fff", border: "none", borderRadius: 6,
                    padding: "10px 21px", fontWeight: 600, cursor: "pointer"
                  }}
                  disabled={saving}
                >{saving ? "Saving..." : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
