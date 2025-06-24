import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove
} from "firebase/firestore";

// -- Crypto helpers: browser built-in SubtleCrypto (no libraries needed!)
async function digestMsg(msg) {
  const enc = new TextEncoder().encode(msg);
  const hash = await window.crypto.subtle.digest("SHA-256", enc);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}
async function getKey(pw) {
  return window.crypto.subtle.importKey(
    "raw", new TextEncoder().encode(pw), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]
  );
}
async function encrypt(text, pw) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey(pw);
  const enc = new TextEncoder().encode(text);
  const ct = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc);
  return btoa(String.fromCharCode(...iv) + String.fromCharCode(...new Uint8Array(ct)));
}
async function decrypt(b64, pw) {
  const bin = atob(b64);
  const iv = Uint8Array.from(bin.slice(0, 12), c => c.charCodeAt(0));
  const ct = Uint8Array.from(bin.slice(12), c => c.charCodeAt(0));
  const key = await getKey(pw);
  const dec = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(dec);
}

export default function PasswordVault({ user }) {
  const [state, setState] = useState("loading"); // loading, setup, unlock, unlocked
  const [masterPw, setMasterPw] = useState("");
  const [masterPw2, setMasterPw2] = useState("");
  const [inputPw, setInputPw] = useState("");
  const [vault, setVault] = useState([]);
  const [testVal, setTestVal] = useState("");
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showPw, setShowPw] = useState({});
  const [copiedIdx, setCopiedIdx] = useState(null);

  const pwInputRef = useRef();

  // Load vault on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      const vaultRef = doc(db, "passwordVault", user.uid);
      const snap = await getDoc(vaultRef);
      if (!snap.exists()) {
        setState("setup");
        setTestVal(""); // nothing in vault yet
      } else {
        const data = snap.data();
        setVault(data.entries || []);
        setTestVal(data.test || "");
        setState("unlock");
      }
    })();
  }, [user]);

  // Set master password (first time setup)
  async function handleSetMasterPw(e) {
    e.preventDefault();
    setError("");
    if (!masterPw || masterPw.length < 8) return setError("Password must be at least 8 characters.");
    if (masterPw !== masterPw2) return setError("Passwords do not match.");
    try {
      const testEncrypted = await encrypt("vault_test", masterPw);
      await setDoc(doc(db, "passwordVault", user.uid), {
        test: testEncrypted,
        entries: []
      });
      setTestVal(testEncrypted);
      setVault([]);
      setMasterPw2("");
      setState("unlocked");
    } catch (e) {
      setError("Error setting master password: " + e.message);
    }
  }

  // Unlock vault
  async function handleUnlock(e) {
    e.preventDefault();
    setError("");
    try {
      const result = await decrypt(testVal, inputPw);
      if (result !== "vault_test") throw new Error("Wrong password");
      setMasterPw(inputPw);
      setState("unlocked");
      setInputPw("");
    } catch (e) {
      setError("Incorrect master password.");
      setInputPw("");
      if (pwInputRef.current) pwInputRef.current.focus();
    }
  }

  // Add new password
  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    if (!newLabel || !newValue) return setError("Fill in all fields.");
    try {
      const encrypted = await encrypt(newValue, masterPw);
      const newEntry = { label: newLabel, value: encrypted, time: Date.now() };
      await updateDoc(doc(db, "passwordVault", user.uid), {
        entries: arrayUnion(newEntry)
      });
      setVault(vault => [...vault, newEntry]);
      setNewLabel(""); setNewValue(""); setShowAdd(false);
    } catch (e) {
      setError("Error saving: " + e.message);
    }
  }

  // Reveal or hide password
  async function handleShowPw(idx) {
    if (showPw[idx]) {
      setShowPw(pw => ({ ...pw, [idx]: false }));
    } else {
      try {
        const val = await decrypt(vault[idx].value, masterPw);
        setShowPw(pw => ({ ...pw, [idx]: val }));
      } catch (e) {
        setShowPw(pw => ({ ...pw, [idx]: "Error" }));
      }
    }
  }

  // Copy password to clipboard
  async function handleCopy(idx) {
    if (!showPw[idx]) await handleShowPw(idx);
    try {
      await navigator.clipboard.writeText(showPw[idx] || "");
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1100);
    } catch (e) {}
  }

  // Delete password entry
  async function handleDelete(idx) {
    const entry = vault[idx];
    if (!window.confirm("Delete this password?")) return;
    try {
      await updateDoc(doc(db, "passwordVault", user.uid), {
        entries: arrayRemove(entry)
      });
      setVault(vault => vault.filter((_, i) => i !== idx));
      setShowPw(pw => {
        const cpy = { ...pw }; delete cpy[idx]; return cpy;
      });
    } catch (e) {
      setError("Error deleting entry: " + e.message);
    }
  }

  // Vault reset (danger!)
  async function handleResetVault() {
    if (!window.confirm("This will delete all stored passwords and cannot be undone. Continue?")) return;
    try {
      await setDoc(doc(db, "passwordVault", user.uid), {
        test: "",
        entries: []
      });
      setVault([]);
      setTestVal("");
      setMasterPw("");
      setMasterPw2("");
      setState("setup");
    } catch (e) {
      setError("Error resetting vault: " + e.message);
    }
  }

  // --- UI ---

  if (state === "loading") return <div style={{ padding: 36 }}>Loading vault...</div>;

  // SETUP: First time
  if (state === "setup") return (
    <div className="card" style={{ maxWidth: 410, margin: "40px auto" }}>
      <h2>Password Vault</h2>
      <p>Set a strong master password (minimum 8 characters). <b>Do not lose this password!</b> You will need it every time you access your vault.</p>
      <form onSubmit={handleSetMasterPw}>
        <input
          type="password"
          className="input"
          placeholder="Master Password"
          value={masterPw}
          onChange={e => setMasterPw(e.target.value)}
          required
        />
        <input
          type="password"
          className="input"
          placeholder="Confirm Master Password"
          value={masterPw2}
          onChange={e => setMasterPw2(e.target.value)}
          required
        />
        <button className="btn-main" type="submit" style={{ width: "100%", marginTop: 16 }}>Set Password</button>
      </form>
      {error && <div style={{ color: "#980000", marginTop: 12 }}>{error}</div>}
    </div>
  );

  // UNLOCK: User must enter master password
  if (state === "unlock") return (
    <div className="card" style={{ maxWidth: 410, margin: "40px auto" }}>
      <h2>Password Vault</h2>
      <p>Enter your master password to unlock your vault.</p>
      <form onSubmit={handleUnlock}>
        <input
          type="password"
          className="input"
          placeholder="Master Password"
          value={inputPw}
          onChange={e => setInputPw(e.target.value)}
          ref={pwInputRef}
          autoFocus
          required
        />
        <button className="btn-main" type="submit" style={{ width: "100%", marginTop: 16 }}>Unlock</button>
      </form>
      <button className="btn-cancel" style={{ width: "100%", marginTop: 13 }} onClick={handleResetVault}>Reset Vault</button>
      <div style={{ color: "#980000", marginTop: 10 }}>{error}</div>
    </div>
  );

  // UNLOCKED: Show vault entries
  return (
    <div className="card" style={{ maxWidth: 530, margin: "40px auto" }}>
      <h2>Password Vault</h2>
      <div style={{ marginBottom: 18, color: "#657899" }}>
        Your vault is securely encrypted. <b>Only you</b> know your master password. <br />
        <button className="btn-cancel" onClick={handleResetVault} style={{ float: "right", fontSize: "0.96em" }}>Reset Vault</button>
      </div>
      {vault.length === 0 && <div style={{ marginBottom: 22, color: "#8cade1" }}>No passwords saved yet.</div>}
      <table style={{ width: "100%", marginBottom: 23 }}>
        <thead>
          <tr style={{ color: "#2a0516" }}>
            <th style={{ textAlign: "left" }}>Label</th>
            <th style={{ textAlign: "center" }}>Password</th>
            <th style={{ textAlign: "center" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {vault.map((entry, idx) => (
            <tr key={idx}>
              <td style={{ fontWeight: 500 }}>{entry.label}</td>
              <td style={{ textAlign: "center" }}>
                <button
                  className="btn-main"
                  style={{ minWidth: 54, fontSize: "0.97em", padding: "5px 12px" }}
                  onClick={() => handleShowPw(idx)}
                  type="button"
                >
                  {showPw[idx] ? (
                    <span style={{ letterSpacing: 1 }}>
                      {showPw[idx]}
                    </span>
                  ) : "Show"}
                </button>
              </td>
              <td style={{ textAlign: "center" }}>
                <button
                  className="btn-main"
                  style={{ marginRight: 6, fontSize: "0.93em", padding: "5px 11px" }}
                  onClick={() => handleCopy(idx)}
                  type="button"
                  disabled={!showPw[idx]}
                >
                  {copiedIdx === idx ? "Copied!" : "Copy"}
                </button>
                <button
                  className="btn-danger"
                  style={{ fontSize: "0.93em", padding: "5px 11px" }}
                  onClick={() => handleDelete(idx)}
                  type="button"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Add new password form */}
      {showAdd ? (
        <form onSubmit={handleAdd} style={{ marginBottom: 17, marginTop: 8 }}>
          <input
            type="text"
            className="input"
            placeholder="Label (e.g. Facebook)"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            required
          />
          <input
            type="text"
            className="input"
            placeholder="Password"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            required
          />
          <button className="btn-main" type="submit" style={{ marginTop: 3 }}>Add</button>
          <button className="btn-cancel" type="button" style={{ marginLeft: 11 }} onClick={() => setShowAdd(false)}>Cancel</button>
        </form>
      ) : (
        <button className="btn-main" style={{ marginBottom: 11 }} onClick={() => setShowAdd(true)}>+ Add New Password</button>
      )}
      {error && <div style={{ color: "#980000", marginTop: 12 }}>{error}</div>}
    </div>
  );
}
