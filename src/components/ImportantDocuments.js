import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import {
  collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "firebase/storage";

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
  const [fileUrl, setFileUrl] = useState("");
  const [search, setSearch] = useState("");
  const fileInput = useRef();

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

  async function handleDelete(id, fileUrl) {
    if (!window.confirm("Delete this document?")) return;
    try {
      if (fileUrl) {
        const segments = fileUrl.split("/");
        const name = decodeURIComponent(segments[segments.length - 1].split("?")[0]);
        await deleteObject(ref(storage, `documents/${user.uid}/${name}`)).catch(() => {});
      }
      await deleteDoc(doc(db, "documents", id));
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  }

  function categoryIcon(cat) {
    const found = categories.find(c => c.label === cat);
    return found ? found.icon : "📁";
  }

  function FilePreview({ fileUrl, fileType }) {
    if (!fileUrl) return null;
    if (["jpg", "jpeg", "png", "gif", "bmp"].includes(fileType)) {
      return <img src={fileUrl} alt="preview" className="doc-preview-img" />;
    }
    if (fileType === "pdf") {
      return (
        <iframe src={fileUrl} className="doc-preview-pdf" title="PDF preview"></iframe>
      );
    }
    // Fallback: download link
    return <a href={fileUrl} download target="_blank" rel="noopener noreferrer" className="btn-main">Download File</a>;
  }

  const filteredDocs = docs.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="docs-root">
      <h2>Important Documents</h2>
      <div className="docs-intro">
        Securely upload and manage essential personal, legal, or financial documents. Only you (and trusted contacts you assign) can access these.
      </div>
      <div className="docs-actions-row">
        <button className="btn-main" onClick={() => openForm()}>+ Upload New Document</button>
        <input
          type="text"
          className="docs-search"
          placeholder="Search by name or category"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="docs-grid">
        {filteredDocs.length === 0 ? (
          <div className="docs-empty">No documents uploaded yet.</div>
        ) : (
          filteredDocs.map(doc =>
            <div className="docs-card" key={doc.id} onClick={() => setPreview(doc)}>
              <div className="docs-icon">{categoryIcon(doc.category)}</div>
              <div className="docs-title">{doc.name}</div>
              <div className="docs-category">{doc.category}</div>
              <div className="docs-date">
                {doc.dateAdded?.toDate ? doc.dateAdded.toDate().toLocaleString() : ""}
              </div>
              <div className="docs-card-actions">
                <button className="btn-main" onClick={e => { e.stopPropagation(); setPreview(doc); }}>
                  View
                </button>
                <button className="btn-cancel" onClick={e => { e.stopPropagation(); openForm(doc); }}>
                  Edit
                </button>
                <button className="btn-danger" onClick={e => { e.stopPropagation(); handleDelete(doc.id, doc.fileUrl); }}>
                  Delete
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* Modal for add/edit */}
      {showForm && (
        <div className="docs-modal-bg">
          <form className="docs-form" onSubmit={handleSubmit}>
            <h3>{editingId ? "Edit Document" : "Upload New Document"}</h3>
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
            />
            <label>Upload File {editingId && "(leave blank to keep current file)"}</label>
            <input
              type="file"
              ref={fileInput}
              onChange={handleFile}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              required={!editingId}
            />
            {(fileUrl || form.fileUrl) && (
              <div style={{ marginBottom: 10 }}>
                <FilePreview fileUrl={fileUrl || form.fileUrl} fileType={form.fileType || (form.file && form.file.name.split('.').pop().toLowerCase())} />
              </div>
            )}
            <div className="docs-form-actions">
              <button className="btn-main" type="submit" disabled={uploading}>
                {editingId ? "Update" : "Add"}
              </button>
              <button type="button" className="btn-cancel" onClick={closeForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="docs-modal-bg" onClick={() => setPreview(null)}>
          <div className="docs-modal" onClick={e => e.stopPropagation()}>
            <button className="docs-close" onClick={() => setPreview(null)}>&times;</button>
            <h3>{preview.name}</h3>
            <div className="docs-meta">{preview.category} • {preview.dateAdded?.toDate ? preview.dateAdded.toDate().toLocaleDateString() : ""}</div>
            <div className="docs-desc">{preview.description}</div>
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
