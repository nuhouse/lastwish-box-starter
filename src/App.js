import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Auth from "./components/Auth";
import PersonalMessages from "./components/PersonalMessages";
import Homepage from "./components/Homepage";
import Contacts from "./components/Contacts";
import Belongings from "./components/Belongings";
import OrganDonation from "./components/OrganDonation";
import './App.css';


// Placeholder for unfinished sections
const Placeholder = ({ title }) => (
  <div style={{ padding: 32 }}>
    <h2>{title}</h2>
    <p>This section will be enabled soon.</p>
  </div>
);

function App() {
  const [user, setUser] = useState(null);

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  return (
    <Router>
      <div className="app-root">
        <Sidebar />
        <div className="content">
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
            {/* Vaults */}
            <Route path="/vaults/digital-platforms" element={<Placeholder title="Digital Platforms" />} />
            {/* Messages */}
            <Route path="/messages/personal-messages" element={<PersonalMessages user={user} />} />
            <Route path="/messages/last-goodbyes" element={<Placeholder title="Last Goodbyes" />} />
            <Route path="/messages/videos" element={<Placeholder title="Videos" />} />
            {/* Legal */}
            <Route path="/legal/important-documents" element={<Placeholder title="Important Documents" />} />
            <Route path="/legal/secure-e-will" element={<Placeholder title="Secure E-Will" />} />
            {/* Personal */}
            <Route path="/personal/funeral-planning" element={<Placeholder title="Funeral Planning" />} />
            <Route path="/personal/memory-lane" element={<Placeholder title="Memory Lane" />} />
            <Route path="/personal/belongings" element={<Belongings user={user} />} />
            {/* Proof of Life */}
            <Route path="/proof-of-life" element={<Placeholder title="Proof of Life" />} />
            {/* Contacts: Use the REAL component */}
<Route path="/personal/organ-donation" element={<OrganDonation user={user} />} />
            <Route path="/contacts" element={<Contacts user={user} />} />
            {/* Redirect unknown routes to home */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
