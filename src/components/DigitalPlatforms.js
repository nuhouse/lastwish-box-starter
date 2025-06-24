import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy
} from "firebase/firestore";

export default function DigitalPlatforms({ user }) {
  const [platforms, setPlatforms] = useState([]);
  const [vaultLabels, setVaultLabels] = useState([]);
  const [form, setForm] = useState({
    name: "",
    url: "",
    username: "",
    notes: "",
    passwordLabel: ""
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  // Load platforms for this user
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "digitalPlatforms"),
      where("uid", "==", user.uid),
      orderBy("created", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setPlatforms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  // Load password labels from vault
  useEffect(() => {
    if (!user) return;
    (async () => {
      const docRef = doc(db, "passwordVault", user.uid);
      const vaultSnap = await db.getDoc(docRef);
      if (!vaultSnap.exists()) {
        setVaultLabels([]);
      } else {
        const entries = vaultSnap.data().entries || [];
        setVaultLabels(entries.map(e => e.label));
      }
    })();
  }, [user]);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      url: p.url,
      username: p.username,
      notes: p.notes,
      passwordLabel: p.passwordLabel || ""
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name || !form.username) {
      setError("Platform and username are required.");
      return;
    }
    try {
      const data = {
        uid: user.uid,
        name: form.name,
        url: form.url,
        username: form.username,
        notes: form.notes,
        passwordLabel: form.passwordLabel,
        created: editingId ? undefined : new Date(),
        updated: new Date()
      };
      if (editingId) {
        await updateDoc(doc(db, "digitalPlatforms", editingId), data);
      } else {
        await addDoc(collection(db, "digitalPlatforms"), data);
      }
      setForm({
        name: "",
        url: "",
        username: "",
        notes: "",
        passwordLabel: ""
      });
      setEditingId(null);
    } catch (e) {
      setError("Failed to save: " + e.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this platform?")) return;
    await deleteDoc(doc(db, "digitalPlatforms", id));
  }

  return (
    <div className="card" style={{ maxWidth: 640, margin: "40px auto" }}>
      <h2>Digital Platforms</h2>
      <p>
        Save details for your key online platforms, logins, and instructions for your legacy. 
        <b> No passwords are stored here!</b> 
        Only the password label (reference) from your vault can be linked.
      </p>
      <form onSubmit={handleSubmit} style={{ marginBottom: 18 }}>
        <input
          name="name"
          type="text"
          className="input"
          placeholder="Platform (e.g. Facebook)"
          value={form.name}
          onChange={handleChange}
          required
        />
        <input
          name="url"
          type="text"
          className="input"
          placeholder="Login URL (optional)"
          value={form.url}
          onChange={handleChange}
        />
        <input
          name="username"
          type="text"
          className="input"
          placeholder="Username / Email"
          value={form.username}
          onChange={handleChange}
          required
        />
        <select
          name="passwordLabel"
          className="input"
          value={form.passwordLabel}
          onChange={handleChange}
        >
          <option value="">(Link to Password...)</option>
          {vaultLabels.map(label => (
            <option key={label} value={label}>{label}</option>
          ))}
        </select>
        <textarea
          name="notes"
          className="input"
          placeholder="Special instructions or notes (optional)"
          rows={2}
          value={form.notes}
          onChange={handleChange}
        />
        <button className="btn-main" type="submit">
          {editingId ? "Update" : "Add"} Platform
        </button>
        {editingId && (
          <button className="btn-cancel" style={{ marginLeft: 12 }} type="button" onClick={() => {
            setEditingId(null); setForm({
              name: "",
              url: "",
              username: "",
              notes: "",
              passwordLabel: ""
            });
          }}>Cancel</button>
        )}
      </form>
      {error && <div style={{ color: "#980000", marginBottom: 12 }}>{error}</div>}

      <div>
        {platforms.length === 0 ? (
          <div style={{ color: "#8cade1", marginTop: 16 }}>No platforms added yet.</div>
        ) : (
          <table style={{ width: "100%" }}>
            <thead>
              <tr style={{ color: "#2a0516" }}>
                <th style={{ textAlign: "left" }}>Platform</th>
                <th style={{ textAlign: "left" }}>Username</th>
                <th style={{ textAlign: "left" }}>Password Label</th>
                <th style={{ textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((p, i) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.username}</td>
                  <td>{p.passwordLabel ? <span style={{ color: "#657899", fontWeight: 500 }}>{p.passwordLabel}</span> : <span style={{ color: "#ccc" }}>None</span>}</td>
                  <td>
                    <button className="btn-main" style={{ fontSize: "0.98em", marginRight: 7 }} onClick={() => handleEdit(p)}>Edit</button>
                    <button className="btn-danger" style={{ fontSize: "0.98em" }} onClick={() => handleDelete(p.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
