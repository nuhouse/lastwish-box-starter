import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection, doc, setDoc, getDoc, onSnapshot
} from "firebase/firestore";

// Helper for empty plan
function emptyPlan(uid = "") {
  return {
    uid,
    typeOfService: "",
    venue: "",
    religiousPrefs: "",
    notifyContacts: [],
    officiant: "",
    readings: [""],
    music: [""],
    speakers: [""],
    pallbearers: [""],
    flowersOrDonations: "",
    dressCode: "",
    photosOrVideos: "",
    specialRequests: "",
    ashesLocation: "",
    graveInscription: "",
    ongoingWishes: "",
    updated: null
  };
}

export default function FuneralPlanning({ user }) {
  const [plan, setPlan] = useState(emptyPlan(user?.uid));
  const [contacts, setContacts] = useState([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState({
    basic: true, service: false, personal: false, aftercare: false
  });

  // Load contacts
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, "contacts"),
      snap => setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [user]);

  // Load funeral plan
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, "funeralPlans", user.uid);
    getDoc(docRef).then(d => {
      if (d.exists()) setPlan({ ...emptyPlan(user.uid), ...d.data() });
    });
  }, [user]);

  function handleExpand(section) {
    setExpanded(e => ({ ...e, [section]: !e[section] }));
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setPlan(f => ({ ...f, [name]: value }));
  }

  // Multi-list add/remove helpers
  function handleListChange(name, idx, value) {
    setPlan(f => {
      const arr = [...(f[name] || [])];
      arr[idx] = value;
      return { ...f, [name]: arr };
    });
  }
  function handleAddToList(name) {
    setPlan(f => ({ ...f, [name]: [...(f[name] || []), ""] }));
  }
  function handleRemoveFromList(name, idx) {
    setPlan(f => {
      const arr = [...(f[name] || [])];
      arr.splice(idx, 1);
      return { ...f, [name]: arr };
    });
  }

  // Save plan
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await setDoc(doc(db, "funeralPlans", user.uid), {
      ...plan,
      updated: new Date().toISOString()
    });
    setSaving(false);
    setEditing(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Toggle editing mode
  function startEdit() { setEditing(true); }
  function cancelEdit() {
    setEditing(false);
    // Optionally reload original from DB here if you want
  }

  // Contact helper
  function getContactName(id) {
    return contacts.find(c => c.id === id)?.name || id;
  }

  // If plan is empty, check by updated
  const hasPlan = !!(plan && plan.updated);

  // --- UI ---
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 18 }}>
      <h2 style={{ margin: "18px 0 12px 0", color: "#2a0516" }}>Funeral Planning</h2>
      <div style={{
        background: "#f5f1f5",
        borderRadius: 14,
        padding: 20,
        marginBottom: 18,
        color: "#523053"
      }}>
        <div style={{ fontSize: 17, marginBottom: 3, fontWeight: 600 }}>
          Leave your wishes for your funeral or memorial.
        </div>
        <div style={{ fontSize: 15, color: "#785f86" }}>
          This section is private and only your trusted contacts can access it when needed.
        </div>
      </div>
      {!editing && hasPlan && (
        <>
          <SummaryView plan={plan} contacts={contacts} />
          <button className="btn" style={{ marginTop: 16, background: "#2a0516", color: "#fff" }} onClick={startEdit}>Edit Funeral Plan</button>
        </>
      )}
      {(!hasPlan || editing) && (
        <form
          onSubmit={handleSave}
          style={{
            background: "#fff", borderRadius: 13, boxShadow: "0 3px 14px #2a05161b", padding: "22px 20px", marginBottom: 30
          }}
        >
          {/* ---- BASIC ---- */}
          <Accordion
            expanded={expanded.basic}
            onClick={() => handleExpand("basic")}
            title="Basic Details"
          >
            <div className="form-row">
              <label>Type of Service</label>
              <select name="typeOfService" value={plan.typeOfService} onChange={handleChange} required>
                <option value="">Select…</option>
                <option>Burial</option>
                <option>Cremation</option>
                <option>Natural/Green Burial</option>
                <option>No Preference/Not Sure</option>
              </select>
            </div>
            <div className="form-row">
              <label>Preferred Venue or Location</label>
              <input name="venue" value={plan.venue} onChange={handleChange} placeholder="e.g. St. Mary's Church, Cork" />
            </div>
            <div className="form-row">
              <label>Religious/Cultural Preferences</label>
              <input name="religiousPrefs" value={plan.religiousPrefs} onChange={handleChange} placeholder="e.g. Catholic, Humanist, None" />
            </div>
            <div className="form-row">
              <label>People to Notify/Involve</label>
              <select
                name="notifyContacts"
                value={plan.notifyContacts}
                onChange={e => setPlan(f => ({ ...f, notifyContacts: Array.from(e.target.selectedOptions).map(o => o.value) }))}
                multiple
                style={{ minHeight: 38 }}
              >
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </Accordion>
          {/* ---- SERVICE DETAILS ---- */}
          <Accordion
            expanded={expanded.service}
            onClick={() => handleExpand("service")}
            title="Service Details"
          >
            <div className="form-row">
              <label>Officiant / Person to Lead Ceremony</label>
              <input name="officiant" value={plan.officiant} onChange={handleChange} />
            </div>
            <FieldList
              label="Readings, Poems, or Texts"
              name="readings"
              list={plan.readings}
              onChange={handleListChange}
              onAdd={handleAddToList}
              onRemove={handleRemoveFromList}
            />
            <FieldList
              label="Preferred Music"
              name="music"
              list={plan.music}
              onChange={handleListChange}
              onAdd={handleAddToList}
              onRemove={handleRemoveFromList}
            />
            <FieldList
              label="People to Speak or Share Memories"
              name="speakers"
              list={plan.speakers}
              onChange={handleListChange}
              onAdd={handleAddToList}
              onRemove={handleRemoveFromList}
              contacts={contacts}
            />
            <FieldList
              label="Pallbearers"
              name="pallbearers"
              list={plan.pallbearers}
              onChange={handleListChange}
              onAdd={handleAddToList}
              onRemove={handleRemoveFromList}
              contacts={contacts}
            />
            <div className="form-row">
              <label>Flowers or Donations</label>
              <input name="flowersOrDonations" value={plan.flowersOrDonations} onChange={handleChange} placeholder="e.g. Charity name, No flowers please" />
            </div>
          </Accordion>
          {/* ---- PERSONAL TOUCHES ---- */}
          <Accordion
            expanded={expanded.personal}
            onClick={() => handleExpand("personal")}
            title="Personal Touches"
          >
            <div className="form-row">
              <label>Dress Code</label>
              <input name="dressCode" value={plan.dressCode} onChange={handleChange} placeholder="e.g. Bright colours, formal wear" />
            </div>
            <div className="form-row">
              <label>Photos or Video Messages (describe or link)</label>
              <input name="photosOrVideos" value={plan.photosOrVideos} onChange={handleChange} placeholder="Describe or link to any special media" />
            </div>
            <div className="form-row">
              <label>Special Requests or Notes</label>
              <textarea name="specialRequests" value={plan.specialRequests} onChange={handleChange} placeholder="Anything else?" rows={2} />
            </div>
          </Accordion>
          {/* ---- AFTERCARE ---- */}
          <Accordion
            expanded={expanded.aftercare}
            onClick={() => handleExpand("aftercare")}
            title="Aftercare & Remembrance"
          >
            <div className="form-row">
              <label>Ashes Location (if cremation)</label>
              <input name="ashesLocation" value={plan.ashesLocation} onChange={handleChange} />
            </div>
            <div className="form-row">
              <label>Grave/Memorial Inscription</label>
              <input name="graveInscription" value={plan.graveInscription} onChange={handleChange} />
            </div>
            <div className="form-row">
              <label>Ongoing Wishes (remembrances, etc.)</label>
              <input name="ongoingWishes" value={plan.ongoingWishes} onChange={handleChange} />
            </div>
          </Accordion>
          {/* ---- ACTIONS ---- */}
          <div style={{ marginTop: 19, display: "flex", gap: 12 }}>
            <button type="submit" className="btn" style={{ background: "#2a0516", color: "#fff" }} disabled={saving}>
              {saving ? "Saving..." : "Save Funeral Plan"}
            </button>
            <button type="button" className="btn" style={{ background: "#aaa", color: "#333" }} onClick={cancelEdit} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      )}
      <style>{`
        .form-row { margin-bottom: 17px; }
        .form-row label { display: block; font-weight: 500; margin-bottom: 4px; }
        .form-row input, .form-row select, .form-row textarea {
          width: 100%; border-radius: 7px; border: 1px solid #cdbad7; padding: 7px 11px;
          font-size: 1em; background: #fff; margin-bottom: 2px;
        }
        .btn {
          border: none; border-radius: 5px; padding: 9px 15px; font-weight: 600; cursor: pointer;
        }
        .accordion-section { margin-bottom: 23px; border-bottom: 1px solid #f0e6f1; }
        .accordion-header {
          font-size: 1.16em; font-weight: 600; background: none; border: none;
          color: #2a0516; padding: 10px 0 5px 0; display: flex; align-items: center; cursor: pointer;
        }
      `}</style>
    </div>
  );
}

