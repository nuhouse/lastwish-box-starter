import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import {
  collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "firebase/storage";

// Categories & icons (emoji for simplicity, can be replaced with SVG/icons)
const categories = [
  { label: "Passport", icon: "🛂" },
  { label: "ID", icon: "🆔" },
  { label: "Insurance", icon: "🛡️" },
  { label: "Property", icon: "🏠" },
  { label: "Financial", icon: "💳" },
  { label: "Medical", icon: "💊" },
  { label: "Other", icon: "📁" },
];

function defaultForm(user) {
  return {
    uid: user?.uid || "",
    name: "",
    category: "Other",
    description: "",
    file: null,
    fileUrl: "",
    fileType: "",
    dateAdded: null,
  };
}

export default function ImportantDocuments({ user }) {
  const [docs, setDocs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm(user));
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [fileUrl, setFileUrl] = useState(""); // For preview
  const [search, setSearch] = useState("");
  const fileInput = useRef();

  // Fetch documents for this user
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "documents"),
      where("uid", "==", user.uid),
      orderBy("dateAdded", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  // File preview for upload
  useEffect(() => {
    if (!form.file) return;
    const url = URL.createObjectURL(form.file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.file]);

  function openForm(doc = null) {
    setShowForm(true);
    if (doc) {
      setForm({
        uid: user.uid,
        name: doc.name,
        category: doc.category,
        description: doc.description || "",
        file: null,
        fileUrl: doc.fileUrl,
        fileType: doc.fileType,
        dateAdded: doc.dateAdded,
      });
      setEditingId(doc.id);
      setFileUrl(doc.fileUrl || "");
    } else {
      setForm(defaultForm(user));
      setEditingId(null);
      setFileUrl("");
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  function closeForm() {
    setShowForm(false);
    setForm(defaultForm(user));
    setEditingId(null);
    setFileUrl("");
    if (fileInput.current) fileInput.current.value = "";
  }

  function handleInput(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }
  function handleFile(e) {
    setForm(f => ({ ...f, file: e.target.files[0] }));
  }

  // Upload or update document
  async function handleSubmit(e) {
    e.preventDefault();
    setUploading(true);
    try {
      let fileUrl = form.fileUrl;
      let fileType = form.fileType;
      if (form.file) {
        const ext = form.file.name.split(".").pop().toLowerCase();
        fileType = ext;
        const filename = `${user.uid}_${Date.now()}_${form.file.name}`;
        const storageRef = ref(storage, `documents/${user.uid}/${filename}`);
        const uploadTask = uploadBytesResumable(storageRef, form.file);
        await new Promise((res, rej) => uploadTask.on("state_changed", null, rej, res));
        fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
      }
      const payload = {
        uid: user.uid,
        name: form.name,
        category: form.category,
        description: form.description,
        fileUrl,
        fileType,
        dateAdded: editingId ? form.dateAdded : serverTimestamp(),
        lastUpdated: serverTimestamp(),
      };
      if (editingId) {
        await updateDoc(doc(db, "documents", editingId), payload);
      } else {
        await addDoc(collection(db, "documents"), payload);
      }
      closeForm();
    } catch (err) {
      alert("Failed to save: " + err.message);
    }
    setUploading(false);
  }

  // Delete document
  async function handleDelete(id, fileUrl) {
    if (!window.confirm("Delete this document?")) return;
    try {
      if (fileUrl) {
        // Remove from storage
        const segments = fileUrl.split("/");
        const name = decodeURIComponent(segments[segments.length - 1].split("?")[0]);
        await deleteObject(ref(storage, `documents/${user.uid}/${name}`)).catch(() => {});
      }
      await deleteDoc(doc(db, "documents", id));
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  }

  // Category icon
  function categoryIcon(cat) {
    const found = categories.find(c => c.label === cat);
    return found ? found.icon : "📁";
  }

  // File preview logic (show only images, pdfs inline)
  function FilePreview({ fileUrl, fileType }) {
    if (!fileUrl) return null;
    if (["jpg", "jpeg", "png", "gif", "bmp"].includes(fileType)) {
      return <img src={fileUrl} alt="preview" style={{ maxWidth: 240, maxHeight: 320, borderRadius: 10, margin: "10px 0" }} />;
    }
    if (fileType === "pdf") {
      return (
        <iframe src={fileUrl} style={{ width: 240, height: 320, border: "none", borderRadius: 10, margin: "10px 0" }} title="PDF preview"></iframe>
      );
    }
    // Fallback: download link
    return <a href={fileUrl} download target="_blank" rel="noopener noreferrer" className="btn-main">Download File</a>;
  }

  // Search/filter logic
  const filteredDocs = docs.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.category.toLowerCase().includes(search.toLowerCase())
  );

  // Main UI
  return (
    <div className="pol-root">
      <h2>Important Documents</h2>
      <div style={{ color: "#7a6888", maxWidth: 620, marginBottom: 16 }}>
        Securely upload and manage essential personal, legal, or financial documents. Only you (and trusted contacts you assign) can access these.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 13, alignItems: "center", marginBottom: 18 }}>
        <button className="btn-main" onClick={() => openForm()}>+ Upload New Document</button>
        <input
          type="text"
          placeholder="Search by name or category"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 180, maxWidth: 220, borderRadius: 7, border: "1.2px solid #bfa4c4", padding: 8, fontSize: "1em" }}
        />
      </div>
      <div className="pol-grid">
        {filteredDocs.length === 0 ? (
          <div style={{ color: "#a697b8", padding: 30, textAlign: "center" }}>No documents uploaded yet.</div>
        ) : (
          filteredDocs.map(doc =>
            <div className="card" key={doc.id} onClick={() => setPreview(doc)} style={{ cursor: "pointer", minHeight: 150 }}>
              <div style={{ fontSize: "2.2em", marginBottom: 4 }}>{categoryIcon(doc.category)}</div>
              <div style={{ fontWeight: 600, fontSize: 17 }}>{doc.name}</div>
              <div style={{ color: "#657899", fontSize: 15 }}>{doc.category}</div>
              <div style={{ color: "#b9aac3", fontSize: 13 }}>
                {doc.dateAdded?.toDate ? doc.dateAdded.toDate().toLocaleString() : ""}
              </div>
              <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
                <button
                  className="btn-main"
                  style={{ fontSize: "0.97em", padding: "6px 13px" }}
                  onClick={e => { e.stopPropagation(); setPreview(doc); }}
                >
                  View
                </button>
                <button
                  className="btn-cancel"
                  style={{ fontSize: "0.97em", padding: "6px 13px" }}
                  onClick={e => { e.stopPropagation(); openForm(doc); }}
                >
                  Edit
                </button>
                <button
                  className="btn-danger"
                  style={{ fontSize: "0.97em", padding: "6px 13px" }}
                  onClick={e => { e.stopPropagation(); handleDelete(doc.id, doc.fileUrl); }}
                >
                  Delete
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* Modal for add/edit */}
      {showForm && (
        <div className="pol-modal-bg">
          <form className="pol-form" onSubmit={handleSubmit}>
            <h3 style={{ marginBottom: 13, color: "#2a0516" }}>
              {editingId ? "Edit Document" : "Upload New Document"}
            </h3>
            <label>Document Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleInput}
              placeholder="e.g. Birth Certificate"
              required
            />
            <label>Category</label>
            <select name="category" value={form.category} onChange={handleInput}>
              {categories.map(c => (
                <option key={c.label} value={c.label}>{c.icon} {c.label}</option>
              ))}
            </select>
            <label>Description <span style={{ color: "#bbb" }}>(optional)</span></label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleInput}
              placeholder="Describe this document..."
              rows={2}
              style={{ marginBottom: 11 }}
            />
            <label>Upload File {editingId && "(leave blank to keep current file)"}</label>
            <input
              type="file"
              ref={fileInput}
              onChange={handleFile}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              required={!editingId}
              style={{ marginBottom: 9 }}
            />
            {/* Show preview */}
            {(fileUrl || form.fileUrl) && (
              <div style={{ marginBottom: 10 }}>
                <FilePreview fileUrl={fileUrl || form.fileUrl} fileType={form.fileType || (form.file && form.file.name.split('.').pop().toLowerCase())} />
              </div>
            )}
            <div style={{ display: "flex", gap: 9, marginTop: 9 }}>
              <button className="btn-main" type="submit" disabled={uploading} style={{ flex: 1 }}>
                {editingId ? "Update" : "Add"}
              </button>
              <button type="button" className="btn-cancel" onClick={closeForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="pol-modal-bg" onClick={() => setPreview(null)}>
          <div className="pol-modal" onClick={e => e.stopPropagation()}>
            <button className="pol-close" onClick={() => setPreview(null)}>&times;</button>
            <h3 style={{ marginBottom: 9, color: "#2a0516" }}>{preview.name}</h3>
            <div style={{ color: "#7c6e8a", marginBottom: 8, fontSize: 15 }}>{preview.category} • {preview.dateAdded?.toDate ? preview.dateAdded.toDate().toLocaleDateString() : ""}</div>
            <div style={{ marginBottom: 12, fontWeight: 500 }}>{preview.description}</div>
            <FilePreview fileUrl={preview.fileUrl} fileType={preview.fileType} />
            <div style={{ marginTop: 12 }}>
              <a href={preview.fileUrl} download target="_blank" rel="noopener noreferrer" className="btn-main">Download</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
