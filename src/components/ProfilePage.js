import React, { useState } from "react";

// Pass in the 'user' object and a logout handler as props
export default function ProfileSidebar({ user, onUpdate, onLogout }) {
  const [edit, setEdit] = useState(false);
  const [profile, setProfile] = useState({
    username: user.username,
    name: user.name || "",
    phone: user.phone || "",
    address: user.address || "",
    email: user.email || "",
  });
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Call parent handler to update in DB
      await onUpdate(profile);
      setEdit(false);
    } catch (e) {
      alert("Failed to update profile: " + e.message);
    }
    setSaving(false);
  }

  return (
    <div className="sidebar-profile">
      <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 17 }}>Profile</div>
      <div style={{ marginBottom: 8, fontSize: 15 }}>
        <span style={{ color: "#8cade1" }}>Username:</span><br />
        <span>{profile.username}</span>
      </div>
      {edit ? (
        <>
          <label>
            Name:
            <input
              name="name"
              value={profile.name}
              onChange={handleChange}
              style={{ width: "100%" }}
              autoFocus
            />
          </label>
          <label>
            Email:
            <input
              name="email"
              type="email"
              value={profile.email}
              onChange={handleChange}
              style={{ width: "100%" }}
            />
          </label>
          <label>
            Phone:
            <input
              name="phone"
              value={profile.phone}
              onChange={handleChange}
              style={{ width: "100%" }}
            />
          </label>
          <label>
            Address:
            <input
              name="address"
              value={profile.address}
              onChange={handleChange}
              style={{ width: "100%" }}
            />
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="btn-main" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button className="btn-cancel" onClick={() => setEdit(false)} disabled={saving}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 15, marginBottom: 4 }}>
            <span style={{ color: "#8cade1" }}>Name:</span> {profile.name || <span style={{ color: "#888" }}>Not set</span>}
          </div>
          <div style={{ fontSize: 15, marginBottom: 4 }}>
            <span style={{ color: "#8cade1" }}>Email:</span> {profile.email || <span style={{ color: "#888" }}>Not set</span>}
          </div>
          <div style={{ fontSize: 15, marginBottom: 4 }}>
            <span style={{ color: "#8cade1" }}>Phone:</span> {profile.phone || <span style={{ color: "#888" }}>Not set</span>}
          </div>
          <div style={{ fontSize: 15, marginBottom: 8 }}>
            <span style={{ color: "#8cade1" }}>Address:</span> {profile.address || <span style={{ color: "#888" }}>Not set</span>}
          </div>
          <button className="btn-main" style={{ width: "100%" }} onClick={() => setEdit(true)}>
            Edit Profile
          </button>
        </>
      )}
      <button
        className="btn-danger"
        style={{
          marginTop: 16,
          width: "100%",
          padding: "8px 0"
        }}
        onClick={onLogout}
      >
        Logout
      </button>
    </div>
  );
}