// --- Accordion Component ---
function Accordion({ expanded, onClick, title, children }) {
  return (
    <div className="accordion-section">
      <button className="accordion-header" type="button" onClick={onClick}>
        <span style={{
          display: "inline-block",
          marginRight: 7,
          transform: expanded ? "rotate(90deg)" : "rotate(0)",
          transition: "transform 0.19s"
        }}>▶</span> {title}
      </button>
      {expanded && <div>{children}</div>}
    </div>
  );
}

// --- FieldList for dynamic lists (music, readings, speakers, etc) ---
function FieldList({ label, name, list, onChange, onAdd, onRemove, contacts }) {
  return (
    <div className="form-row">
      <label>{label}</label>
      {list.map((val, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: 6, gap: 5 }}>
          {contacts && name !== "readings" && name !== "music" ? (
            <select
              value={val}
              onChange={e => onChange(name, i, e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">Select contact...</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={val}
              onChange={e => onChange(name, i, e.target.value)}
              style={{ flex: 1 }}
            />
          )}
          {list.length > 1 && (
            <button
              type="button"
              className="btn"
              style={{ background: "#eee", color: "#333", padding: "2px 9px", fontSize: 14 }}
              onClick={() => onRemove(name, i)}
            >−</button>
          )}
        </div>
      ))}
      <button
        type="button"
        className="btn"
        style={{ background: "#e97c13", color: "#fff", fontSize: 15 }}
        onClick={() => onAdd(name)}
      >Add Another</button>
    </div>
  );
}

