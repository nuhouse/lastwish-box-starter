// ProofOfLife.js
import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import {
  collection, addDoc, query, where, orderBy, onSnapshot,
  updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "firebase/storage";

// Default form state helper
function defaultForm(uid) {
  return {
    uid,
    type: "text", // text, photo, video, audio
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

  // Modal open/close logic
  function openForm(proof = null) {
    setShowForm(true);
    setRecording(false);
    stopMediaTracks();
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

  // Handle input and file selection
  function handleInput(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (name === "type") {
      setForm(f => ({ ...f, file: null, mediaUrl: "" }));
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  function handleFile(e) {
    setForm(f => ({ ...f, file: e.target.files[0] }));
  }

  // Handle webcam/mic recording
  async function startRecording(type) {
    setRecordType(type);
    setChunks([]);
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
        setForm(f => ({ ...f, file: new File([blob], `proof.${type}.webm`, { type: blob.type }) }));
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

  // Upload to Firebase Storage and save to Firestore
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

  // Delete entry
  async function handleDelete(id, mediaUrl) {
    if (!window.confirm("Delete this proof of life entry?")) return;
    try {
      if (mediaUrl) {
        // Remove from storage
        const segments = mediaUrl.split("/");
        const name = decodeURIComponent(segments[segments.length - 1].split("?")[0]);
        await deleteObject(ref(storage, `proofOfLife/${user.uid}/${name}`)).catch(() => {});
      }
      await deleteDoc(doc(db, "proofOfLife", id));
    } catch (e) {
      alert("Failed to delete: " + e.message);
    }
  }

  // UI for each proof entry
  function ProofCard({ proof }) {
    const typeIcon = proof.type === "photo"
      ? "🖼️" : proof.type === "video"
      ? "🎥" : proof.type === "audio"
      ? "🎤" : "✏️";
    return (
      <div className="proof-card" onClick={() => setPreview(proof)}>
        <div className="proof-icon">{typeIcon}</div>
        <div className="proof-info">
          <div className="proof-date">
            {proof.created?.toDate
              ? proof.created.toDate().toLocaleString()
              : ""}
          </div>
          <div className="proof-note">{proof.note?.slice(0, 65)}{proof.note?.length > 65 ? "..." : ""}</div>
          <div className="proof-type">{proof.type}</div>
          <div className="proof-actions">
            <button className="btn" onClick={e => { e.stopPropagation(); openForm(proof); }}>Edit</button>
            <button className="btn btn-danger" onClick={e => { e.stopPropagation(); handleDelete(proof.id, proof.mediaUrl); }}>Delete</button>
          </div>
        </div>
      </div>
    );
  }

  // Media preview modal
  function ProofPreview({ proof, onClose }) {
    return (
      <div className="modal-overlay">
        <div className="proof-preview-modal">
          <button className="modal-close" onClick={onClose}>&times;</button>
          <h3>Proof of Life</h3>
          <div style={{ color: "#7c6e8a", marginBottom: 12 }}>
            {proof.created?.toDate ? proof.created.toDate().toLocaleString() : ""}
          </div>
          <div style={{ marginBottom: 13, fontWeight: 500 }}>{proof.note}</div>
          {proof.type === "photo" && proof.mediaUrl && (
            <img src={proof.mediaUrl} alt="" style={{ maxWidth: 220, borderRadius: 12, margin: "10px 0" }} />
          )}
          {proof.type === "video" && proof.mediaUrl && (
            <video src={proof.mediaUrl} controls style={{ maxWidth: 320, borderRadius: 12, margin: "10px 0" }} />
          )}
          {proof.type === "audio" && proof.mediaUrl && (
            <audio src={proof.mediaUrl} controls style={{ width: 250, margin: "10px 0" }} />
          )}
        </div>
      </div>
    );
  }

  // Modal for adding/editing/recording
  function renderForm() {
    const supportsMedia = !!(navigator.mediaDevices && window.MediaRecorder);
    return (
      <div className="modal-overlay">
        <form className="proof-form" onSubmit={handleSubmit}>
          <h3 style={{ marginBottom: 9 }}>{editingId ? "Edit Proof" : "New Proof of Life"}</h3>
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
          />
          {/* Media record/upload for video/audio */}
          {form.type === "video" && supportsMedia && !form.file && !recording && (
            <button
              type="button"
              className="btn"
              style={{ background: "#e97c13", color: "#fff", marginBottom: 7 }}
              onClick={() => startRecording("video")}
            >
              🎥 Record Video
            </button>
          )}
          {form.type === "audio" && supportsMedia && !form.file && !recording && (
            <button
              type="button"
              className="btn"
              style={{ background: "#e97c13", color: "#fff", marginBottom: 7 }}
              onClick={() => startRecording("audio")}
            >
              🎤 Record Audio
            </button>
          )}
          {recording && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: "#b11a25", fontWeight: 500 }}>● Recording...</span>
              <button
                type="button"
                className="btn"
                style={{ background: "#b11a25", color: "#fff", marginLeft: 13 }}
                onClick={stopRecording}
              >Stop</button>
            </div>
          )}
          {/* Show live video during recording */}
          {mediaStream && recordType === "video" && (
            <video
              ref={videoRef}
              autoPlay
              muted
              style={{ width: 180, marginBottom: 9, borderRadius: 10 }}
              srcObject={mediaStream}
              onCanPlay={() => {
                if (videoRef.current && mediaStream)
                  videoRef.current.srcObject = mediaStream;
              }}
            />
          )}
          {/* Upload field for any media type */}
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
          {/* Preview of selected/recorded media */}
          {form.file && form.type === "photo" && (
            <img src={URL.createObjectURL(form.file)} alt="" style={{ width: 54, borderRadius: 7, marginBottom: 7 }} />
          )}
          {form.file && form.type === "video" && (
            <video src={URL.createObjectURL(form.file)} controls style={{ width: 80, borderRadius: 7, marginBottom: 7 }} />
          )}
          {form.file && form.type === "audio" && (
            <audio src={URL.createObjectURL(form.file)} controls style={{ width: 80, marginBottom: 7 }} />
          )}
          <div style={{ display: "flex", gap: 9, marginTop: 9 }}>
            <button className="btn" style={{ background: "#2a0516", color: "#fff", flex: 1 }} disabled={uploading || recording}>{editingId ? "Update" : "Add"}</button>
            <button type="button" className="btn" style={{ background: "#ccc", color: "#222" }} onClick={closeForm}>Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  // Main UI
  return (
    <div className="proof-root">
      <h2>Proof of Life</h2>
      <div style={{ color: "#7a6888", maxWidth: 600, marginBottom: 15 }}>
        Upload a text, photo, video, or audio entry—or record one live—to show you are safe and well. Only you and your trusted contacts can access these.
      </div>
      <button className="btn" style={{ background: "#e97c13", color: "#fff", marginBottom: 28 }} onClick={() => openForm()}>New Proof of Life</button>
      <div className="proof-grid">
        {proofs.length === 0 ? (
          <div style={{ color: "#a697b8", padding: 25, textAlign: "center" }}>No proof entries yet.</div>
        ) : (
          proofs.map(proof => <ProofCard key={proof.id} proof={proof} />)
        )}
      </div>
      {showForm && renderForm()}
      {preview && <ProofPreview proof={preview} onClose={() => setPreview(null)} />}
      {/* (Styles as needed, see original for more) */}
    </div>
  );
}
