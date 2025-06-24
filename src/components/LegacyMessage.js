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
    delivery: "upon-death", // "immediate", "scheduled", "upon-death"
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

  // Load existing messages
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
  // Paste master password in message
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
    <div className="pol-root">
      <h2>Legacy Message</h2>
      <div style={{
        background: "#f1f5fa", color: "#2a0516", borderRadius: 9, padding: 14, marginBottom: 15, fontSize: 15, maxWidth: 530
      }}>
        <b>Leave a final message, instructions, or vault password for your trusted contact(s).</b>
        <br />
        Your message will be delivered on death, a set date, or by admin approval.
      </div>
      <button className="btn-main" onClick={() => openForm()}>+ New Legacy Message</button>
      <input
        type="text"
        placeholder="Search messages or contacts..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ minWidth: 180, maxWidth: 290, borderRadius: 7, border: "1.2px solid #bfa4c4", padding: 8, fontSize: "1em", margin: "0 0 16px 17px" }}
      />
      <div className="pol-grid">
        {filtered.length === 0 ? (
          <div style={{ color: "#a697b8", padding: 28, textAlign: "center" }}>No legacy messages yet.</div>
        ) : (
          filtered.map(msg => (
            <div className="card" key={msg.id} style={{ minHeight: 120, position: "relative" }}>
              <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 2 }}>{msg.recipient}</div>
              <div style={{ color: "#657899", fontSize: 14 }}>{msg.email}</div>
              <div style={{ color: "#b9aac3", fontSize: 13, marginBottom: 4 }}>
                {msg.created?.toDate ? msg.created.toDate().toLocaleString() : ""}
              </div>
              <div style={{ color: "#654e7a", fontSize: 15, marginBottom: 8, whiteSpace: "pre-line" }}>
                {msg.message.length > 220
                  ? msg.message.slice(0, 220) + "…"
                  : msg.message}
              </div>
              <div style={{ color: "#8cade1", fontSize: 13, marginBottom: 4 }}>
                Delivery: {
                  msg.delivery === "immediate"
                    ? "Immediately"
                    : msg.delivery === "scheduled"
                      ? `Scheduled: ${msg.deliverAt || ""}`
                      : "Upon death/admin release"
                }
              </div>
              <div style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 2 }}>
                <button className="btn-main" style={{ fontSize: "0.98em" }} onClick={() => openForm(msg)}>Edit</button>
                <button className="btn-danger" style={{ fontSize: "0.98em" }} onClick={() => handleDelete(msg.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
      {/* --- Modal form --- */}
      {showForm && (
        <div className="pol-modal-bg">
          <form className="pol-form" onSubmit={handleSubmit}>
            <h3 style={{ marginBottom: 11, color: "#2a0516" }}>{editingId ? "Edit" : "New"} Legacy Message</h3>
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
              style={{ marginBottom: 10 }}
              required
              placeholder="Write your instructions, notes, or wishes here…"
            />
            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
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
                className="btn-cancel"
                style={{ fontSize: "0.96em", padding: "2px 8px" }}
                onClick={pasteVaultPassword}
              >
                Paste Vault Password
              </button>
              {copySuccess && <span style={{ color: "#8cade1", fontSize: 14 }}>{copySuccess}</span>}
            </div>
            <div style={{ marginBottom: 13 }}>
              <label>Delivery:</label>
              <select name="delivery" value={form.delivery} onChange={handleInput} style={{ marginLeft: 8 }}>
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
                  style={{ marginLeft: 10, marginTop: 8 }}
                  required
                />
              )}
            </div>
            <div style={{ display: "flex", gap: 9, marginTop: 8 }}>
              <button className="btn-main" type="submit" disabled={uploading} style={{ flex: 1 }}>
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