// --- Summary View ---
function SummaryView({ plan, contacts }) {
  if (!plan || !plan.updated) return null;
  return (
    <div style={{
      background: "#fff", borderRadius: 13, boxShadow: "0 3px 14px #2a05161b",
      padding: "22px 18px", marginBottom: 24, fontSize: 17
    }}>
      <div style={{ fontWeight: 600, color: "#2a0516", marginBottom: 7 }}>
        Your Current Funeral Plan <span style={{ fontWeight: 400, color: "#a35b14", fontSize: 13 }}>
        (last updated {new Date(plan.updated).toLocaleString()})
        </span>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 16 }}>
        <li><b>Type of Service:</b> {plan.typeOfService}</li>
        <li><b>Venue/Location:</b> {plan.venue}</li>
        <li><b>Religious Preferences:</b> {plan.religiousPrefs}</li>
        <li><b>People to Notify/Involve:</b> {(plan.notifyContacts || []).map(id => contacts.find(c => c.id === id)?.name || id).join(", ")}</li>
        <li><b>Officiant:</b> {plan.officiant}</li>
        <li><b>Readings/Poems:</b> {(plan.readings || []).filter(Boolean).join(", ")}</li>
        <li><b>Music:</b> {(plan.music || []).filter(Boolean).join(", ")}</li>
        <li><b>Speakers:</b> {(plan.speakers || []).map(id => contacts.find(c => c.id === id)?.name || id).join(", ")}</li>
        <li><b>Pallbearers:</b> {(plan.pallbearers || []).map(id => contacts.find(c => c.id === id)?.name || id).join(", ")}</li>
        <li><b>Flowers/Donations:</b> {plan.flowersOrDonations}</li>
        <li><b>Dress Code:</b> {plan.dressCode}</li>
        <li><b>Photos/Videos:</b> {plan.photosOrVideos}</li>
        <li><b>Special Requests/Notes:</b> {plan.specialRequests}</li>
        <li><b>Ashes Location:</b> {plan.ashesLocation}</li>
        <li><b>Grave/Memorial Inscription:</b> {plan.graveInscription}</li>
        <li><b>Ongoing Wishes:</b> {plan.ongoingWishes}</li>
      </ul>
    </div>
  );
}
