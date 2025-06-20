import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

const ORGAN_LIST = [
  "Heart",
  "Lungs",
  "Liver",
  "Kidneys",
  "Pancreas",
  "Intestines",
  "Eyes (Corneas)",
  "Skin",
  "Bone Marrow",
  "Tissue",
];

export default function OrganDonation({ user }) {
  const [organs, setOrgans] = useState({});
  const [docId, setDocId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load user's organ donation preference (single document per user)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "organDonations"),
      where("uid", "==", user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setOrgans(data.organs || {});
        setDocId(snap.docs[0].id);
      } else {
        setOrgans({});
        setDocId(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // Handle organ toggle
  function handleOrganChange(organ, value) {
    setOrgans((prev) => ({
      ...prev,
      [organ]: value,
    }));
  }

  // Save preference
  async function handleSubmit(e) {
    e.preventDefault();
    if (docId) {
      await updateDoc(doc(db, "organDonations", docId), {
        organs,
        updated: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, "organDonations"), {
        uid: user.uid,
        organs,
        created: serverTimestamp(),
      });
    }
    setEditing(false);
  }

  // Delete all preferences
  async function handleDelete() {
    if (
      window.confirm(
        "Are you sure you want to delete your organ donation preferences?"
      )
    ) {
      if (docId) await deleteDoc(doc(db, "organDonations", docId));
      setOrgans({});
      setEditing(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", background: "#fff", borderRadius: 16, boxShadow: "0 2px 18px #eee", padding: 36 }}>
      <h2 style={{ color: "#2a0516", marginBottom: 18 }}>Organ Donation Preferences</h2>
      {!editing ? (
        <>
          <ul style={{ marginBottom: 20 }}>
            {ORGAN_LIST.map((organ) => (
              <li key={organ} style={{ marginBottom: 6, fontSize: 17 }}>
                <strong>{organ}:</strong>{" "}
                {organs[organ] === "yes" ? (
                  <span style={{ color: "#28b528" }}>Donate</span>
                ) : organs[organ] === "no" ? (
                  <span style={{ color: "#d31e1e" }}>Do not donate</span>
                ) : (
                  <span style={{ color: "#aaa" }}>No preference</span>
                )}
              </li>
            ))}
          </ul>
          <button
            onClick={() => setEditing(true)}
            style={{
              background: "#2a0516",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "9px 22px",
              fontWeight: 600,
              marginRight: 15,
              cursor: "pointer",
            }}
          >
            {docId ? "Edit Preferences" : "Enter Preference"}
          </button>
          {docId && (
            <button
              onClick={handleDelete}
              style={{
                background: "#fff",
                color: "#a20000",
                border: "1.6px solid #f9c6c6",
                borderRadius: 6,
                padding: "9px 18px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Delete All
            </button>
          )}
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 22 }}>
            {ORGAN_LIST.map((organ) => (
              <div key={organ} style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                <span style={{ flex: 1 }}>{organ}</span>
                <select
                  value={organs[organ] || ""}
                  onChange={(e) => handleOrganChange(organ, e.target.value)}
                  style={{ padding: 6, borderRadius: 5, border: "1px solid #bbb", marginLeft: 10 }}
                >
                  <option value="">No preference</option>
                  <option value="yes">Donate</option>
                  <option value="no">Do not donate</option>
                </select>
              </div>
            ))}
          </div>
          <button
            type="submit"
            style={{
              background: "#2a0516",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "9px 22px",
              fontWeight: 600,
              marginRight: 15,
              cursor: "pointer",
            }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            style={{
              background: "#fff",
              color: "#2a0516",
              border: "1.2px solid #dac8e8",
              borderRadius: 6,
              padding: "9px 18px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
