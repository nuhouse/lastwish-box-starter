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
  const [editingId, setEditingId] = useState(null); // <-- NEW
  const [editingText, setEditingText] = useState(""); // <-- NEW
  const fileInput = useRef();

  // Load messages
  useEffect(() => {
    const q = query(
      collection(db, "personalMessages"),
      where("uid", "==", user.uid),
      orderBy("created", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user.uid]);

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
          uploadTask.on(
            "state_changed",
            null,
            reject,
            () => resolve()
          );
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
      fileInput.current.value = "";
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
        } catch (e) { /* Ignore if not found */ }
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
    <div style={{color:'red'}}>DEBUG EDIT BUTTON SHOULD SHOW</div>
      <h2>Personal Messages</h2>
      <form onSubmit={handleUpload} style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 12, maxWidth: 430 }}>
        <textarea
          value={text}
          required
          minLength={2}
          maxLength={2000}
          placeholder="Write your message..."
          onChange={e => setText(e.target.value)}
          style={{ minHeight: 64, resize: "vertical", padding: 10, borderRadius: 5, border: "1px solid #ccc" }}
        />
        <input
          type="file"
          ref={fileInput}
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={e => setFile(e.target.files[0])}
        />
        <button type="submit" disabled={uploading} style={{
          background: "#2a0516",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          padding: "10px 18px",
          fontWeight: 600,
          cursor: "pointer"
        }}>
          {uploading ? "Uploading..." : "Add Message"}
        </button>
      </form>

      <div style={{ maxWidth: 630 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            border: "1px solid #eee",
            borderRadius: 9,
            marginBottom: 16,
            padding: 14,
            background: "#f8f8fa",
            position: "relative"
          }}>
            {editingId === msg.id ? (
              <div>
                <textarea
                  value={editingText}
                  minLength={2}
                  maxLength={2000}
                  required
                  autoFocus
                  onChange={e => setEditingText(e.target.value)}
                  style={{
                    minHeight: 60, width: "100%", resize: "vertical", borderRadius: 5,
                    padding: 8, border: "1px solid #aaa", marginBottom: 8
                  }}
                />
                <div>
                  <button onClick={() => handleSaveEdit(msg)} style={{
                    background: "#2a0516", color: "#fff", border: "none", borderRadius: 4,
                    padding: "7px 16px", marginRight: 8, fontWeight: 600, cursor: "pointer"
                  }}>
                    Save
                  </button>
                  <button onClick={handleCancelEdit} style={{
                    background: "#ccc", color: "#222", border: "none", borderRadius: 4,
                    padding: "7px 14px", fontWeight: 600, cursor: "pointer"
                  }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 6, whiteSpace: "pre-line" }}>{msg.text}</div>
                {msg.fileUrl && (
                  msg.fileType === "image" ? (
                    <img src={msg.fileUrl} alt="" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 4 }} />
                  ) : msg.fileType === "video" ? (
                    <video src={msg.fileUrl} controls style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 4 }} />
                  ) : (
                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#f15822", textDecoration: "underline" }}>
                      Download File
                    </a>
                  )
                )}
                <div style={{ fontSize: "0.95em", color: "#657899", marginTop: 4 }}>
                  {msg.created && msg.created.toDate
                    ? msg.created.toDate().toLocaleString()
                    : ""}
                </div>
                <button onClick={() => handleEdit(msg)} style={{
                  position: "absolute", top: 8, right: 65, background: "#e97c13", color: "#fff",
                  border: "none", borderRadius: 4, padding: "2px 9px", fontSize: "0.93em", cursor: "pointer"
                }}>Edit</button>
                <button onClick={() => handleDelete(msg)} style={{
                  position: "absolute", top: 8, right: 8, background: "#980000", color: "#fff",
                  border: "none", borderRadius: 4, padding: "2px 9px", fontSize: "0.93em", cursor: "pointer"
                }}>Delete</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
