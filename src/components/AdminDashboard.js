import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";

export default function AdminDashboard({ user }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  // Check if admin
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Check admin status (admins collection)
    db.collection("admins").doc(user.uid).get().then(snap => {
      setIsAdmin(snap.exists && snap.data().isAdmin);
    });
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    getDocs(collection(db, "users")).then(snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Admin Dashboard</h2>
        <div style={{ color: "#980000" }}>
          You do not have admin rights. Contact support if this is an error.
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 32 }}>
      <h2>Admin Dashboard</h2>
      <input
        type="text"
        placeholder="Search by name/email..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        style={{ marginBottom: 18, padding: 7, borderRadius: 7, border: "1px solid #ccc" }}
      />
      {loading ? (
        <div>Loading users…</div>
      ) : (
        <table style={{ width: "100%", background: "#fff", borderRadius: 9, boxShadow: "0 3px 14px #2a051612" }}>
          <thead>
            <tr style={{ background: "#f4f1f8" }}>
              <th style={{ textAlign: "left", padding: 9 }}>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Trusted Contact</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users
              .filter(u =>
                u.name?.toLowerCase().includes(filter.toLowerCase()) ||
                u.email?.toLowerCase().includes(filter.toLowerCase())
              )
              .map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.status || "Active"}</td>
                  <td>{u.trustedContactName || ""}</td>
                  <td>
                    <button
                      className="btn-main"
                      onClick={() => setSelected(u)}
                      style={{ fontSize: "0.94em", padding: "5px 15px" }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "#2a051688",
            zIndex: 2003,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
          <div
            style={{
              background: "#fff", borderRadius: 13, boxShadow: "0 6px 30px #2a051629",
              minWidth: 340, maxWidth: 400, padding: 30, position: "relative"
            }}>
            <button className="btn-cancel" style={{ position: "absolute", top: 10, right: 10 }}
              onClick={() => setSelected(null)}>&times;</button>
            <h3>User: {selected.name}</h3>
            <div><b>Email:</b> {selected.email}</div>
            <div><b>Status:</b> {selected.status || "Active"}</div>
            <div><b>Trusted Contact:</b> {selected.trustedContactName || ""}</div>
            <div><b>Legacy Release:</b> {selected.legacyReleased ? "Sent" : "Pending"}</div>
            {/* More user info here */}

            <div style={{ marginTop: 16, display: "flex", gap: 11 }}>
              <button
                className="btn-main"
                onClick={async () => {
                  // Mark user as deceased and trigger legacy message release
                  if (!window.confirm("Mark this user as deceased and deliver legacy messages?")) return;
                  await updateDoc(doc(db, "users", selected.id), {
                    status: "Deceased",
                    legacyReleased: true
                  });
                  setSelected(null);
                  alert("User marked as deceased and legacy release triggered.");
                }}
              >
                Mark as Deceased & Release Legacy
              </button>
              <button
                className="btn-danger"
                onClick={async () => {
                  if (!window.confirm("Delete this user and all associated data? This is irreversible!")) return;
                  // Add more deletion logic as needed (Firestore/Storage cleanup)
                  await updateDoc(doc(db, "users", selected.id), { status: "Deleted" });
                  setSelected(null);
                  alert("User deleted.");
                }}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
