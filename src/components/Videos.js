import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import {
  collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "firebase/storage";

export default function Videos({ user }) {
  const [videos, setVideos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", file: null });
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const fileInput = useRef();

  // Fetch user's videos
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "videos"),
      where("uid", "==", user.uid),
      orderBy("created", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  // Cleanup blob when file changes
  useEffect(() => {
    if (!form.file) return;
    const url = URL.createObjectURL(form.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.file]);

  function openForm() {
    setForm({ title: "", description: "", file: null });
    setPreviewUrl("");
    setShowForm(true);
    if (fileInput.current) fileInput.current.value = "";
  }
  function closeForm() {
    setShowForm(false);
    setForm({ title: "", description: "", file: null });
    setPreviewUrl("");
    if (fileInput.current) fileInput.current.value = "";
  }

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }
  function handleFile(e) {
    setForm(f => ({ ...f, file: e.target.files[0] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title || !form.file) return;
    setUploading(true);
    try {
      // Upload video to storage
      const ext = form.file.name.split(".").pop() || "webm";
      const filename = `${user.uid}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, `videos/${user.uid}/${filename}`);
      const uploadTask = uploadBytesResumable(storageRef, form.file);
      await new Promise((res, rej) => uploadTask.on("state_changed", null, rej, res));
      const mediaUrl = await getDownloadURL(uploadTask.snapshot.ref);

      // Save metadata in Firestore
      await addDoc(collection(db, "videos"), {
        uid: user.uid,
        title: form.title,
        description: form.description,
        mediaUrl,
        created: serverTimestamp()
      });
      closeForm();
    } catch (e) {
      alert("Failed to save: " + e.message);
    }
    setUploading(false);
  }

  async function handleDelete(id, mediaUrl) {
    if (!window.confirm("Delete this video?")) return;
    try {
      // Remove from storage if present
      if (mediaUrl) {
        const segments = mediaUrl.split("/");
        const name = decodeURIComponent(segments[segments.length - 1].split("?")[0]);
        await deleteObject(ref(storage, `videos/${user.uid}/${name}`)).catch(() => {});
      }
      await deleteDoc(doc(db, "videos", id));
    } catch (e) {
      alert("Failed to delete: " + e.message);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 680, margin: "40px auto" }}>
      <h2>Videos</h2>
      <p style={{ color: "#7a6888", maxWidth: 600 }}>
        Record or upload special video messages, stories, memories, or instructions.
        These will be saved for your trusted contacts and loved ones.
      </p>
      <button className="btn-main" style={{ margin: "16px 0" }} onClick={openForm}>+ New Video</button>
      {showForm && (
        <form className="pol-form" onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
          <input
            name="title"
            type="text"
            className="input"
            placeholder="Video Title"
            value={form.title}
            onChange={handleChange}
            required
          />
          <textarea
            name="description"
            className="input"
            placeholder="Description or story (optional)"
            value={form.description}
            onChange={handleChange}
            rows={2}
          />
          <input
            type="file"
            ref={fileInput}
            onChange={handleFile}
            accept="video/*"
            required
            style={{ marginBottom: 10 }}
          />
          {previewUrl && (
            <video src={previewUrl} controls style={{ width: "100%", maxWidth: 350, borderRadius: 12, marginBottom: 9 }} />
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn-main" type="submit" disabled={uploading}>Save</button>
            <button className="btn-cancel" type="button" onClick={closeForm}>Cancel</button>
          </div>
        </form>
      )}
      <hr style={{ margin: "24px 0" }} />
      <div>
        {videos.length === 0 ? (
          <div style={{ color: "#8cade1", marginTop: 16 }}>No videos saved yet.</div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "18px"
          }}>
            {videos.map((video) => (
              <div key={video.id} className="card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 5 }}>{video.title}</div>
                <div style={{ color: "#8575a5", marginBottom: 7 }}>{video.description}</div>
                {video.mediaUrl && (
                  <video
                    src={video.mediaUrl}
                    controls
                    style={{ width: "100%", maxWidth: 300, borderRadius: 11, background: "#f2eef5" }}
                  />
                )}
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button className="btn-main" style={{ fontSize: "0.96em" }} onClick={() => window.open(video.mediaUrl, "_blank")}>Open</button>
                  <button className="btn-danger" style={{ fontSize: "0.96em" }} onClick={() => handleDelete(video.id, video.mediaUrl)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
