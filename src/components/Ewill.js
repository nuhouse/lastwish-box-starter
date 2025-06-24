import React, { useState, useEffect, useRef } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { db, storage } from "../firebase";
import {
  doc, getDoc, setDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "firebase/storage";

export default function Ewill({ user }) {
  const [content, setContent] = useState("");
  const [lastSaved, setLastSaved] = useState(null);
  const [saving, setSaving] = useState(false);

  // Attachments
  const [files, setFiles] = useState([]);
  const [fileUploading, setFileUploading] = useState(false);
  const fileInput = useRef();

  // Trusted contacts
  const [trusted, setTrusted] = useState([]);
  const [newTrusted, setNewTrusted] = useState("");

  // Load E-will doc and files
  useEffect(() => {
    if (!user) return;
    (async () => {
      const docRef = doc(db, "ewills", user.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data();
        setContent(d.content || "");
        setLastSaved(d.updated?.toDate ? d.updated.toDate() : null);
        setFiles(d.files || []);
        setTrusted(d.trusted || []);
      }
    })();
  }, [user]);

  // Save/Update will
  async function handleSave() {
    setSaving(true);
    const docRef = doc(db, "ewills", user.uid);
    await setDoc(docRef, {
      content,
      updated: serverTimestamp(),
      files,
      trusted,
      uid: user.uid,
    }, { merge: true });
    setLastSaved(new Date());
    setSaving(false);
  }

  // Upload new attachment
  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileUploading(true);
    const fileRef = ref(storage, `ewill/${user.uid}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);
    await new Promise((res, rej) => uploadTask.on("state_changed", null, rej, res));
    const url = await getDownloadURL(fileRef);
    const newFile = { name: file.name, url, time: Date.now() };
    const docRef = doc(db, "ewills", user.uid);
    await updateDoc(docRef, {
      files: arrayUnion(newFile)
    });
    setFiles(f => [...f, newFile]);
    setFileUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  // Delete attachment
  async function handleDeleteFile(f) {
    if (!window.confirm("Delete this file?")) return;
    await deleteObject(ref(storage, `ewill/${user.uid}/${f.name}`)).catch(() => {});
    const docRef = doc(db, "ewills", user.uid);
    await updateDoc(docRef, { files: arrayRemove(f) });
    setFiles(files.filter(file => file.url !== f.url));
  }

  // Trusted contacts
  function handleAddTrusted() {
    if (!newTrusted || trusted.includes(newTrusted)) return;
    setTrusted([...trusted, newTrusted]);
    setNewTrusted("");
  }
  function handleRemoveTrusted(email) {
    setTrusted(trusted.filter(t => t !== email));
  }

  // Preview modal
  const [preview, setPreview] = useState(false);

  // Print
  function handlePrint() {
    const win = window.open();
    win.document.write(`
      <html>
      <head>
      <title>My E-will</title>
      <style>body { font-family: Arial, sans-serif; padding: 30px; max-width: 720px; margin: 0 auto; }</style>
      </head>
      <body>
      <h2 style="color:#2a0516;">LastWish Box - My E-will</h2>
      <div>${content}</div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="card" style={{ maxWidth: 760, margin: "0 auto", marginTop: 30 }}>
      <h2>E-will (Secure Electronic Will)</h2>
      <div style={{ color: "#7a6888", marginBottom: 13 }}>
        Write your legally significant final statement of wishes. You can update and save as often as you wish. Your E-will is stored securely and will only be shared with your trusted contacts or executors.
      </div>
      <div className="ewill-quill" style={{ marginBottom: 10 }}>
        <ReactQuill
          theme="snow"
          value={content}
          onChange={setContent}
          placeholder="Start writing your will here... (you can use formatting and bullet points)"
        />
      </div>
      <div style={{ display: "flex", gap: 11, margin: "12px 0" }}>
        <button className="btn-main" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save E-will"}
        </button>
        <button className="btn-main" style={{ background: "#8cade1" }} onClick={() => setPreview(true)}>
          Preview
        </button>
        <button className="btn-main" style={{ background: "#f15822" }} onClick={handlePrint}>
          Print/Download
        </button>
      </div>
      {lastSaved && (
        <div style={{ color: "#645155", fontSize: 13, marginBottom: 7 }}>
          Last updated: {lastSaved.toLocaleString()}
        </div>
      )}
      {/* --- Attachments --- */}
      <div style={{ margin: "20px 0 13px 0", fontWeight: 500 }}>Supporting Documents</div>
      <input
        type="file"
        ref={fileInput}
        style={{ marginBottom: 11 }}
        onChange={handleFileUpload}
        disabled={fileUploading}
      />
      {fileUploading && <div style={{ color: "#8cade1", fontSize: 14 }}>Uploading...</div>}
      <ul>
        {files.map(f => (
          <li key={f.url} style={{ marginBottom: 3 }}>
            <a href={f.url} target="_blank" rel="noopener noreferrer">{f.name}</a>
            <button
              className="btn-danger"
              style={{ marginLeft: 11 }}
              onClick={() => handleDeleteFile(f)}
            >Delete</button>
          </li>
        ))}
      </ul>
      {/* --- Trusted Contacts --- */}
      <div style={{ margin: "22px 0 7px 0", fontWeight: 500 }}>Trusted Contacts / Executors</div>
      <div style={{ display: "flex", gap: 7, marginBottom: 7 }}>
        <input
          type="email"
          placeholder="Add trusted contact email"
          value={newTrusted}
          onChange={e => setNewTrusted(e.target.value)}
        />
        <button className="btn-main" onClick={handleAddTrusted} type="button">Add</button>
      </div>
      <div>
        {trusted.map(email => (
          <span key={email} style={{
            display: "inline-block", background: "#f15822", color: "#fff",
            borderRadius: 8, padding: "4px 10px", margin: "0 7px 7px 0"
          }}>
            {email}
            <button
              onClick={() => handleRemoveTrusted(email)}
              className="btn-cancel"
              style={{
                marginLeft: 7, background: "#980000", color: "#fff", padding: "0 7px", borderRadius: 4,
                fontSize: 12, fontWeight: 700, border: "none"
              }}
              type="button"
            >x</button>
          </span>
        ))}
      </div>
      {/* --- Preview Modal --- */}
      {preview && (
        <div style={{
          position: "fixed", left: 0, top: 0, right: 0, bottom: 0,
          background: "#2a0516bb", zIndex: 2202, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "#fff", borderRadius: 19, boxShadow: "0 12px 38px 0 #2a051629",
            padding: "30px 33px 22px 33px", maxWidth: 600, width: "96vw", maxHeight: "90vh", overflowY: "auto", position: "relative"
          }}>
            <button
              onClick={() => setPreview(false)}
              style={{
                position: "absolute", top: 11, right: 15, fontSize: "2.2rem", background: "none",
                border: "none", color: "#c39", cursor: "pointer", zIndex: 10
              }}
            >&times;</button>
            <h3 style={{ marginBottom: 7, color: "#2a0516" }}>Your E-will (Preview)</h3>
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        </div>
      )}
      {/* --- Legal Disclaimer --- */}
      <div style={{
        marginTop: 36, fontSize: 14, color: "#657899", background: "#fcfafd",
        padding: 11, borderRadius: 7, border: "1.5px solid #e2e2e2"
      }}>
        <b>Disclaimer:</b> Your E-will is stored securely, but may not replace a signed and witnessed will required by law in your country. Please consult your solicitor for legal validity.
      </div>
    </div>
  );
}
