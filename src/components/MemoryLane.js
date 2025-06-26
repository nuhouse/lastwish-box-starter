import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import {
  collection, addDoc, query, where, orderBy, onSnapshot,
  updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "firebase/storage";

function defaultForm(uid) {
  return {
    uid,
    title: "",
    date: "",
    description: "",
    tags: "",
    images: [],
    imageFiles: [],
    videoUrl: "",
    videoFile: null,
    audioUrl: "",
    audioFile: null,
    created: null
  };
}

export default function MemoryLane({ user }) {
  const [memories, setMemories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm(user?.uid));
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputImages = useRef();
  const fileInputVideo = useRef();
  const fileInputAudio = useRef();

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "memories"),
      where("uid", "==", user.uid),
      orderBy("created", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setMemories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  function openForm(memory = null) {
    setShowForm(true);
    if (memory) {
      setForm({
        uid: user.uid,
        title: memory.title || "",
        date: memory.date || "",
        description: memory.description || "",
        tags: (memory.tags || []).join(", "),
        images: memory.images || [],
        imageFiles: [],
        videoUrl: memory.videoUrl || "",
        videoFile: null,
        audioUrl: memory.audioUrl || "",
        audioFile: null,
      });
      setEditingId(memory.id);
    } else {
      setForm(defaultForm(user.uid));
      setEditingId(null);
    }
    setPreview(null);
    if (fileInputImages.current) fileInputImages.current.value = "";
    if (fileInputVideo.current) fileInputVideo.current.value = "";
    if (fileInputAudio.current) fileInputAudio.current.value = "";
  }
  function closeForm() {
    setShowForm(false);
    setForm(defaultForm(user.uid));
    setEditingId(null);
    setPreview(null);
    if (fileInputImages.current) fileInputImages.current.value = "";
    if (fileInputVideo.current) fileInputVideo.current.value = "";
    if (fileInputAudio.current) fileInputAudio.current.value = "";
  }

  function handleInput(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }
  function handleImageFiles(e) {
    setForm(f => ({ ...f, imageFiles: Array.from(e.target.files) }));
  }
  function handleVideoFile(e) {
    setForm(f => ({ ...f, videoFile: e.target.files[0] }));
  }
  function handleAudioFile(e) {
    setForm(f => ({ ...f, audioFile: e.target.files[0] }));
  }

  async function uploadMedia({ imageFiles, videoFile, audioFile }) {
    let images = [], videoUrl = "", audioUrl = "";
    if (imageFiles && imageFiles.length > 0) {
      for (let img of imageFiles) {
        const imgRef = ref(storage, `memories/${user.uid}/${Date.now()}_${img.name}`);
        const uploadTask = uploadBytesResumable(imgRef, img);
        await new Promise((res, rej) => uploadTask.on("state_changed", null, rej, res));
        images.push(await getDownloadURL(uploadTask.snapshot.ref));
      }
    }
    if (videoFile) {
      const vidRef = ref(storage, `memories/${user.uid}/${Date.now()}_${videoFile.name}`);
      const uploadTask = uploadBytesResumable(vidRef, videoFile);
      await new Promise((res, rej) => uploadTask.on("state_changed", null, rej, res));
      videoUrl = await getDownloadURL(uploadTask.snapshot.ref);
    }
    if (audioFile) {
      const audRef = ref(storage, `memories/${user.uid}/${Date.now()}_${audioFile.name}`);
      const uploadTask = uploadBytesResumable(audRef, audioFile);
      await new Promise((res, rej) => uploadTask.on("state_changed", null, rej, res));
      audioUrl = await getDownloadURL(uploadTask.snapshot.ref);
    }
    return { images, videoUrl, audioUrl };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setUploading(true);
    try {
      let images = form.images || [];
      let videoUrl = form.videoUrl || "";
      let audioUrl = form.audioUrl || "";
      const media = await uploadMedia({
        imageFiles: form.imageFiles,
        videoFile: form.videoFile,
        audioFile: form.audioFile
      });
      images = [...images, ...(media.images || [])];
      if (media.videoUrl) videoUrl = media.videoUrl;
      if (media.audioUrl) audioUrl = media.audioUrl;

      const payload = {
        uid: user.uid,
        title: form.title,
        date: form.date,
        description: form.description,
        tags: form.tags
          ? form.tags.split(",").map(t => t.trim()).filter(Boolean)
          : [],
        images,
        videoUrl,
        audioUrl,
        created: editingId ? undefined : serverTimestamp(),
        updated: serverTimestamp(),
      };
      if (editingId) {
        await updateDoc(doc(db, "memories", editingId), payload);
      } else {
        await addDoc(collection(db, "memories"), payload);
      }
      closeForm();
    } catch (e) {
      alert("Failed to save: " + e.message);
    }
    setUploading(false);
  }

  async function handleDelete(id, images, videoUrl, audioUrl) {
    if (!window.confirm("Delete this memory?")) return;
    try {
      if (images) for (let url of images) {
        const segments = url.split("/");
        const name = decodeURIComponent(segments[segments.length - 1].split("?")[0]);
        await deleteObject(ref(storage, `memories/${user.uid}/${name}`)).catch(() => {});
      }
      if (videoUrl) {
        const segments = videoUrl.split("/");
        const name = decodeURIComponent(segments[segments.length - 1].split("?")[0]);
        await deleteObject(ref(storage, `memories/${user.uid}/${name}`)).catch(() => {});
      }
      if (audioUrl) {
        const segments = audioUrl.split("/");
        const name = decodeURIComponent(segments[segments.length - 1].split("?")[0]);
        await deleteObject(ref(storage, `memories/${user.uid}/${name}`)).catch(() => {});
      }
      await deleteDoc(doc(db, "memories", id));
    } catch (e) {
      alert("Failed to delete: " + e.message);
    }
  }

  // --- Memory Card View
  function MemoryCard({ memory }) {
    return (
      <div className="memory-card" onClick={() => setPreview(memory)}>
        {memory.images?.length > 0 && (
          <img
            src={memory.images[0]}
            alt=""
            className="memory-thumb"
          />
        )}
        <div className="memory-info">
          <div className="memory-title">{memory.title}</div>
          {memory.date && <div className="memory-date">{memory.date}</div>}
          <div className="memory-desc">{memory.description.slice(0, 70)}{memory.description.length > 70 ? "..." : ""}</div>
          <div className="memory-tags">
            {memory.tags?.map(tag => <span key={tag} className="memory-tag">{tag}</span>)}
          </div>
          <div className="memory-actions">
            <button className="btn-main" onClick={e => { e.stopPropagation(); openForm(memory); }}>Edit</button>
            <button className="btn-danger" onClick={e => { e.stopPropagation(); handleDelete(memory.id, memory.images, memory.videoUrl, memory.audioUrl); }}>Delete</button>
          </div>
        </div>
      </div>
    );
  }

  // --- Memory Detail Modal
  function MemoryPreview({ memory, onClose }) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="memory-detail-modal" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>&times;</button>
          <h2>{memory.title}</h2>
          <div className="memory-detail-date">{memory.date}</div>
          <div className="memory-detail-tags">
            {memory.tags?.map(tag => <span key={tag} className="memory-tag">{tag}</span>)}
          </div>
          <div className="memory-detail-desc">{memory.description}</div>
          <div>
            {memory.images?.map((url, idx) => (
              <img key={idx} src={url} alt="" className="memory-detail-img" />
            ))}
          </div>
          {memory.videoUrl && (
            <div className="memory-detail-video">
              <video src={memory.videoUrl} controls />
            </div>
          )}
          {memory.audioUrl && (
            <div className="memory-detail-audio">
              <audio src={memory.audioUrl} controls />
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderForm() {
    return (
      <div className="modal-overlay" onClick={closeForm}>
        <div className="memory-form-modal-box" onClick={e => e.stopPropagation()}>
          <form className="memory-form" onSubmit={handleSubmit}>
            <h3>{editingId ? "Edit Memory" : "Add Memory"}</h3>
            <input name="title" value={form.title} onChange={handleInput} placeholder="Title" maxLength={50} required />
            <input name="date" type="date" value={form.date} onChange={handleInput} />
            <textarea name="description" value={form.description} onChange={handleInput} placeholder="Describe the memory..." rows={4} required />
            <input name="tags" value={form.tags} onChange={handleInput} placeholder="Tags (comma separated)" />
            {/* Images */}
            <div>
              <label>Photos</label>
              <input
                type="file"
                accept="image/*"
                multiple
                ref={fileInputImages}
                onChange={handleImageFiles}
                className="memory-form-input"
              />
              {form.images?.length > 0 && (
                <div className="memory-form-img-list">
                  {form.images.map((img, i) => (
                    <img key={i} src={img} alt="" className="memory-form-thumb" />
                  ))}
                </div>
              )}
            </div>
            {/* Video */}
            <div>
              <label>Video</label>
              <input
                type="file"
                accept="video/*"
                ref={fileInputVideo}
                onChange={handleVideoFile}
                className="memory-form-input"
              />
              {form.videoUrl && (
                <video src={form.videoUrl} controls className="memory-form-video" />
              )}
            </div>
            {/* Audio */}
            <div>
              <label>Audio</label>
              <input
                type="file"
                accept="audio/*"
                ref={fileInputAudio}
                onChange={handleAudioFile}
                className="memory-form-input"
              />
              {form.audioUrl && (
                <audio src={form.audioUrl} controls className="memory-form-audio" />
              )}
            </div>
            <div className="memory-form-actions">
              <button className="btn-main" disabled={uploading}>{editingId ? "Update" : "Add"}</button>
              <button type="button" className="btn-cancel" onClick={closeForm}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="memorylane-root">
      <h2>Memory Lane</h2>
      <button className="btn-main memorylane-add-btn" onClick={() => openForm()}>Add Memory</button>
      <div className="memory-grid">
        {memories.length === 0 ? (
          <div className="memorylane-empty">No memories yet.</div>
        ) : (
          memories.map(memory => <MemoryCard key={memory.id} memory={memory} />)
        )}
      </div>
      {showForm && renderForm()}
      {preview && <MemoryPreview memory={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
