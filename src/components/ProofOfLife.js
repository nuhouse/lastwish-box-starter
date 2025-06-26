import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import {
  collection, addDoc, query, where, orderBy, onSnapshot,
  updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "firebase/storage";
import { FaPlayCircle } from "react-icons/fa";

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
  const [fileUrl, setFileUrl] = useState(null);

  const fileInput = useRef();
  const videoRef = useRef();

  // Fetch proofs
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

  // Live video preview
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
            <button className="btn-danger" onClick={e => { e.stopPropagation(); handleDelete(proof.id, proof.mediaUrl); }}>Delete</button>
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
            <img src={proof.mediaUrl} alt="" style={{ maxWidth: 280, borderRadius: 15, margin: "10px 0" }} />
          )}
          {proof.type === "video" && proof.mediaUrl && (
            <video src={proof.mediaUrl} controls style={{ width: "100%", maxWidth: 420, borderRadius: 15, margin: "10px 0" }} />
          )}
          {proof.type === "audio" && proof.mediaUrl && (
            <audio src={proof.mediaUrl} controls style={{ width: 350, margin: "10px 0" }} />
          )}
        </div>
      </div>
    );
  }

  function renderForm() {
    const supportsMedia = !!(navigator.mediaDevices && window.MediaRecorder);
    const previewUrl = fileUrl || form.mediaUrl;

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
          {/* Recording UI */}
          {form.type === "video" && supportsMedia && !form.file && !recording && (
            <button type="button" className="btn-main" style={{ marginBottom: 7 }} onClick={() => startRecording("video")}>🎥 Record Video</button>
          )}
          {form.type === "audio" && supportsMedia && !form.file && !recording && (
            <button type="button" className="btn-main" style={{ marginBottom: 7 }} onClick={() => startRecording("audio")}>🎤 Record Audio</button>
          )}
          {recording && mediaStream && recordType === "video" && (
            <video ref={videoRef} autoPlay muted style={{ width: 200, marginBottom: 9, borderRadius: 10 }} playsInline />
          )}
          {recording && mediaStream && recordType === "audio" && (
            <div style={{ marginBottom: 9, color: "#8cade1", fontWeight: 500 }}>● Recording audio...</div>
          )}
          {recording && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: "#b11a25", fontWeight: 500 }}>● Recording...</span>
              <button type="button" className="btn-main" style={{ background: "#b11a25", marginLeft: 13 }} onClick={stopRecording}>Stop</button>
            </div>
          )}
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
          {!recording && form.type === "video" && previewUrl && (
            <div
              style={{
                position: "relative",
                width: 140,
                height: 90,
                marginBottom: 12,
                borderRadius: 12,
                overflow: "hidden",
                background: "#ddd",
                cursor: "pointer",
                boxShadow: "0 2px 12px #0001"
              }}
              onClick={() => setPreview({ ...form, mediaUrl: previewUrl, type: "video", note: form.note })}
            >
              <video
                src={previewUrl}
                style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
                preload="metadata"
                tabIndex={-1}
              />
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: 42, color: "#fff", background: "#0007",
                borderRadius: "50%", padding: 8
              }}>
                <FaPlayCircle />
              </div>
            </div>
          )}
          {!recording && form.type === "audio" && previewUrl && (
            <div style={{ display: "flex", alignItems: "center", marginBottom: 7, gap: 10 }}>
              <button
                type="button"
                className="btn-main"
                style={{
                  background: "#e97c13", borderRadius: "100%", width: 38, height: 38,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5em"
                }}
                onClick={() => setPreview({ ...form, mediaUrl: previewUrl, type: "audio", note: form.note })}
                aria-label="Play audio"
              >
                <FaPlayCircle />
              </button>
              <span style={{ color: "#645155", fontSize: 14 }}>Audio ready</span>
            </div>
          )}
          {!recording && form.type === "photo" && previewUrl && (
            <img src={previewUrl} alt="" style={{ width: 80, borderRadius: 10, marginBottom: 7, boxShadow: "0 2px 8px #0001" }} />
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
      <div className="pol-intro">
        Upload a text, photo, video, or audio entry—or record one live—to show you are safe and well. Only you and your trusted contacts can access these.
      </div>
      <button className="btn-main pol-add-btn" onClick={() => openForm()}>
        + New Proof of Life
      </button>
      <div className="pol-grid">
        {proofs.length === 0 ? (
          <div className="pol-empty">No proof entries yet.</div>
        ) : (
          proofs.map(proof => <ProofCard key={proof.id} proof={proof} />)
        )}
      </div>
      {showForm && renderForm()}
      {preview && <ProofPreview proof={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
