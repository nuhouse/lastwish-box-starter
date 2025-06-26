import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";

function defaultForm(user) {
  return {
    uid: user?.uid || "",
    recipient: "",
    email: "",
    message: "",
    includeVault: false,
    delivery: "upon-death",
    deliverAt: "",
    created: null
  };
}

export default function LegacyMessage({ user, masterPw }) {
  const [messages, setMessages] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm(user));
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [copySuccess, setCopySuccess] = useState("");
  const [search, setSearch] = useState("");
  const textareaRef = useRef();

  // Load messages
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "legacyMessages"),
      where("uid", "==", user.uid),
      orderBy("created", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  function openForm(msg = null) {
    setShowForm(true);
    setCopySuccess("");
    if (msg) {
      setForm({ ...msg, deliverAt: msg.deliverAt || "" });
      setEditingId(msg.id);
    } else {
      setForm(defaultForm(user));
      setEditingId(null);
    }
    setTimeout(() => {
      if (textareaRef.current) textareaRef.current.focus();
    }, 200);
  }
  function closeForm() {
    setShowForm(false);
    setForm(defaultForm(user));
    setEditingId(null);
    setCopySuccess("");
  }
  function handleInput(e) {
    const { name, value, type, checked } = e.target;
    setForm(f => ({
      ...f,
      [name]: type === "checkbox" ? checked : value
    }));
  }
  // Paste master password
  function pasteVaultPassword() {
    if (!masterPw) {
      setCopySuccess("No master password set.");
      return;
    }
    setForm(f => ({
      ...f,
      message: f.message
        ? `${f.message}\n\n[Vault Master Password]: ${masterPw}`
        : `[Vault Master Password]: ${masterPw}`
    }));
    setCopySuccess("Master password added to message.");
    setTimeout(() => setCopySuccess(""), 1600);
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setUploading(true);
    try {
      const payload = {
        uid: user.uid,
        recipient: form.recipient,
        email: form.email,
        message: form.message,
        includeVault: form.includeVault,
        delivery: form.delivery,
        deliverAt: form.delivery === "scheduled" ? form.deliverAt : "",
        created: editingId ? form.created : serverTimestamp(),
        updated: serverTimestamp(),
      };
      if (form.includeVault && masterPw) {
        payload.message += `\n\n[Vault Master Password]: ${masterPw}`;
      }
      if (editingId) {
        await updateDoc(doc(db, "legacyMessages", editingId), payload);
      } else {
        await addDoc(collection(db, "legacyMessages"), payload);
      }
      closeForm();
    } catch (err) {
      alert("Failed to save: " + err.message);
    }
    setUploading(false);
  }
  async function handleDelete(id) {
    if (!window.confirm("Delete this legacy message?")) return;
    try {
      await deleteDoc(doc(db, "legacyMessages", id));
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  }

  // Filtered search
  const filtered = messages.filter(
    m =>
      m.recipient.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.message.toLowerCase().includes(search.toLowerCase())
  );

  // --- UI ---
  return (
    <div className="legacy-root">
      <h2>Legacy Messages</h2>
      <div className="legacy-info">
        <b>Leave a final message, instructions, or vault password for your trusted contact(s).</b>
        <br />
        Your message will be delivered on death, a set date, or by admin approval.
      </div>
      <div className="legacy-actions-row">
        <button className="btn-main" onClick={() => openForm()}>+ New Legacy Message</button>
        <input
          type="text"
          className="legacy-search"
          placeholder="Search messages or contacts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="legacy-grid">
        {filtered.length === 0 ? (
          <div className="legacy-empty">No legacy messages yet.</div>
        ) : (
          filtered.map(msg => (
            <div className="legacy-card" key={msg.id}>
              <div className="legacy-card-recipient">{msg.recipient}</div>
              <div className="legacy-card-email">{msg.email}</div>
              <div className="legacy-card-date">
                {msg.created?.toDate ? msg.created.toDate().toLocaleString() : ""}
              </div>
              <div className="legacy-card-message">
                {msg.message.length > 220
                  ? msg.message.slice(0, 220) + "…"
                  : msg.message}
              </div>
              <div className="legacy-card-delivery">
                Delivery: {
                  msg.delivery === "immediate"
                    ? "Immediately"
                    : msg.delivery === "scheduled"
                      ? `Scheduled: ${msg.deliverAt || ""}`
                      : "Upon death/admin release"
                }
              </div>
              <div className="legacy-card-actions">
                <button className="btn-main" onClick={() => openForm(msg)}>Edit</button>
                <button className="btn-danger" onClick={() => handleDelete(msg.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- Modal form --- */}
      {showForm && (
        <div className="legacy-modal-bg" onClick={closeForm}>
          <form className="legacy-form" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
            <h3>{editingId ? "Edit" : "New"} Legacy Message</h3>
            <label>Recipient Name</label>
            <input
              type="text"
              name="recipient"
              value={form.recipient}
              onChange={handleInput}
              required
            />
            <label>Recipient Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleInput}
              required
            />
            <label>Message</label>
            <textarea
              name="message"
              ref={textareaRef}
              value={form.message}
              onChange={handleInput}
              rows={5}
              required
              placeholder="Write your instructions, notes, or wishes here…"
            />
            <div className="legacy-checkbox-row">
              <label>
                <input
                  type="checkbox"
                  name="includeVault"
                  checked={form.includeVault}
                  onChange={handleInput}
                />{" "}
                Attach my Password Vault master password
              </label>
              <button
                type="button"
                className="btn-cancel legacy-btn-paste"
                onClick={pasteVaultPassword}
              >
                Paste Vault Password
              </button>
              {copySuccess && <span className="legacy-copy-msg">{copySuccess}</span>}
            </div>
            <div className="legacy-delivery-row">
              <label>Delivery:</label>
              <select name="delivery" value={form.delivery} onChange={handleInput}>
                <option value="upon-death">Upon Death/Admin Approval</option>
                <option value="scheduled">On Specific Date</option>
                <option value="immediate">Immediately</option>
              </select>
              {form.delivery === "scheduled" && (
                <input
                  type="date"
                  name="deliverAt"
                  value={form.deliverAt}
                  onChange={handleInput}
                  required
                />
              )}
            </div>
            <div className="legacy-form-actions">
              <button className="btn-main" type="submit" disabled={uploading}>
                {editingId ? "Update" : "Add"}
              </button>
              <button type="button" className="btn-cancel" onClick={closeForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
