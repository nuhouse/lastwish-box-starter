import React, { useEffect, useState, useRef } from "react";
import { db, storage } from "../firebase";
import {
  collection, addDoc, query, where, orderBy,
  onSnapshot, serverTimestamp, deleteDoc, doc, updateDoc
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "firebase/storage";

function getFileType(file) {
  if (!file) return null;
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

export default function PersonalMessages({ user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const fileInput = useRef();

  // Load messages
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "personalMessages"),
      where("uid", "==", user.uid),
      orderBy("created", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  // Upload new message
  const handleUpload = async e => {
    e.preventDefault();
    setUploading(true);
    let fileUrl = null, fileType = null, fileName = null;
    try {
      if (file) {
        const type = getFileType(file);
        fileType = type;
        fileName = `${user.uid}_${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `personalMessages/${user.uid}/${fileName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        await new Promise((resolve, reject) => {
          uploadTask.on("state_changed", null, reject, resolve);
        });
        fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
      }
      await addDoc(collection(db, "personalMessages"), {
        uid: user.uid,
        text,
        fileUrl,
        fileType,
        fileName,
        created: serverTimestamp()
      });
      setText("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (e) {
      alert("Upload failed: " + e.message);
    }
    setUploading(false);
  };

  // Delete message
  const handleDelete = async msg => {
    if (window.confirm("Delete this message?")) {
      if (msg.fileUrl && msg.fileName) {
        try {
          await deleteObject(ref(storage, `personalMessages/${user.uid}/${msg.fileName}`));
        } catch (e) { /* Ignore */ }
      }
      await deleteDoc(doc(db, "personalMessages", msg.id));
    }
  };

  // Start editing
  const handleEdit = (msg) => {
    setEditingId(msg.id);
    setEditingText(msg.text);
  };

  // Save editing
  const handleSaveEdit = async (msg) => {
    if (editingText.trim().length < 2) {
      alert("Message too short.");
      return;
    }
    await updateDoc(doc(db, "personalMessages", msg.id), { text: editingText });
    setEditingId(null);
    setEditingText("");
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  return (
    <div>
      <h2>Personal Messages</h2>
      <form className="card" onSubmit={handleUpload} style={{ maxWidth: 430, marginBottom: 28 }}>
        <textarea
          value={text}
          required
          minLength={2}
          maxLength={2000}
          className="input"
          placeholder="Write your message..."
          onChange={e => setText(e.target.value)}
          rows={4}
          style={{ resize: "vertical" }}
        />
        <input
          type="file"
          ref={fileInput}
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={e => setFile(e.target.files[0])}
          style={{ marginBottom: 10 }}
        />
        <button type="submit" disabled={uploading} className="btn-main" style={{ width: 160 }}>
          {uploading ? "Uploading..." : "Add Message"}
        </button>
      </form>

      <div style={{ maxWidth: 640 }}>
        {messages.map(msg => (
          <div className="card" key={msg.id} style={{ position: "relative", marginBottom: 20 }}>
            {editingId === msg.id ? (
              <div>
                <textarea
                  value={editingText}
                  minLength={2}
                  maxLength={2000}
                  required
                  autoFocus
                  className="input"
                  rows={4}
                  onChange={e => setEditingText(e.target.value)}
                  style={{ resize: "vertical" }}
                />
                <div style={{ marginTop: 8, display: "flex", gap: 9 }}>
                  <button onClick={() => handleSaveEdit(msg)} type="button" className="btn-main">
                    Save
                  </button>
                  <button onClick={handleCancelEdit} type="button" className="btn-cancel">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 6, whiteSpace: "pre-line" }}>{msg.text}</div>
                {msg.fileUrl && (
                  msg.fileType === "image" ? (
                    <img
                      src={msg.fileUrl}
                      alt=""
                      style={{
                        width: 100, height: 100, objectFit: "cover",
                        borderRadius: 8, marginBottom: 4,
                        border: "2px solid #eee", boxShadow: "0 2px 6px rgba(0,0,0,0.06)"
                      }}
                    />
                  ) : msg.fileType === "video" ? (
                    <video src={msg.fileUrl} controls style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 4 }} />
                  ) : (
                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-accent)", textDecoration: "underline" }}>
                      Download File
                    </a>
                  )
                )}
                <div style={{ fontSize: "0.97em", color: "#657899", marginTop: 4 }}>
                  {msg.created && msg.created.toDate
                    ? msg.created.toDate().toLocaleString()
                    : ""}
                </div>
                <div style={{ position: "absolute", top: 14, right: 10, display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleEdit(msg)}
                    className="btn-main"
                    style={{ padding: "4px 14px", fontSize: "0.93em" }}
                  >Edit</button>
                  <button
                    onClick={() => handleDelete(msg)}
                    className="btn-danger"
                    style={{ padding: "4px 14px", fontSize: "0.93em" }}
                  >Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
