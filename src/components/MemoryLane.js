import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import {
  collection, addDoc, query, where, orderBy, onSnapshot,
  updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "firebase/storage";

// --- Helper: Default Form State
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

  // --- Fetch Memories
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

  // --- Form Open/Close
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

  // --- Handle Input
  function handleInput(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  // --- Handle Image Upload (multi)
  function handleImageFiles(e) {
    setForm(f => ({ ...f, imageFiles: Array.from(e.target.files) }));
  }
  // --- Handle Video Upload
  function handleVideoFile(e) {
    setForm(f => ({ ...f, videoFile: e.target.files[0] }));
  }
  // --- Handle Audio Upload
  function handleAudioFile(e) {
    setForm(f => ({ ...f, audioFile: e.target.files[0] }));
  }

  // --- Upload Media (returns URLs array/object)
  async function uploadMedia({ imageFiles, videoFile, audioFile }) {
    let images = [], videoUrl = "", audioUrl = "";
    // --- Images
    if (imageFiles && imageFiles.length > 0) {
      for (let img of imageFiles) {
        const imgRef = ref(storage, `memories/${user.uid}/${Date.now()}_${img.name}`);
        const uploadTask = uploadBytesResumable(imgRef, img);
        await new Promise((res, rej) => uploadTask.on("state_changed", null, rej, res));
        images.push(await getDownloadURL(uploadTask.snapshot.ref));
      }
    }
    // --- Video
    if (videoFile) {
      const vidRef = ref(storage, `memories/${user.uid}/${Date.now()}_${videoFile.name}`);
      const uploadTask = uploadBytesResumable(vidRef, videoFile);
      await new Promise((res, rej) => uploadTask.on("state_changed", null, rej, res));
      videoUrl = await getDownloadURL(uploadTask.snapshot.ref);
    }
    // --- Audio
    if (audioFile) {
      const audRef = ref(storage, `memories/${user.uid}/${Date.now()}_${audioFile.name}`);
      const uploadTask = uploadBytesResumable(audRef, audioFile);
      await new Promise((res, rej) => uploadTask.on("state_changed", null, rej, res));
      audioUrl = await getDownloadURL(uploadTask.snapshot.ref);
    }
    return { images, videoUrl, audioUrl };
  }

  // --- Handle Add/Edit Memory
  async function handleSubmit(e) {
    e.preventDefault();
    setUploading(true);
    try {
      let images = form.images || [];
      let videoUrl = form.videoUrl || "";
      let audioUrl = form.audioUrl || "";

      // Only upload new files
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

  // --- Delete Memory
  async function handleDelete(id, images, videoUrl, audioUrl) {
    if (!window.confirm("Delete this memory?")) return;
    // Optionally: delete files from storage
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
            <button className="btn" onClick={e => { e.stopPropagation(); openForm(memory); }}>Edit</button>
            <button className="btn btn-danger" onClick={e => { e.stopPropagation(); handleDelete(memory.id, memory.images, memory.videoUrl, memory.audioUrl); }}>Delete</button>
          </div>
        </div>
      </div>
    );
  }

  // --- Memory Detail Modal
  function MemoryPreview({ memory, onClose }) {
    return (
      <div className="modal-overlay">
        <div className="memory-detail-modal">
          <button className="modal-close" onClick={onClose}>&times;</button>
          <h2>{memory.title}</h2>
          <div style={{ color: "#8c7c91", fontSize: 16, marginBottom: 7 }}>{memory.date}</div>
          <div style={{ marginBottom: 13 }}>
            {memory.tags?.map(tag => <span key={tag} className="memory-tag">{tag}</span>)}
          </div>
          <div style={{ fontSize: 16, marginBottom: 16 }}>{memory.description}</div>
          <div>
            {memory.images?.map((url, idx) => (
              <img key={idx} src={url} alt="" style={{ maxWidth: 220, margin: "4px 12px 8px 0", borderRadius: 9, border: "1px solid #eedced" }} />
            ))}
          </div>
          {memory.videoUrl && (
            <div style={{ marginTop: 18 }}>
              <video src={memory.videoUrl} controls style={{ maxWidth: 340, borderRadius: 10, background: "#eee" }} />
            </div>
          )}
          {memory.audioUrl && (
            <div style={{ marginTop: 18 }}>
              <audio src={memory.audioUrl} controls style={{ width: 260, background: "#eee", borderRadius: 8 }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Memory Add/Edit Modal Form
  function renderForm() {
    return (
      <div className="modal-overlay">
        <form className="memory-form" onSubmit={handleSubmit}>
          <h3 style={{ marginBottom: 7 }}>{editingId ? "Edit Memory" : "Add Memory"}</h3>
          <input name="title" value={form.title} onChange={handleInput} placeholder="Title" maxLength={50} required />
          <input name="date" type="date" value={form.date} onChange={handleInput} />
          <textarea name="description" value={form.description} onChange={handleInput} placeholder="Describe the memory..." rows={4} required />
          <input name="tags" value={form.tags} onChange={handleInput} placeholder="Tags (comma separated)" />
          {/* Images */}
          <div>
            <label style={{ fontWeight: 500 }}>Photos</label>
            <input
              type="file"
              accept="image/*"
              multiple
              ref={fileInputImages}
              onChange={handleImageFiles}
            />
            {form.images?.length > 0 && (
              <div style={{ margin: "8px 0" }}>
                {form.images.map((img, i) => (
                  <img key={i} src={img} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 7, marginRight: 5 }} />
                ))}
              </div>
            )}
          </div>
          {/* Video */}
          <div>
            <label style={{ fontWeight: 500 }}>Video</label>
            <input
              type="file"
              accept="video/*"
              ref={fileInputVideo}
              onChange={handleVideoFile}
            />
            {form.videoUrl && (
              <video src={form.videoUrl} controls style={{ width: 80, borderRadius: 6, marginTop: 7 }} />
            )}
          </div>
          {/* Audio */}
          <div>
            <label style={{ fontWeight: 500 }}>Audio</label>
            <input
              type="file"
              accept="audio/*"
              ref={fileInputAudio}
              onChange={handleAudioFile}
            />
            {form.audioUrl && (
              <audio src={form.audioUrl} controls style={{ width: 80, marginTop: 7 }} />
            )}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button className="btn" style={{ background: "#2a0516", color: "#fff", flex: 1 }} disabled={uploading}>{editingId ? "Update" : "Add"}</button>
            <button type="button" className="btn" style={{ background: "#ccc", color: "#222" }} onClick={closeForm}>Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  // --- Main UI
  return (
    <div className="memorylane-root">
      <h2>Memory Lane</h2>
      <button className="btn" style={{ background: "#e97c13", color: "#fff", marginBottom: 26 }} onClick={() => openForm()}>Add Memory</button>
      <div className="memory-grid">
        {memories.length === 0 ? (
          <div style={{ color: "#968a9d", padding: 30, textAlign: "center" }}>No memories yet.</div>
        ) : (
          memories.map(memory => <MemoryCard key={memory.id} memory={memory} />)
        )}
      </div>
      {showForm && renderForm()}
      {preview && <MemoryPreview memory={preview} onClose={() => setPreview(null)} />}

      {/* Modal + Card Styles */}
      <style>{`
        .memorylane-root { max-width: 900px; margin: 0 auto; padding: 22px 10px 40px 10px; }
        .memory-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 28px; }
        .memory-card {
          display: flex; flex-direction: row; align-items: flex-start;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 3px 16px 0 #2a051613;
          padding: 15px 13px 15px 13px;
          cursor: pointer;
          border: 1px solid #ece1ec;
          min-height: 140px;
          transition: box-shadow 0.13s, border 0.13s, transform 0.13s;
          position: relative;
        }
        .memory-card:hover { box-shadow: 0 6px 24px 0 #c189b336; transform: translateY(-2px) scale(1.013); border: 1px solid #dab0f1; }
        .memory-thumb { width: 80px; height: 80px; object-fit: cover; border-radius: 10px; margin-right: 17px; border: 1px solid #e6dae6; }
        .memory-info { flex: 1; min-width: 0; }
        .memory-title { font-size: 20px; font-weight: 600; margin-bottom: 6px; color: #2a0516; }
        .memory-date { font-size: 15px; color: #987a91; margin-bottom: 4px; }
        .memory-desc { font-size: 15px; color: #7b6684; margin-bottom: 8px; }
        .memory-tags { margin-bottom: 7px; }
        .memory-tag {
          display: inline-block;
          background: #e97c1320;
          color: #e97c13;
          font-size: 13px;
          padding: 2px 8px;
          border-radius: 7px;
          margin-right: 6px;
          margin-bottom: 2px;
        }
        .memory-actions { margin-top: 8px; display: flex; gap: 6px; }
        .btn { border: none; border-radius: 6px; padding: 6px 15px; font-weight: 600; cursor: pointer; background: #e97c13; color: #fff; }
        .btn-danger { background: #b11a25 !important; color: #fff !important; }
        /* Modal Styles */
        .modal-overlay {
          position: fixed; left: 0; top: 0; right: 0; bottom: 0;
          background: #23101882; z-index: 2202;
          display: flex; align-items: center; justify-content: center;
        }
        .memory-detail-modal {
          background: #fff;
          border-radius: 19px;
          box-shadow: 0 8px 36px 0 #2a051629;
          padding: 36px 25px 26px 25px;
          min-width: 310px; max-width: 480px; width: 98vw;
          max-height: 95vh; overflow-y: auto;
          position: relative;
        }
        .modal-close {
          position: absolute; top: 12px; right: 18px; font-size: 2rem; background: none;
          border: none; color: #c39; cursor: pointer; z-index: 10;
        }
        .memory-form {
          background: #fff;
          border-radius: 18px;
          padding: 24px 18px 14px 18px;
          max-width: 400px;
          width: 94vw;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 8px 36px 0 #2a051629;
          margin: 0 auto;
        }
        .memory-form input, .memory-form textarea {
          width: 100%; border: 1px solid #bfa4c4; border-radius: 7px;
          padding: 7px 10px; font-size: 1em; background: #fff; margin-bottom: 2px;
        }
        .memory-form textarea { min-height: 56px; }
        .memory-form label { font-weight: 500; margin-bottom: 3px; }
      `}</style>
    </div>
  );
}
