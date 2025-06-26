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

  function onInput(e) {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "contacts", editingId), {
          ...form,
          updated: serverTimestamp(),
        });
      } else {
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

  async function handleDelete() {
    if (!editingId) return;
    if (window.confirm("Are you sure you want to delete this contact?")) {
      await deleteDoc(doc(db, "contacts", editingId));
      closeModal();
    }
  }

  const grouped = groupContacts(contacts);

  return (
    <div className="contacts-root">
      <h2 className="contacts-title">Contacts</h2>
      <button className="btn-main contacts-add-btn" onClick={() => openModal()}>
        + Add Contact
      </button>
      <div className="contacts-grid">
        {["Family", "Friends", "Other"].map((section) => (
          <div className="contacts-col" key={section}>
            <div className="contacts-section-title">{section}</div>
            {grouped[section].length === 0 && (
              <div className="contacts-empty">No contacts yet.</div>
            )}
            {grouped[section].map((contact) => (
              <div className="contacts-card" key={contact.id} onClick={() => openModal(contact)}>
                <div className="contacts-card-name">{contact.name}</div>
                <div className="contacts-card-relationship">{contact.relationship}</div>
                <div className="contacts-card-email">{contact.email}</div>
                <div className="contacts-card-phone">{contact.phone}</div>
                {contact.notes && (
                  <div className="contacts-card-notes">{contact.notes}</div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="contacts-modal-bg" onClick={closeModal}>
          <div className="contacts-modal-card" onClick={e => e.stopPropagation()}>
            <div className="contacts-modal-title">{editingId ? "Edit Contact" : "Add Contact"}</div>
            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="contacts-modal-fields">
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  placeholder="Name"
                  onChange={onInput}
                  required
                  minLength={2}
                  className="contacts-input"
                />
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  placeholder="Phone"
                  onChange={onInput}
                  className="contacts-input"
                />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  placeholder="Email"
                  onChange={onInput}
                  className="contacts-input"
                />
                <select
                  name="relationship"
                  value={form.relationship}
                  onChange={onInput}
                  required
                  className="contacts-input"
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
                  className="contacts-input"
                />
              </div>
              <div className="contacts-modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={closeModal}
                  disabled={saving}
                >Cancel</button>
                {editingId && (
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={handleDelete}
                    disabled={saving}
                  >Delete</button>
                )}
                <button
                  type="submit"
                  className="btn-main"
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
