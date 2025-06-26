import React, { useState } from "react";
import { getAuth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";

export default function ChangePasswordModal({ open, onClose }) {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const auth = getAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (newPass.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPass !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      const cred = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPass);
      setSuccess("Password updated successfully!");
      setCurrent(""); setNewPass(""); setConfirm("");
    } catch (e) {
      setError(e.message || "Password update failed.");
    }
    setLoading(false);
  }

  if (!open) return null;
  return (
    <div className="modal-bg">
      <form className="modal-card" onSubmit={handleSubmit}>
        <h3>Change Password</h3>
        <label>
          Current Password
          <input
            type="password"
            value={current}
            autoFocus
            required
            onChange={e => setCurrent(e.target.value)}
          />
        </label>
        <label>
          New Password
          <input
            type="password"
            value={newPass}
            required
            minLength={6}
            onChange={e => setNewPass(e.target.value)}
          />
        </label>
        <label>
          Confirm New Password
          <input
            type="password"
            value={confirm}
            required
            onChange={e => setConfirm(e.target.value)}
          />
        </label>
        {error && <div className="modal-error">{error}</div>}
        {success && <div className="modal-success">{success}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button className="btn-main" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Update Password"}
          </button>
          <button className="btn-cancel" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
        </div>
      </form>
      <style>{`
        .modal-bg {
          position: fixed;
          z-index: 1500;
          inset: 0;
          background: rgba(28,15,30,0.43);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-card {
          background: #fff;
          color: #23162a;
          border-radius: 16px;
          padding: 26px 22px 19px 22px;
          min-width: 330px;
          max-width: 96vw;
          box-shadow: 0 6px 30px #32092138;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .modal-card h3 {
          margin-bottom: 8px;
          color: #2a0516;
          font-size: 1.16em;
        }
        .modal-card label {
          font-weight: 500;
          font-size: 1em;
          color: #39234b;
          margin-bottom: 0.5em;
        }
        .modal-card input {
          width: 100%;
          margin-top: 3px;
          margin-bottom: 10px;
          padding: 10px;
          border: 1.5px solid #bfa4c4;
          border-radius: 8px;
          font-size: 1em;
          background: #fcfafd;
        }
        .modal-error {
          color: #b11a25;
          font-size: 0.98em;
        }
        .modal-success {
          color: #269a36;
          font-size: 0.98em;
        }
      `}</style>
    </div>
  );
}
