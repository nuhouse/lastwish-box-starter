import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import {
  collection, addDoc, query, where, orderBy, onSnapshot,
  updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "firebase/storage";

// --- Phone and Computer Makes ---
const PHONE_MAKES = [
  "Apple", "Samsung", "Google", "Huawei", "Xiaomi", "OnePlus", "Sony",
  "Nokia", "Motorola", "Oppo", "Vivo", "LG", "Realme", "Asus", "Honor", "Other"
];
const COMPUTER_MAKES = [
  "Apple", "Dell", "HP", "Lenovo", "Asus", "Acer", "Microsoft", "Razer",
  "MSI", "Samsung", "Toshiba", "Huawei", "LG", "Sony", "Other"
];

// --- Utilities ---
function getDeviceImageType(file) {
  if (!file) return null;
  if (file.type.startsWith("image/")) return "image";
  return null;
}

export default function Devices({ user }) {
  const [devices, setDevices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("phone"); // phone | computer
  const [form, setForm] = useState(defaultForm("phone", user?.uid));
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [contacts, setContacts] = useState([]);
  const fileInput = useRef();

  // --- Fetch devices
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

  // --- Fetch contacts for dropdown
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "contacts"),
      where("uid", "==", user.uid)
    );
    const unsub = onSnapshot(q, snap => {
      setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  // --- Helpers for Form Defaults
  function defaultForm(type = "phone", uid = user?.uid) {
    return {
      uid,
      type,
      nickname: "",
      make: "",
      imageUrl: "",
      imageName: "",
      // Phone
      phoneNumber: "",
      phonePasscode: "",
      // Computer
      username: "",
      loginPassword: "",
      // Both
      contact: "",
      notes: "",
      created: null
    };
  }

  // --- Show Form (Create/Edit)
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

  // --- Handle input changes
  function handleInput(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  // --- Confirm Password/Passcode check
  const [confirm, setConfirm] = useState("");
  const passValid = formType === "phone"
    ? (form.phonePasscode === confirm)
    : (form.loginPassword === confirm);

  // --- Handle Image Upload (camera or file)
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

  // --- Save Device (add or update)
  async function handleSubmit(e) {
    e.preventDefault();
    setUploading(true);
    try {
      if (editingId) {
        // Update
        await updateDoc(doc(db, "devices", editingId), {
          ...form,
          updated: serverTimestamp()
        });
      } else {
        // Add
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

  // --- Delete Device
  async function handleDelete() {
    if (!editingId) return;
    if (window.confirm("Delete this device?")) {
      if (form.imageUrl && form.imageName) {
        try {
          await deleteObject(ref(storage, `devices/${user.uid}/${form.imageName}`));
        } catch (e) { /* ignore */ }
      }
      await deleteDoc(doc(db, "devices", editingId));
      closeForm();
    }
  }

  // --- Show camera only if on mobile
  function isMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  // --- Render Form
  function renderForm() {
    const isPhone = formType === "phone";
    return (
      <div className="modal-overlay">
        <form
          className="device-form"
          onSubmit={handleSubmit}
          style={{ minWidth: 310, maxWidth: 370 }}
        >
          <h3 style={{ marginBottom: 10 }}>
            {editingId ? "Edit Device" : "Add Device"}
          </h3>
          {/* Nickname */}
          <label>Device Nickname
            <input
              name="nickname"
              type="text"
              value={form.nickname}
              onChange={handleInput}
              required
              maxLength={40}
              placeholder="e.g. Dad's MacBook, Work iPhone"
            />
          </label>
          {/* Make */}
          <label>Make
            <select
              name="make"
              value={form.make}
              onChange={handleInput}
              required
            >
              <option value="">Select...</option>
              {(isPhone ? PHONE_MAKES : COMPUTER_MAKES).map(make =>
                <option key={make} value={make}>{make}</option>
              )}
            </select>
          </label>
          {/* Phone/Computer Specific */}
          {isPhone ? (
            <>
              <label>Phone Number
                <input
                  name="phoneNumber"
                  type="text"
                  value={form.phoneNumber}
                  onChange={handleInput}
                  maxLength={18}
                />
              </label>
              <label>Phone Passcode
                <input
                  name="phonePasscode"
                  type="password"
                  value={form.phonePasscode}
                  onChange={handleInput}
                  minLength={4}
                  maxLength={18}
                  autoComplete="new-password"
                />
              </label>
              <label>Confirm Passcode
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  minLength={4}
                  maxLength={18}
                  autoComplete="new-password"
                  required
                />
                {confirm && !passValid && (
                  <span style={{ color: "#b40000", fontSize: 13 }}>
                    Passcodes do not match.
                  </span>
                )}
              </label>
            </>
          ) : (
            <>
              <label>Username
                <input
                  name="username"
                  type="text"
                  value={form.username}
                  onChange={handleInput}
                  maxLength={24}
                />
              </label>
              <label>Login Password
                <input
                  name="loginPassword"
                  type="password"
                  value={form.loginPassword}
                  onChange={handleInput}
                  minLength={4}
                  maxLength={30}
                  autoComplete="new-password"
                />
              </label>
              <label>Confirm Password
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  minLength={4}
                  maxLength={30}
                  autoComplete="new-password"
                  required
                />
                {confirm && !passValid && (
                  <span style={{ color: "#b40000", fontSize: 13 }}>
                    Passwords do not match.
                  </span>
                )}
              </label>
            </>
          )}
          {/* Contact */}
          <label>Contact
            <select
              name="contact"
              value={form.contact}
              onChange={handleInput}
              required
            >
              <option value="">Select contact...</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          {/* Notes */}
          <label>Notes
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleInput}
              rows={3}
              maxLength={300}
              style={{ resize: "vertical" }}
            />
          </label>
          {/* Image */}
          <label>Device Image
            {isMobile() ? (
              <input
                ref={fileInput}
                name="image"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImage}
              />
            ) : (
              <input
                ref={fileInput}
                name="image"
                type="file"
                accept="image/*"
                onChange={handleImage}
              />
            )}
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
          </label>
          <div style={{ marginTop: 15, display: "flex", gap: 10 }}>
            <button
              type="submit"
              className="btn"
              disabled={uploading || (confirm && !passValid)}
              style={{ background: "#2a0516", color: "#fff", flex: 1 }}
            >
              {editingId ? "Update" : "Add"}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn"
                style={{ background: "#9a1818", color: "#fff" }}
                onClick={handleDelete}
              >
                Delete
              </button>
            )}
            <button
              type="button"
              className="btn"
              style={{ background: "#ccc", color: "#222" }}
              onClick={closeForm}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- Render Devices List
  function getContactName(id) {
    return contacts.find(c => c.id === id)?.name || "";
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 10px 35px 10px" }}>
      <h2 style={{ margin: "16px 0 18px 0" }}>Devices</h2>
      <div style={{ marginBottom: 18 }}>
        <button
          className="btn"
          onClick={() => openForm("phone")}
          style={{ marginRight: 13, background: "#2a0516", color: "#fff" }}
        >
          Add Phone
        </button>
        <button
          className="btn"
          onClick={() => openForm("computer")}
          style={{ background: "#2a0516", color: "#fff" }}
        >
          Add Computer
        </button>
      </div>
      <div style={{
        border: "1px solid #eee",
        borderRadius: 12,
        padding: 12,
        background: "#faf8fb"
      }}>
        {devices.length === 0 ? (
          <div style={{ color: "#9d8ba7", textAlign: "center", fontSize: 18, padding: 16 }}>
            No devices yet.
          </div>
        ) : (
          <div>
            {devices.map(device => (
              <div key={device.id} style={{
                display: "flex", alignItems: "center", gap: 11,
                borderBottom: "1px solid #f1e8ee",
                padding: "11px 0"
              }}>
                {/* Thumbnail */}
                {device.imageUrl
                  ? <img src={device.imageUrl} alt="" style={{ width: 38, height: 38, objectFit: "cover", borderRadius: 8, border: "1px solid #e0d2d6" }} />
                  : <span style={{ width: 38, height: 38, display: "inline-block", background: "#e8e1ee", borderRadius: 8 }} />}
                {/* Nickname, Type, Make */}
                <div style={{ flex: 1 }}>
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
                </div>
                {/* Edit */}
                <button
                  onClick={() => openForm(device.type, device)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 5,
                    cursor: "pointer"
                  }}
                  title="Edit"
                >
                  <span role="img" aria-label="edit" style={{ fontSize: 20 }}>✏️</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {showForm && (
  <div className="modal-overlay">
    <div className="device-modal-box">
      <form className="device-form" onSubmit={handleSubmit}>
        {/* ...your fields here... */}
      </form>
    </div>
  </div>
)}
<style>{`
  .modal-overlay {
    position: fixed;
    left: 0; top: 0; right: 0; bottom: 0;
    background: #26192679;
    z-index: 1202;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .device-modal-box {
    background: #fff;
    border-radius: 18px;
    padding: 20px;
    max-width: 480px;
    width: 96vw;
    box-shadow: 0 8px 36px 0 #2a05162a;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-height: 96vh;
    overflow-y: auto;
  }
  .device-form {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .device-form label {
    display: block;
    margin-bottom: 12px;
    font-weight: 500;
  }
  .device-form input, .device-form select, .device-form textarea {
    width: 100%;
    margin-top: 5px;
    margin-bottom: 6px;
    border: 1px solid #cdbad7;
    border-radius: 6px;
    padding: 7px 9px;
    font-size: 1em;
    background: #fff;
  }
  .device-form textarea { min-height: 38px; }
  .device-form .btn {
    border: none;
    border-radius: 5px;
    padding: 9px 15px;
    font-weight: 600;
    cursor: pointer;
    margin-right: 3px;
  }
`}</style>

    </div>
  );
}
