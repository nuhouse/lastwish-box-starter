import React, { useState, useRef, useEffect } from "react";
import { db, storage } from "../firebase";
import {
  collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "firebase/storage";

export default function Videos({ user }) {
  const [videos, setVideos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recording, setRecording] = useState(false);
  const [chunks, setChunks] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const videoRef = useRef();

  // Modal: prevent body scroll when open
  useEffect(() => {
    if (showForm) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [showForm]);

  // Fetch videos from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "videos"),
      where("uid", "==", user.uid),
      orderBy("created", "desc")
    );
    return onSnapshot(q, snap => {
      setVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user]);

  // Cleanup preview URL
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function stopMediaTracks() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    setMediaRecorder(null);
    setRecording(false);
    setChunks([]);
  }

  // Recording logic
  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMediaStream(stream);
      const recorder = new window.MediaRecorder(stream, { mimeType: "video/webm" });
      let chunksLocal = [];
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksLocal.push(e.data);
      };
      recorder.onstop = () => {
        if (chunksLocal.length === 0) {
          setError("Recording failed: no data captured.");
          return;
        }
        const blob = new Blob(chunksLocal, { type: "video/webm" });
        setFile(new File([blob], `video_${Date.now()}.webm`, { type: "video/webm" }));
        setPreviewUrl(URL.createObjectURL(blob));
        stopMediaTracks();
      };
      setChunks([]);
      setMediaRecorder(recorder);
      setRecording(true);
      recorder.start();
    } catch (err) {
      setError("Could not access camera/mic: " + err.message);
    }
  }

  function stopRecording() {
    if (mediaRecorder) mediaRecorder.stop();
  }

  function openForm(existing) {
    setShowForm(true);
    setEditId(existing ? existing.id : null);
    setNote(existing ? existing.note : "");
    setFile(null);
    setPreviewUrl(existing && existing.mediaUrl ? existing.mediaUrl : null);
    stopMediaTracks();
  }

  function closeForm() {
    setShowForm(false);
    setNote("");
    setFile(null);
    setPreviewUrl(null);
    setEditId(null);
    stopMediaTracks();
    setError("");
  }

  function handleFile(e) {
    if (e.target.files[0]) setFile(e.target.files[0]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setUploading(true);
    let mediaUrl = previewUrl;
    try {
      if (file) {
        const filename = `${user.uid}_${Date.now()}.webm`;
        const storageRef = ref(storage, `videos/${user.uid}/${filename}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        await new Promise((res, rej) => uploadTask.on("state_changed", null, rej, res));
        mediaUrl = await getDownloadURL(uploadTask.snapshot.ref);
      }
      const payload = {
        uid: user.uid,
        note,
        mediaUrl,
        created: editId ? undefined : serverTimestamp(),
        updated: serverTimestamp(),
      };
      if (editId) {
        await updateDoc(doc(db, "videos", editId), payload);
      } else {
        await addDoc(collection(db, "videos"), payload);
      }
      closeForm();
    } catch (e) {
      setError("Failed to save: " + e.message);
    }
    setUploading(false);
  }

  async function handleDelete(id, mediaUrl) {
    if (!window.confirm("Delete this video?")) return;
    try {
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

  useEffect(() => {
    if (videoRef.current && recording && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [recording, mediaStream]);

  function renderForm() {
    return (
      <div className="modal-overlay" onClick={closeForm}>
        <div
          className="card"
          style={{
            maxWidth: 410,
            width: "96vw",
            zIndex: 2022,
            position: "relative"
          }}
          onClick={e => e.stopPropagation()}
        >
          <h3 style={{ marginBottom: 10 }}>{editId ? "Edit Video" : "Record / Upload Video"}</h3>
          <textarea
            placeholder="Add a note for this video (optional)..."
            rows={2}
            className="input"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          {!file && !recording && (
            <>
              <button type="button" className="btn-main" style={{ marginBottom: 12 }} onClick={startRecording}>🎥 Record from Camera</button>
              <input type="file" accept="video/*" onChange={handleFile} style={{ marginBottom: 12 }} />
            </>
          )}
          {recording && mediaStream && (
            <div style={{ marginBottom: 13 }}>
              <video ref={videoRef} autoPlay muted style={{ width: 220, borderRadius: 9, marginBottom: 5 }} playsInline />
              <div>
                <span style={{ color: "#b11a25", fontWeight: 500 }}>● Recording...</span>
                <button type="button" className="btn-main" style={{ marginLeft: 13 }} onClick={stopRecording}>Stop</button>
              </div>
            </div>
          )}
          {file && !recording && (
            <video src={previewUrl} controls style={{ width: 220, borderRadius: 9, marginBottom: 7 }} />
          )}
          <div style={{ display: "flex", gap: 9, marginTop: 8 }}>
            <button className="btn-main" type="submit" disabled={uploading}>{editId ? "Update" : "Save"}</button>
            <button type="button" className="btn-cancel" onClick={closeForm}>Cancel</button>
          </div>
          {error && <div style={{ color: "#980000", marginTop: 11 }}>{error}</div>}
        </div>
        {/* Modal background style */}
        <style>{`
          .modal-overlay {
            position: fixed;
            left: 0; top: 0; right: 0; bottom: 0;
            background: #24122785;
            z-index: 2020;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 1100, margin: "40px auto" }}>
      <h2>Videos</h2>
      <div style={{ color: "#7a6888", maxWidth: 600, marginBottom: 15 }}>
        Record or upload personal videos to be kept safe for your loved ones.
      </div>
      <button className="btn-main" style={{ marginBottom: 24 }} onClick={() => openForm()}>+ New Video</button>
      
      <div className="page-grid">
        {videos.length === 0 ? (
          <div style={{ color: "#a697b8", padding: 25, textAlign: "center" }}>No videos yet.</div>
        ) : (
          videos.map(v => (
            <div key={v.id} className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 240 }}>
              <video src={v.mediaUrl} controls style={{ width: "100%", maxWidth: 230, borderRadius: 11, marginBottom: 8 }} />
              <div style={{ color: "#654e7a", fontWeight: 500, marginBottom: 6, textAlign: "center" }}>{v.note}</div>
              <div style={{ fontSize: "13px", color: "#8cade1", marginBottom: 3 }}>
                {v.created?.toDate ? v.created.toDate().toLocaleString() : ""}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-main" style={{ fontSize: "0.96em", padding: "5px 13px" }} onClick={() => openForm(v)}>Edit</button>
                <button className="btn-danger" style={{ fontSize: "0.96em", padding: "5px 13px" }} onClick={() => handleDelete(v.id, v.mediaUrl)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
      {showForm && renderForm()}
    </div>
  );
}
