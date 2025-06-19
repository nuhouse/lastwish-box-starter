import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Homepage from "./components/Homepage";
import Sidebar from "./components/Sidebar";
import Auth from "./components/Auth";
import PersonalMessages from "./components/PersonalMessages";
// Placeholders for features you’ll build out later:
const Placeholder = ({ title }) => (
  <div style={{ padding: 32 }}>
    <h2>{title}</h2>
    <p>This section will be enabled soon.</p>
  </div>
);

const features = [
  { path: "e-will", label: "Secure E-will" },
  { path: "proof-of-life", label: "Proof of Life" },
  { path: "legacy-contact", label: "Legacy Contact" },
  { path: "family-friends", label: "Family and Friends" },
  { path: "belongings", label: "Belongings" },
  { path: "digital-vault", label: "Digital Vault" },
  { path: "personal-messages", label: "Personal Messages" },
  { path: "videos", label: "Videos" },
  { path: "memories", label: "Memories" },
  { path: "important-documents", label: "Important Documents" },
  { path: "organ-donation", label: "Organ Donation" },
  { path: "funeral-plan", label: "Funeral Plan" },
  { path: "euthanasia-statement", label: "Euthanasia Statement" }
];

function App() {
  const [user, setUser] = useState(null);

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  return (
    <Router>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar features={features} />
        <div className="content" style={{ flex: 1 }}>
          <div className="app-header">
            <img src="/logo-placeholder.png" alt="Logo" style={{ width: 44, height: 44, marginRight: 10 }} />
            <span style={{ fontWeight: "bold", fontSize: "1.3rem", letterSpacing: 1 }}>Lastwish Box</span>
            <span style={{ flex: 1 }} />
            <button onClick={() => window.location.reload()} style={{
              background: "#f15822",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              padding: "8px 18px",
              cursor: "pointer"
            }}>Logout</button>
          </div>
          <Routes>
  <Route path="/" element={<Homepage />} />
            <Route path="/" element={<Navigate to="/personal-messages" />} />
            <Route path="/personal-messages" element={<PersonalMessages user={user} />} />
            {features.filter(f => f.path !== "personal-messages").map(f => (
              <Route key={f.path} path={`/${f.path}`} element={<Placeholder title={f.label} />} />
            ))}
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
