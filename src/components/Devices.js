import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import {
  collection, addDoc, query, where, orderBy, onSnapshot,
  updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "firebase/storage";

const PHONE_MAKES = [/* ... */];
const COMPUTER_MAKES = [/* ... */];

function getDeviceImageType(file) {
  if (!file) return null;
  if (file.type.startsWith("image/")) return "image";
  return null;
}

export default function Devices({ user }) {
  const [devices, setDevices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("phone");
  const [form, setForm] = useState(defaultForm("phone", user?.uid));
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [contacts, setContacts] = useState([]);
  const fileInput = useRef();

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "devices"),
      where("uid", "==", user.uid),
      orderBy("created", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setDevices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "contacts"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, snap => {
      setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  function defaultForm(type = "phone", uid = user?.uid) {
    return {
      uid,
      type,
      nickname: "",
      make: "",
      imageUrl: "",
      imageName: "",
      phoneNumber: "",
      phonePasscode: "",
      username: "",
      loginPassword: "",
      contact: "",
      notes: "",
      created: null
    };
  }

  function openForm(type = "phone", device = null) {
    setShowForm(true);
    setFormType(type);
    if (device) {
      setForm({ ...device });
      setEditingId(device.id);
    } else {
      setForm(defaultForm(type));
      setEditingId(null);
    }
    if (fileInput.current) fileInput.current.value = "";
  }
  function closeForm() {
    setShowForm(false);
    setForm(defaultForm(formType));
    setEditingId(null);
    if (fileInput.current) fileInput.current.value = "";
  }
  function handleInput(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }
  const [confirm, setConfirm] = useState("");
  const passValid = formType === "phone"
    ? (form.phonePasscode === confirm)
    : (form.loginPassword === confirm);

  async function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileType = getDeviceImageType(file);
      if (fileType === "image") {
        const imageName = `${user.uid}_${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `devices/${user.uid}/${imageName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        await new Promise((res, rej) => uploadTask.on("state_changed", null, rej, res));
        const imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
        setForm(f => ({ ...f, imageUrl, imageName }));
      }
    } finally {
      setUploading(false);
    }
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setUploading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "devices", editingId), {
          ...form,
          updated: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "devices"), {
          ...form,
          created: serverTimestamp()
        });
      }
      closeForm();
    } catch (e) {
      alert("Error saving device: " + e.message);
    }
    setUploading(false);
  }
  async function handleDelete() {
    if (!editingId) return;
    if (window.confirm("Delete this device?")) {
      if (form.imageUrl && form.imageName) {
        try {
          await deleteObject(ref(storage, `devices/${user.uid}/${form.imageName}`));
        } catch (e) { }
      }
      await deleteDoc(doc(db, "devices", editingId));
      closeForm();
    }
  }
  function isMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }
  function getContactName(id) {
    return contacts.find(c => c.id === id)?.name || "";
  }

  // --- Render Form (uses main.css only, no inline/modal styles)
  function renderForm() {
    const isPhone = formType === "phone";
    return (
      <form className="card" style={{ maxWidth: 400 }} onSubmit={handleSubmit}>
        <h3 style={{ marginBottom: 10 }}>
          {editingId ? "Edit Device" : "Add Device"}
        </h3>
        <input
          name="nickname"
          type="text"
          value={form.nickname}
          onChange={handleInput}
          required
          maxLength={40}
          placeholder="Device Nickname (e.g. Dad's MacBook, Work iPhone)"
        />
        <select
          name="make"
          value={form.make}
          onChange={handleInput}
          required
        >
          <option value="">Select Make</option>
          {(isPhone ? PHONE_MAKES : COMPUTER_MAKES).map(make =>
            <option key={make} value={make}>{make}</option>
          )}
        </select>
        {isPhone ? (
          <>
            <input
              name="phoneNumber"
              type="text"
              value={form.phoneNumber}
              onChange={handleInput}
              maxLength={18}
              placeholder="Phone Number"
            />
            <input
              name="phonePasscode"
              type="password"
              value={form.phonePasscode}
              onChange={handleInput}
              minLength={4}
              maxLength={18}
              autoComplete="new-password"
              placeholder="Phone Passcode"
            />
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              minLength={4}
              maxLength={18}
              autoComplete="new-password"
              required
              placeholder="Confirm Passcode"
            />
            {confirm && !passValid && (
              <span style={{ color: "#b40000", fontSize: 13 }}>
                Passcodes do not match.
              </span>
            )}
          </>
        ) : (
          <>
            <input
              name="username"
              type="text"
              value={form.username}
              onChange={handleInput}
              maxLength={24}
              placeholder="Computer Username"
            />
            <input
              name="loginPassword"
              type="password"
              value={form.loginPassword}
              onChange={handleInput}
              minLength={4}
              maxLength={30}
              autoComplete="new-password"
              placeholder="Computer Password"
            />
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              minLength={4}
              maxLength={30}
              autoComplete="new-password"
              required
              placeholder="Confirm Password"
            />
            {confirm && !passValid && (
              <span style={{ color: "#b40000", fontSize: 13 }}>
                Passwords do not match.
              </span>
            )}
          </>
        )}
        <select
          name="contact"
          value={form.contact}
          onChange={handleInput}
          required
        >
          <option value="">Select Contact</option>
          {contacts.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleInput}
          rows={3}
          maxLength={300}
          placeholder="Notes / Wishes (how to handle this device)"
        />
        <div>
          <span style={{ fontSize: 13, color: "#746e80" }}>Device Image</span>
          <input
            ref={fileInput}
            name="image"
            type="file"
            accept="image/*"
            onChange={handleImage}
            style={{ marginTop: 4 }}
          />
          {form.imageUrl && (
            <img
              src={form.imageUrl}
              alt="Device"
              style={{
                width: 80, height: 80, objectFit: "cover",
                display: "block", margin: "10px 0", borderRadius: 8
              }}
            />
          )}
        </div>
        <div style={{ marginTop: 15, display: "flex", gap: 10 }}>
          <button
            type="submit"
            className="btn-main"
            disabled={uploading || (confirm && !passValid)}
            style={{ flex: 1 }}
          >
            {editingId ? "Update" : "Add"}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn-danger"
              onClick={handleDelete}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            className="btn-cancel"
            onClick={closeForm}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <h2 style={{ margin: "18px 0" }}>Devices</h2>
      <div style={{ marginBottom: 18 }}>
        <button className="btn-main" onClick={() => openForm("phone")} style={{ marginRight: 13 }}>
          Add Phone
        </button>
        <button className="btn-main" onClick={() => openForm("computer")}>
          Add Computer
        </button>
      </div>
      <div className="page-grid">
        {devices.length === 0 ? (
          <div style={{ color: "#9d8ba7", textAlign: "center", fontSize: 18, padding: 16 }}>
            No devices yet.
          </div>
        ) : (
          devices.map(device => (
            <div className="card" key={device.id}>
              {/* Thumbnail */}
              {device.imageUrl
                ? <img src={device.imageUrl} alt="" style={{ width: 38, height: 38, objectFit: "cover", borderRadius: 8, border: "1px solid #e0d2d6" }} />
                : <span style={{ width: 38, height: 38, display: "inline-block", background: "#e8e1ee", borderRadius: 8 }} />}
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {device.nickname} <span style={{
                  fontWeight: 400,
                  fontSize: 14,
                  color: "#a56bee",
                  marginLeft: 7
                }}>
                  ({device.type.charAt(0).toUpperCase() + device.type.slice(1)})
                </span>
              </div>
              <div style={{ fontSize: 14, color: "#7a5d7a" }}>
                {device.make} — Contact: <span style={{ fontWeight: 600 }}>
                  {getContactName(device.contact)}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#8a8a99" }}>
                {device.notes}
              </div>
              <button
                onClick={() => openForm(device.type, device)}
                className="btn-main"
                style={{ marginTop: 10, fontSize: 15, padding: "6px 15px" }}
              >
                Edit
              </button>
            </div>
          ))
        )}
      </div>
      {/* Modal Form */}
      {showForm && (
        <div className="modal-overlay">
          <div className="card" style={{ maxWidth: 440, width: "96vw" }}>
            {renderForm()}
          </div>
        </div>
      )}
    </div>
  );
}
