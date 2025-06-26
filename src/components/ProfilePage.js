// src/components/ProfilePage.js
import React from "react";

export default function ProfilePage({ user, onLogout, onPasswordReset }) {
  return (
    <div className="card" style={{ maxWidth: 420, margin: "30px auto" }}>
      <h2>Your Profile</h2>
      <div style={{ marginBottom: 15 }}>
        <div style={{ fontWeight: 600, fontSize: 18 }}>
          {user.displayName || user.name || user.email.split("@")[0]}
        </div>
        <div style={{ color: "#a67ad5", fontSize: 15 }}>{user.email}</div>
      </div>
      <button className="btn-main" style={{ marginBottom: 13 }} onClick={onPasswordReset}>
        Reset Password
      </button>
      <button className="btn-danger" onClick={onLogout}>
        Logout
      </button>
    </div>
  );
}
