import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
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
  "Bones",
  "Tissue/Other",
];

export default function OrganDonation({ user }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load previous data
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getDoc(doc(db, "organDonation", user.uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setPrefs(d.organs || {});
        setNotes(d.notes || "");
      }
      setLoading(false);
    });
  }, [user]);

  // Handlers
  const handleChange = (organ, val) => {
    setPrefs((old) => ({ ...old, [organ]: val }));
  };

  const handleAll = (val) => {
    const all = {};
    ORGAN_LIST.forEach((o) => (all[o] = val));
    setPrefs(all);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await setDoc(doc(db, "organDonation", user.uid), {
      uid: user.uid,
      organs: prefs,
      notes,
      updated: serverTimestamp(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    setLoading(false);
    setOpen(false);
  };

  const handleDelete = async () => {
    if (window.confirm("Remove your organ donation preferences?")) {
      await deleteDoc(doc(db, "organDonation", user.uid));
      setPrefs({});
      setNotes("");
      setSaved(false);
      setOpen(false);
    }
  };

  // UI
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: 24 }}>
      <h2>Organ Donation Preferences</h2>
      <p>
        Specify which organs you wish to donate. This info will be securely stored and can be shared with your trusted contacts.
      </p>

      {!open ? (
        <>
          <button
            onClick={() => setOpen(true)}
            style={{
              padding: "10px 22px",
              background: "#2a0516",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              fontWeight: 600,
              margin: "16px 0",
              cursor: "pointer",
            }}
          >
            {Object.keys(prefs).length ? "Edit Preferences" : "Enter Preferences"}
          </button>
          {Object.keys(prefs).length > 0 && (
            <div
              style={{
                margin: "16px 0",
                background: "#f8f8fa",
                border: "1px solid #eee",
                borderRadius: 10,
                padding: 18,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 7 }}>Your Preferences:</div>
              <ul style={{ marginLeft: 16, marginBottom: 10 }}>
                {ORGAN_LIST.map((organ) =>
                  organ in prefs ? (
                    <li key={organ} style={{ color: prefs[organ] ? "#2a0516" : "#aaa" }}>
                      {organ}:{" "}
                      <strong>
                        {prefs[organ] ? "Donate" : "Do not donate"}
                      </strong>
                    </li>
                  ) : null
                )}
              </ul>
              {notes && (
                <div style={{ color: "#666", fontSize: 15, marginTop: 10 }}>
                  <span style={{ fontWeight: 500 }}>Notes:</span> {notes}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 20,
            margin: "14px 0",
          }}
        >
          <div
            style={{
              marginBottom: 14,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => handleAll(true)}
              style={{
                background: "#e97c13",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                padding: "6px 13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Donate All
            </button>
            <button
              type="button"
              onClick={() => handleAll(false)}
              style={{
                background: "#aaa",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                padding: "6px 13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              None
            </button>
          </div>
          {ORGAN_LIST.map((organ) => (
            <div key={organ} style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
              <span style={{ width: 150 }}>{organ}</span>
              <select
                value={
                  prefs[organ] === undefined
                    ? ""
                    : prefs[organ]
                    ? "donate"
                    : "no"
                }
                onChange={(e) => handleChange(organ, e.target.value === "donate")}
                style={{
                  borderRadius: 5,
                  padding: "4px 12px",
                  border: "1px solid #aaa",
                  marginLeft: 12,
                  minWidth: 90,
                }}
                required
              >
                <option value="">Select</option>
                <option value="donate">Donate</option>
                <option value="no">Do not donate</option>
              </select>
            </div>
          ))}
          <div style={{ marginTop: 14 }}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes or special wishes?"
              style={{
                width: "100%",
                minHeight: 58,
                borderRadius: 5,
                padding: 8,
                border: "1px solid #ccc",
                resize: "vertical",
              }}
              maxLength={500}
            />
          </div>
          <div style={{ display: "flex", marginTop: 14, gap: 12 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: "#2a0516",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                padding: "9px 19px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {loading ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                background: "#ccc",
                color: "#333",
                border: "none",
                borderRadius: 5,
                padding: "9px 15px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            {Object.keys(prefs).length > 0 && (
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  marginLeft: "auto",
                  background: "#980000",
                  color: "#fff",
                  border: "none",
                  borderRadius: 5,
                  padding: "9px 18px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Delete All
              </button>
            )}
          </div>
          {saved && (
            <div style={{ color: "#2a0516", fontWeight: 500, marginTop: 8 }}>
              Preferences saved!
            </div>
          )}
        </form>
      )}
    </div>
  );
}
