import React, { useState, useEffect } from "react";

export default function ProfilePage({ user, onUpdate, onLogout }) {
  const [edit, setEdit] = useState(false);
  const [profile, setProfile] = useState({
    username: user.username,
    name: user.name || "",
    phone: user.phone || "",
    address: user.address || "",
    email: user.email || "",
  });
  const [saving, setSaving] = useState(false);

  // Update form when user prop changes
  useEffect(() => {
    setProfile({
      username: user.username,
      name: user.name || "",
      phone: user.phone || "",
      address: user.address || "",
      email: user.email || "",
    });
    // REMOVE setEdit(false); from here!
  }, [user]);

  function handleChange(e) {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdate(profile);
      setEdit(false); // Set edit to false only after successful save
    } catch (e) {
      alert("Failed to update profile: " + e.message);
    }
    setSaving(false);
  }

  return (
    <div className="profile-page-wrapper">
      <div className="profile-card">
        <h2>Profile</h2>
        <form onSubmit={handleSave}>
          <div className="profile-row">
            <label>Username</label>
            <input value={profile.username} disabled />
          </div>
          <div className="profile-row">
            <label>Name</label>
            {edit ? (
              <input
                name="name"
                value={profile.name}
                onChange={handleChange}
                autoFocus
                required
              />
            ) : (
              <div className="profile-value">{profile.name || <span className="profile-placeholder">Not set</span>}</div>
            )}
          </div>
          <div className="profile-row">
            <label>Email</label>
            {edit ? (
              <input
                name="email"
                type="email"
                value={profile.email}
                onChange={handleChange}
                required
              />
            ) : (
              <div className="profile-value">{profile.email || <span className="profile-placeholder">Not set</span>}</div>
            )}
          </div>
          <div className="profile-row">
            <label>Phone</label>
            {edit ? (
              <input
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                maxLength={20}
              />
            ) : (
              <div className="profile-value">{profile.phone || <span className="profile-placeholder">Not set</span>}</div>
            )}
          </div>
          <div className="profile-row">
            <label>Address</label>
            {edit ? (
              <input
                name="address"
                value={profile.address}
                onChange={handleChange}
                maxLength={128}
              />
            ) : (
              <div className="profile-value">{profile.address || <span className="profile-placeholder">Not set</span>}</div>
            )}
          </div>

          <div className="profile-actions">
            {edit ? (
              <>
                <button className="btn-main" type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  className="btn-cancel"
                  type="button"
                  onClick={() => setEdit(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="btn-main"
                type="button"
                onClick={() => setEdit(true)}
              >
                Edit Profile
              </button>
            )}
          </div>
        </form>
        <button
          className="btn-danger profile-logout"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
