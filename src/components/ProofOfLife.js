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
    type: "text",
    note: "",
    mediaUrl: "",
    file: null,
    created: null
  };
}

export default function ProofOfLife({ user }) {
  const [proofs, setProofs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm(user?.uid));
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [recordType, setRecordType] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileUrl, setFileUrl] = useState(null); // For recorded preview

  const fileInput = useRef();
  const videoRef = useRef();

  // Fetch proofs from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "proofOfLife"),
      where("uid", "==", user.uid),
      orderBy("created", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setProofs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  // Clean up blob URL when file changes
  useEffect(() => {
    if (!form.file) {
      setFileUrl(null);
      return;
    }
    const url = URL.createObjectURL(form.file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.file]);

  // Sync srcObject for live video preview (fixes crash!)
  useEffect(() => {
    if (videoRef.current && recording && mediaStream && recordType === "video") {
      videoRef.current.srcObject = mediaStream;
    }
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [recording, mediaStream, recordType]);

  function openForm(proof = null) {
    setShowForm(true);
    setRecording(false);
    stopMediaTracks();
    setFileUrl(null);
    if (proof) {
      setForm({
        uid: user.uid,
        type: proof.type,
        note: proof.note,
        mediaUrl: proof.mediaUrl || "",
        file: null,
      });
      setEditingId(proof.id);
    } else {
      setForm(defaultForm(user.uid));
      setEditingId(null);
    }
    if (fileInput.current) fileInput.current.value = "";
  }
  function closeForm() {
    setShowForm(false);
    setForm(defaultForm(user.uid));
    setEditingId(null);
    setRecording(false);
    stopMediaTracks();
    setFileUrl(null);
    if (fileInput.current) fileInput.current.value = "";
  }
  function stopMediaTracks() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }
    setChunks([]);
    setRecordType(null);
  }
  function handleInput(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (name === "type") {
      setForm(f => ({ ...f, file: null, mediaUrl: "" }));
      setFileUrl(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  function handleFile(e) {
    setForm(f => ({ ...f, file: e.target.files[0] }));
  }
  async function startRecording(type) {
    setRecordType(type);
    setChunks([]);
    setFileUrl(null);
    let constraints =
      type === "video"
        ? { video: true, audio: true }
        : { video: false, audio: true };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);
      let options = { mimeType: type === "video" ? "video/webm" : "audio/webm" };
      const mr = new window.MediaRecorder(stream, options);
      setMediaRecorder(mr);
      mr.ondataavailable = e => setChunks(chunks => [...chunks, e.data]);
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: type === "video" ? "video/webm" : "audio/webm" });
        const file = new File([blob], `proof.${type}.webm`, { type: blob.type });
        setForm(f => ({ ...f, file }));
        setFileUrl(URL.createObjectURL(file));
        setRecording(false);
        setMediaStream(null);
        setMediaRecorder(null);
        setChunks([]);
      };
      mr.start();
      setRecording(true);
    } catch (err) {
      alert("Could not access your " + type + ". " + err.message);
    }
  }
  function stopRecording() {
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setUploading(true);
    try {
      let mediaUrl = form.mediaUrl;
      if (["photo", "video", "audio"].includes(form.type) && form.file) {
        const ext =
          form.file.name.split(".").pop() || (form.type === "photo" ? "jpg" : "webm");
        const filename = `${user.uid}_${Date.now()}.${ext}`;
        const storageRef = ref(storage, `proofOfLife/${user.uid}/${filename}`);
        const uploadTask = uploadBytesResumable(storageRef, form.file);
        await new Promise((res, rej) => uploadTask.on("state_changed", null, rej, res));
        mediaUrl = await getDownloadURL(uploadTask.snapshot.ref);
      }
      const payload = {
        uid: user.uid,
        type: form.type,
        note: form.note,
        mediaUrl: mediaUrl || "",
        created: editingId ? undefined : serverTimestamp(),
        updated: serverTimestamp(),
      };
      if (editingId) {
        await updateDoc(doc(db, "proofOfLife", editingId), payload);
      } else {
        await addDoc(collection(db, "proofOfLife"), payload);
      }
      closeForm();
    } catch (e) {
      alert("Failed to save: " + e.message);
    }
    setUploading(false);
  }
  async function handleDelete(id, mediaUrl) {
    if (!window.confirm("Delete this proof of life entry?")) return;
    try {
      if (mediaUrl) {
        const segments = mediaUrl.split("/");
        const name = decodeURIComponent(segments[segments.length - 1].split("?")[0]);
        await deleteObject(ref(storage, `proofOfLife/${user.uid}/${name}`)).catch(() => {});
      }
      await deleteDoc(doc(db, "proofOfLife", id));
    } catch (e) {
      alert("Failed to delete: " + e.message);
    }
  }
  function ProofCard({ proof }) {
    const typeIcon = proof.type === "photo"
      ? "🖼️" : proof.type === "video"
      ? "🎥" : proof.type === "audio"
      ? "🎤" : "✏️";
    return (
      <div className="pol-card" onClick={() => setPreview(proof)}>
        <div className="pol-icon">{typeIcon}</div>
        <div className="pol-info">
          <div className="pol-date">
            {proof.created?.toDate
              ? proof.created.toDate().toLocaleString()
              : ""}
          </div>
          <div className="pol-note">{proof.note?.slice(0, 65)}{proof.note?.length > 65 ? "..." : ""}</div>
          <div className="pol-type">{proof.type}</div>
          <div className="pol-actions">
            <button className="btn-main" onClick={e => { e.stopPropagation(); openForm(proof); }}>Edit</button>
            <button className="btn-delete" onClick={e => { e.stopPropagation(); handleDelete(proof.id, proof.mediaUrl); }}>Delete</button>
          </div>
        </div>
      </div>
    );
  }
  function ProofPreview({ proof, onClose }) {
    return (
      <div className="pol-modal-bg">
        <div className="pol-modal">
          <button className="pol-close" onClick={onClose}>&times;</button>
          <h3 style={{ marginBottom: 7, color: "#2a0516" }}>Proof of Life</h3>
          <div style={{ color: "#7c6e8a", marginBottom: 12 }}>
            {proof.created?.toDate ? proof.created.toDate().toLocaleString() : ""}
          </div>
          <div style={{ marginBottom: 13, fontWeight: 500 }}>{proof.note}</div>
          {proof.type === "photo" && proof.mediaUrl && (
            <img src={proof.mediaUrl} alt="" style={{ maxWidth: 220, borderRadius: 15, margin: "10px 0" }} />
          )}
          {proof.type === "video" && proof.mediaUrl && (
            <video src={proof.mediaUrl} controls style={{ maxWidth: 320, borderRadius: 15, margin: "10px 0" }} />
          )}
          {proof.type === "audio" && proof.mediaUrl && (
            <audio src={proof.mediaUrl} controls style={{ width: 250, margin: "10px 0" }} />
          )}
        </div>
      </div>
    );
  }
  function renderForm() {
    const supportsMedia = !!(navigator.mediaDevices && window.MediaRecorder);
    return (
      <div className="pol-modal-bg">
        <form className="pol-form" onSubmit={handleSubmit}>
          <h3 style={{ marginBottom: 9, color: "#2a0516" }}>{editingId ? "Edit Proof" : "New Proof of Life"}</h3>
          <select name="type" value={form.type} onChange={handleInput} style={{ marginBottom: 7 }}>
            <option value="text">Text Only</option>
            <option value="photo">Photo</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </select>
          <textarea
            name="note"
            value={form.note}
            onChange={handleInput}
            placeholder="Type your note or message here (required)..."
            required
            rows={3}
            style={{marginBottom:12}}
          />
          {/* Record video/audio */}
          {form.type === "video" && supportsMedia && !form.file && !recording && (
            <button
              type="button"
              className="btn-main"
              style={{ marginBottom: 7 }}
              onClick={() => startRecording("video")}
            >
              🎥 Record Video
            </button>
          )}
          {form.type === "audio" && supportsMedia && !form.file && !recording && (
            <button
              type="button"
              className="btn-main"
              style={{ marginBottom: 7 }}
              onClick={() => startRecording("audio")}
            >
              🎤 Record Audio
            </button>
          )}
          {/* Show live video preview while recording */}
          {recording && mediaStream && recordType === "video" && (
            <video
              ref={videoRef}
              autoPlay
              muted
              style={{ width: 180, marginBottom: 9, borderRadius: 10 }}
              playsInline
            />
          )}
          {recording && mediaStream && recordType === "audio" && (
            <div style={{ marginBottom: 9, color: "#8cade1", fontWeight: 500 }}>● Recording audio...</div>
          )}
          {/* Stop recording button */}
          {recording && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: "#b11a25", fontWeight: 500 }}>● Recording...</span>
              <button
                type="button"
                className="btn-main"
                style={{ background: "#b11a25", marginLeft: 13 }}
                onClick={stopRecording}
              >Stop</button>
            </div>
          )}
          {/* File upload if not recording */}
          {["photo", "video", "audio"].includes(form.type) && !recording && (
            <input
              type="file"
              ref={fileInput}
              onChange={handleFile}
              accept={
                form.type === "photo" ? "image/*"
                : form.type === "video" ? "video/*"
                : "audio/*"
              }
              required={!form.mediaUrl && !form.file}
              style={{ marginBottom: 9 }}
            />
          )}
         {/* VIDEO preview (uploaded/recorded or existing from mediaUrl) */}
{!recording && form.type === "video" && (
  fileUrl ? (
    <video src={fileUrl} controls style={{ width: 80, borderRadius: 7, marginBottom: 7 }} />
  ) : form.mediaUrl ? (
    <video src={form.mediaUrl} controls style={{ width: 80, borderRadius: 7, marginBottom: 7 }} />
  ) : null
)}

