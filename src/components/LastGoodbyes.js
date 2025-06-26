import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import {
  doc, getDoc, setDoc, deleteDoc
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "firebase/storage";

export default function LastGoodbyes({ user }) {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState("text");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [error, setError] = useState("");
  const fileInput = useRef();
  const videoRef = useRef();
  const chunksRef = useRef([]);

  // Load existing message
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const refDoc = doc(db, "lastGoodbyes", user.uid);
      const snap = await getDoc(refDoc);
      if (snap.exists()) {
        const data = snap.data();
        setMessage(data);
        setType(data.type || "text");
        setSubject(data.subject || "");
        setText(data.content || "");
        setMediaUrl(data.mediaUrl || "");
      }
      setLoading(false);
    })();
  }, [user]);

  // Preview file URL
  useEffect(() => {
    if (!file) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Handle type switch
  function handleTypeSwitch(val) {
    setType(val);
    setFile(null);
    setPreviewUrl("");
    setMediaUrl("");
    setText("");
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  // Handle file select
  function handleFile(e) {
    if (!e.target.files[0]) return;
    setFile(e.target.files[0]);
    setText("");
  }

  // --- Recording logic ---
  async function startRecording() {
    setError("");
    chunksRef.current = [];
    let constraints = type === "audio"
      ? { audio: true, video: false }
      : { audio: true, video: true };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);

      const options = type === "audio"
        ? { mimeType: "audio/webm" }
        : { mimeType: "video/webm;codecs=vp9,opus" };

      const rec = new window.MediaRecorder(stream, options);

      rec.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = () => {
        const blob = new Blob(
          chunksRef.current,
          { type: type === "audio" ? "audio/webm" : "video/webm" }
        );
        const f = new File([blob], `goodbye.${type}.webm`, { type: blob.type });
        setFile(f);
        setPreviewUrl(URL.createObjectURL(blob));
        setRecording(false);
        setMediaStream(null);
        chunksRef.current = [];
      };

      setMediaRecorder(rec);
      rec.start();
      setRecording(true);
    } catch (err) {
      setError("Recording error: " + err.message);
    }
  }

  function stopRecording() {
    if (mediaRecorder) mediaRecorder.stop();
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      setMediaStream(null);
    }
  }

  useEffect(() => {
    if (videoRef.current && recording && mediaStream && type === "video") {
      videoRef.current.srcObject = mediaStream;
    }
    return () => { if (videoRef.current) videoRef.current.srcObject = null; };
  }, [recording, mediaStream, type]);

  // Submit/save
  async function handleSave(e) {
    e.preventDefault();
    setError("");
    if (type === "text" && !text.trim()) return setError("Message is required.");
    if (["audio", "video"].includes(type) && !file && !mediaUrl)
      return setError("Please record or upload a file.");
    let uploadUrl = mediaUrl;
    if (["audio", "video"].includes(type) && file) {
      const ext = file.name.split(".").pop() || (type === "audio" ? "webm" : "webm");
      const fname = `${user.uid}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, `lastGoodbyes/${user.uid}/${fname}`);
      await uploadBytesResumable(storageRef, file);
      uploadUrl = await getDownloadURL(storageRef);
    }
    const refDoc = doc(db, "lastGoodbyes", user.uid);
    await setDoc(refDoc, {
      uid: user.uid,
      subject: subject,
      type,
      content: type === "text" ? text : "",
      mediaUrl: type === "text" ? "" : uploadUrl,
      updated: new Date(),
    });
    setEditing(false);
    setMessage({
      subject, type, content: type === "text" ? text : "", mediaUrl: type === "text" ? "" : uploadUrl
    });
    setFile(null); setPreviewUrl("");
  }

  // Delete
  async function handleDelete() {
    if (!window.confirm("Delete your Last Goodbye?")) return;
    const refDoc = doc(db, "lastGoodbyes", user.uid);
    if (message?.mediaUrl) {
      try {
        // Parse the file path from the download URL
        const url = new URL(message.mediaUrl);
        const pathname = url.pathname; // /v0/b/xxx.appspot.com/o/lastGoodbyes%2Fuid%2Ffilename.webm
        let fullPath = decodeURIComponent(pathname.split("/o/")[1] || "");
        // Remove any query params (just in case)
        if (fullPath.includes("?")) fullPath = fullPath.split("?")[0];
        await deleteObject(ref(storage, fullPath));
      } catch (err) {
        // Ignore file not found
      }
    }
    await deleteDoc(refDoc);
    setMessage(null);
    setEditing(true);
    setSubject("");
    setText("");
    setType("text");
    setFile(null);
    setMediaUrl("");
    setPreviewUrl("");
  }

  // Start editing
  function startEdit() {
    setEditing(true);
    setType(message?.type || "text");
    setSubject(message?.subject || "");
    setText(message?.content || "");
    setMediaUrl(message?.mediaUrl || "");
    setFile(null);
    setPreviewUrl("");
  }

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;

  return (
    <div className="card" style={{ maxWidth: 600, margin: "40px auto" }}>
      <h2>Your Last Goodbye</h2>
      <div style={{ color: "#8cade1", marginBottom: 12 }}>
        This message will be sent to your trusted contacts when the time comes.
      </div>
      {!editing && message ? (
        <div>
          {message.subject && <div style={{ fontWeight: 600, marginBottom: 7 }}>Subject: {message.subject}</div>}
          <div style={{ margin: "12px 0" }}>
            {message.type === "text" && (
              <div style={{ whiteSpace: "pre-line", fontSize: 17, color: "#2a0516", fontWeight: 500 }}>
                {message.content}
              </div>
            )}
            {message.type === "audio" && message.mediaUrl && (
              <audio src={message.mediaUrl} controls style={{ width: 240 }} />
            )}
            {message.type === "video" && message.mediaUrl && (
              <video src={message.mediaUrl} controls style={{ maxWidth: 340, borderRadius: 13 }} playsInline />
            )}
          </div>
          <button className="btn-main" style={{ marginRight: 12 }} onClick={startEdit}>Edit</button>
          <button className="btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <input
            type="text"
            className="input"
            placeholder="Subject (optional)"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <button
              type="button"
              className={type === "text" ? "btn-main" : "btn-cancel"}
              style={{ flex: 1 }}
              onClick={() => handleTypeSwitch("text")}
            >Text</button>
            <button
              type="button"
              className={type === "audio" ? "btn-main" : "btn-cancel"}
              style={{ flex: 1 }}
              onClick={() => handleTypeSwitch("audio")}
            >Audio</button>
            <button
              type="button"
              className={type === "video" ? "btn-main" : "btn-cancel"}
              style={{ flex: 1 }}
              onClick={() => handleTypeSwitch("video")}
            >Video</button>
          </div>

          {type === "text" && (
            <textarea
              className="input"
              rows={5}
              placeholder="Write your final message here…"
              value={text}
              onChange={e => setText(e.target.value)}
              required
            />
          )}

          {["audio", "video"].includes(type) && (
            <div style={{ marginBottom: 10 }}>
              {!file && !mediaUrl && !recording && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="btn-main"
                    onClick={startRecording}
                  >{type === "audio" ? "🎤 Record Audio" : "🎥 Record Video"}</button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept={type === "audio" ? "audio/*" : "video/*"}
                    onChange={handleFile}
                    style={{ flex: 1 }}
                  />
                </div>
              )}
              {/* Live preview for video recording */}
              {recording && type === "video" && (
                <video ref={videoRef} autoPlay muted style={{ width: 220, borderRadius: 11, margin: "9px 0" }} playsInline />
              )}
              {recording && type === "audio" && (
                <div style={{ color: "#b11a25", fontWeight: 500, margin: "10px 0" }}>● Recording…</div>
              )}
              {recording && (
                <button type="button" className="btn-cancel" style={{ marginTop: 6 }} onClick={stopRecording}>Stop</button>
              )}
              {/* Preview upload or recorded file */}
              {!recording && (file || mediaUrl || previewUrl) && (
                <div style={{ margin: "9px 0" }}>
                  {type === "audio" && (
                    <audio src={previewUrl || mediaUrl} controls style={{ width: 220 }} />
                  )}
                  {type === "video" && (
                    <video src={previewUrl || mediaUrl} controls style={{ width: 240, borderRadius: 10 }} playsInline />
                  )}
                </div>
              )}
            </div>
          )}

          {(type === "text" && text.trim()) ||
           (["audio", "video"].includes(type) && (previewUrl || mediaUrl)) ? (
            <div className="card" style={{ background: "#f9f7fc", margin: "14px 0", border: "1px solid #8cade1" }}>
              <div style={{ color: "#8cade1", fontWeight: 600, marginBottom: 5 }}>Preview:</div>
              {type === "text" && (
                <div style={{ whiteSpace: "pre-line", color: "#2a0516", fontWeight: 500 }}>{text}</div>
              )}
              {type === "audio" && (previewUrl || mediaUrl) && (
                <audio src={previewUrl || mediaUrl} controls style={{ width: 220 }} />
              )}
              {type === "video" && (previewUrl || mediaUrl) && (
                <video src={previewUrl || mediaUrl} controls style={{ width: 240, borderRadius: 10 }} playsInline />
              )}
            </div>
          ) : null}

          <button className="btn-main" type="submit" style={{ marginRight: 12 }}>
            Save
          </button>
          {message && <button className="btn-cancel" type="button" onClick={() => setEditing(false)}>Cancel</button>}
          {error && <div style={{ color: "#980000", marginTop: 10 }}>{error}</div>}
        </form>
      )}
    </div>
  );
}
