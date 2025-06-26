import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Auth from "./components/Auth";
import PersonalMessages from "./components/PersonalMessages";
import Homepage from "./components/Homepage";
import Contacts from "./components/Contacts";
import Belongings from "./components/Belongings";
import OrganDonation from "./components/OrganDonation";
import Devices from "./components/Devices";
import FuneralPlanning from "./components/FuneralPlanning";
import MemoryLane from "./components/MemoryLane";
import ProofOfLife from "./components/ProofOfLife";
import Ewill from "./components/Ewill";
import ImportantDocuments from "./components/ImportantDocuments";
import PasswordVault from "./components/PasswordVault";
import LegacyMessage from "./components/LegacyMessage";
import AdminDashboard from "./components/AdminDashboard";
import DigitalPlatforms from "./components/DigitalPlatforms";
import LastGoodbyes from "./components/LastGoodbyes";
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
  <Route path="/vaults/digital-platforms" element={<DigitalPlatforms user={user} />} />
  <Route path="/vaults/devices" element={<Devices user={user} />} />
  <Route path="/vaults/password-vault" element={<PasswordVault user={user} />} />
  {/* Messages */}
  <Route path="/messages/personal-messages" element={<PersonalMessages user={user} />} />
  <Route path="/messages/last-goodbyes" element={<LastGoodbyes user={user} />} />
  <Route path="/messages/videos" element={<Placeholder title="Videos" />} />
  <Route path="/messages/legacy-message" element={<LegacyMessage user={user} />} />
  {/* Legal */}
  <Route path="/legal/important-documents" element={<ImportantDocuments user={user} />} />
  <Route path="/legal/secure-e-will" element={<Ewill user={user} />} />
  {/* Personal */}
  <Route path="/personal/funeral-planning" element={<FuneralPlanning user={user} />} />
  <Route path="/personal/memory-lane" element={<MemoryLane user={user} />} />
  <Route path="/personal/belongings" element={<Belongings user={user} />} />
  <Route path="/personal/organ-donation" element={<OrganDonation user={user} />} />
  {/* Proof of Life */}
  <Route path="/proof-of-life" element={<ProofOfLife user={user} />} />
  {/* Contacts */}
  <Route path="/contacts" element={<Contacts user={user} />} />
  {/* Admin Dashboard (if you want to add) */}
  {/* <Route path="/admin" element={<AdminDashboard user={user} />} /> */}
  {/* Redirect unknown routes to home */}
  <Route path="*" element={<Navigate to="/" />} />
</Routes>

        </div>
      </div>
    </Router>
  );
}

export default App;