{/* AUDIO preview (uploaded/recorded or existing from mediaUrl) */}
{!recording && form.type === "audio" && (
  fileUrl ? (
    <audio src={fileUrl} controls style={{ width: 80, marginBottom: 7 }} />
  ) : form.mediaUrl ? (
    <audio src={form.mediaUrl} controls style={{ width: 80, marginBottom: 7 }} />
  ) : null
)}

{/* PHOTO preview (uploaded/recorded or existing from mediaUrl) */}
{!recording && form.type === "photo" && (
  fileUrl ? (
    <img src={fileUrl} alt="" style={{ width: 54, borderRadius: 7, marginBottom: 7 }} />
  ) : form.mediaUrl ? (
    <img src={form.mediaUrl} alt="" style={{ width: 54, borderRadius: 7, marginBottom: 7 }} />
  ) : null
)}

          <div style={{ display: "flex", gap: 9, marginTop: 9 }}>
            <button className="btn-main" type="submit" style={{ flex: 1 }} disabled={uploading || recording}>
              {editingId ? "Update" : "Add"}
            </button>
            <button type="button" className="btn-cancel" onClick={closeForm}>Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="pol-root">
      <h2>Proof of Life</h2>
      <div style={{ color: "#7a6888", maxWidth: 600, marginBottom: 15 }}>
        Upload a text, photo, video, or audio entry—or record one live—to show you are safe and well. Only you and your trusted contacts can access these.
      </div>
      <button className="btn-main pol-add-btn" onClick={() => openForm()}>
        + New Proof of Life
      </button>
      <div className="pol-grid">
        {proofs.length === 0 ? (
          <div style={{ color: "#a697b8", padding: 25, textAlign: "center" }}>No proof entries yet.</div>
        ) : (
          proofs.map(proof => <ProofCard key={proof.id} proof={proof} />)
        )}
      </div>
      {showForm && renderForm()}
      {preview && <ProofPreview proof={preview} onClose={() => setPreview(null)} />}
      <style>{`
        .pol-root {
          max-width: 700px;
          margin: 0 auto;
          padding: 32px 12px 48px 12px;
        }
        .pol-add-btn {
          margin-bottom: 28px;
          font-size: 1.12em;
        }
        .pol-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
          gap: 26px;
        }
        .pol-card {
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 4px 22px 0 #2a051613;
          padding: 19px 18px 17px 15px;
          cursor: pointer;
          border: 1.5px solid #ece1ec;
          min-height: 118px;
          transition: box-shadow 0.13s, border 0.13s, transform 0.13s;
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .pol-card:hover {
          box-shadow: 0 8px 30px 0 #c189b336;
          transform: translateY(-2px) scale(1.013);
          border: 1.5px solid #dab0f1;
        }
        .pol-icon {
          font-size: 2.05em;
          margin-top: 4px;
        }
        .pol-info {
          flex: 1; min-width: 0;
        }
        .pol-date {
          font-size: 15px;
          color: #927ba1;
          margin-bottom: 4px;
        }
        .pol-note {
          font-size: 16px;
          color: #654e7a;
          margin-bottom: 7px;
          font-weight: 500;
        }
        .pol-type {
          font-size: 13px;
          color: #8cade1;
          margin-bottom: 3px;
          text-transform: capitalize;
        }
        .pol-actions {
          margin-top: 11px;
          display: flex;
          gap: 8px;
        }
        .btn-main {
          background: linear-gradient(90deg, #2a0516 70%, #f15822 120%);
          color: #fff;
          border: none;
          border-radius: 11px;
          font-size: 1em;
          font-weight: 600;
          padding: 7px 22px;
          cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 10px #2a051629;
        }
        .btn-main:disabled, .btn-main[aria-disabled="true"] {
          background: #ccc;
          color: #fff;
          cursor: not-allowed;
        }
        .btn-main:hover:not(:disabled) {
          background: linear-gradient(90deg, #f15822 40%, #980000 100%);
        }
        .btn-delete {
          background: #980000;
          color: #fff;
          border: none;
          border-radius: 11px;
          font-size: 1em;
          font-weight: 500;
          padding: 7px 20px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-delete:hover {
          background: #f15822;
        }
        .btn-cancel {
          background: #657899;
          color: #fff;
          border: none;
          border-radius: 11px;
          font-size: 1em;
          font-weight: 500;
          padding: 7px 18px;
          cursor: pointer;
          transition: background 0.12s;
        }
        .btn-cancel:hover {
          background: #b4c9f1;
          color: #2a0516;
        }
        .pol-modal-bg {
          position: fixed; left: 0; top: 0; right: 0; bottom: 0;
          background: #2a0516bb; z-index: 2202;
          display: flex; align-items: center; justify-content: center;
        }
        .pol-modal, .pol-form {
          background: #fff;
          border-radius: 19px;
          box-shadow: 0 12px 38px 0 #2a051629;
          padding: 36px 23px 18px 23px;
          min-width: 320px; max-width: 420px; width: 98vw;
          max-height: 96vh; overflow-y: auto;
          position: relative;
        }
        .pol-form input, .pol-form select, .pol-form textarea {
          width: 100%; border: 1.5px solid #bfa4c4; border-radius: 9px;
          padding: 10px 12px; font-size: 1em; background: #fcfafd; margin-bottom: 7px;
        }
        .pol-form textarea { min-height: 48px; font-family: inherit; }
        .pol-close {
          position: absolute; top: 13px; right: 16px; font-size: 2.2rem; background: none;
          border: none; color: #c39; cursor: pointer; z-index: 10;
        }
        @media (max-width: 700px) {
          .pol-root { padding: 7vw 1vw; }
          .pol-grid { grid-template-columns: 1fr; gap: 15px; }
          .pol-modal, .pol-form { min-width: 0; max-width: 97vw; }
        }
      `}</style>
    </div>
  );
}
