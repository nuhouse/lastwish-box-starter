import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import CryptoJS from "crypto-js";

// Helper for blank password entry
function defaultForm(user) {
  return {
    uid: user?.uid || "",
    label: "",
    username: "",
    encrypted: "",
    created: null
  };
}

export default function PasswordVault({ user }) {
  const [passwords, setPasswords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm(user));
  const [editingId, setEditingId] = useState(null);
  const [masterPw, setMasterPw] = useState("");
  const [masterPwInput, setMasterPwInput] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const pwInput = useRef();

  // Fetch passwords for this user
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "passwordVault"),
      where("uid", "==", user.uid),
      orderBy("created", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setPasswords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  // UI: Enter master password (never stored)
  function unlockVault(e) {
    e.preventDefault();
    setMasterPw(masterPwInput);
    setIsUnlocked(true);
    setMasterPwInput("");
  }

  function lockVault() {
    setMasterPw("");
    setIsUnlocked(false);
    setPreview(null);
  }

  // Show form for new/edit password
  function openForm(entry = null) {
    setShowForm(true);
    if (entry) {
      // Decrypt for editing
      let password = "";
      try {
        const bytes = CryptoJS.AES.decrypt(entry.encrypted, masterPw);
        password = bytes.toString(CryptoJS.enc.Utf8);
      } catch (err) {
        password = "";
      }
      setForm({
        uid: user.uid,
        label: entry.label,
        username: entry.username,
        encrypted: entry.encrypted,
        password,
        created: entry.created
      });
      setEditingId(entry.id);
      if (pwInput.current) pwInput.current.value = password;
    } else {
      setForm(defaultForm(user));
      setEditingId(null);
      if (pwInput.current) pwInput.current.value = "";
    }
  }
  function closeForm() {
    setShowForm(false);
    setForm(defaultForm(user));
    setEditingId(null);
    if (pwInput.current) pwInput.current.value = "";
  }

  function handleInput(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  function handlePwInput(e) {
    setForm(f => ({ ...f, password: e.target.value }));
  }

  // Save password (encrypt before save)
  async function handleSubmit(e) {
    e.preventDefault();
    setUploading(true);
    try {
      if (!form.password || !masterPw) {
        alert("Master password and entry password required.");
        setUploading(false);
        return;
      }
      const encrypted = CryptoJS.AES.encrypt(form.password, masterPw).toString();
      const payload = {
        uid: user.uid,
        label: form.label,
        username: form.username,
        encrypted,
        created: editingId ? form.created : serverTimestamp(),
        lastUpdated: serverTimestamp(),
      };
      if (editingId) {
        await updateDoc(doc(db, "passwordVault", editingId), payload);
      } else {
        await addDoc(collection(db, "passwordVault"), payload);
      }
      closeForm();
    } catch (err) {
      alert("Failed to save: " + err.message);
    }
    setUploading(false);
  }

  // Delete password
  async function handleDelete(id) {
    if (!window.confirm("Delete this password entry?")) return;
    try {
      await deleteDoc(doc(db, "passwordVault", id));
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  }

  // Reveal password (on click)
  function decryptPassword(entry) {
    try {
      const bytes = CryptoJS.AES.decrypt(entry.encrypted, masterPw);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch {
      return "";
    }
  }

  // Filtered list/search
  const [search, setSearch] = useState("");
  const filtered = passwords.filter(
    p =>
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.username.toLowerCase().includes(search.toLowerCase())
  );

  // Main UI
  if (!isUnlocked) {
    return (
      <div className="pol-root" style={{ maxWidth: 400, margin: "auto" }}>
        <h2>Password Vault</h2>
        <div className="card" style={{ marginTop: 32 }}>
          <form onSubmit={unlockVault}>
            <div style={{ marginBottom: 10 }}>
              <label>Enter your master password to unlock vault:</label>
              <input
                type="password"
                value={masterPwInput}
                onChange={e => setMasterPwInput(e.target.value)}
                required
                style={{ marginTop: 8, marginBottom: 15 }}
              />
            </div>
            <button className="btn-main" type="submit" style={{ width: "100%" }}>
              Unlock Vault
            </button>
          </form>
        </div>
        <div style={{ marginTop: 26, color: "#657899", fontSize: 15 }}>
          <b>Note:</b> Only you know your master password. Lost it? The vault can’t be recovered, even by admins.
        </div>
      </div>
    );
  }

  return (
    <div className="pol-root">
      <h2>Password Vault</h2>
      <div style={{
        background: "#e8eaf6", color: "#2a0516", borderRadius: 9, padding: 14, marginBottom: 15, fontSize: 15, maxWidth: 490
      }}>
        <b>Security Notice:</b> Passwords are encrypted locally with your master password. <br />
        <b>Keep your master password safe!</b> If you forget it, your vault cannot be decrypted or recovered.
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 18 }}>
        <button className="btn-main" onClick={() => openForm()} >+ Add Password</button>
        <button className="btn-cancel" onClick={lockVault} >Lock Vault</button>
        <input
          type="text"
          placeholder="Search by label or username"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 180, maxWidth: 240, borderRadius: 7, border: "1.2px solid #bfa4c4", padding: 8, fontSize: "1em" }}
        />
      </div>
      <div className="pol-grid">
        {filtered.length === 0 ? (
          <div style={{ color: "#a697b8", padding: 30, textAlign: "center" }}>No passwords saved yet.</div>
        ) : (
          filtered.map(entry =>
            <div className="card" key={entry.id} style={{ minHeight: 120, position: "relative" }}>
              <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 3 }}>{entry.label}</div>
              <div style={{ color: "#657899", fontSize: 15 }}>{entry.username}</div>
              <div style={{ color: "#b9aac3", fontSize: 13, marginBottom: 4 }}>
                {entry.created?.toDate ? entry.created.toDate().toLocaleString() : ""}
              </div>
              <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 6 }}>
                <span style={{ color: "#980000", fontWeight: 500 }}>
                  {preview === entry.id
                    ? decryptPassword(entry)
                    : "••••••••"}
                </span>
                <button
                  className="btn-main"
                  style={{ padding: "2px 14px", fontSize: "0.98em" }}
                  onClick={() => setPreview(preview === entry.id ? null : entry.id)}
                  tabIndex={-1}
                >
                  {preview === entry.id ? "Hide" : "Show"}
                </button>
                <button
                  className="btn-cancel"
                  style={{ padding: "2px 14px", fontSize: "0.98em" }}
                  onClick={() => openForm(entry)}
                  tabIndex={-1}
                >Edit</button>
                <button
                  className="btn-danger"
                  style={{ padding: "2px 14px", fontSize: "0.98em" }}
                  onClick={() => handleDelete(entry.id)}
                  tabIndex={-1}
                >Delete</button>
              </div>
            </div>
          )
        )}
      </div>
      {/* Modal for Add/Edit */}
      {showForm && (
        <div className="pol-modal-bg">
          <form className="pol-form" onSubmit={handleSubmit}>
            <h3 style={{ marginBottom: 13, color: "#2a0516" }}>
              {editingId ? "Edit Password" : "Add New Password"}
            </h3>
            <label>Label</label>
            <input
              type="text"
              name="label"
              value={form.label}
              onChange={handleInput}
              placeholder="E.g. Gmail Main, Bank, Netflix"
              required
            />
            <label>Username/Email</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleInput}
              placeholder="Login email or username"
              required
            />
            <label>Password</label>
            <input
              type="password"
              name="password"
              ref={pwInput}
              value={form.password || ""}
              onChange={handlePwInput}
              required
            />
            <div style={{ display: "flex", gap: 9, marginTop: 11 }}>
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
