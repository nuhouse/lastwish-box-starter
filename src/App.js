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
import Videos from "./components/Videos";
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  // For overlay click or mobile route change
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <Router>
      <div className="app-root">
        {/* Hamburger only on mobile */}
        <button
          className="hamburger-menu"
          aria-label="Open menu"
          onClick={() => setSidebarOpen(true)}
          style={{ display: "none" }} // will be shown via CSS media query
        >
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>

        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onClose={closeSidebar} />

        {/* Overlay on mobile when sidebar is open */}
        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={closeSidebar}
            style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(30,10,40,0.18)",
              zIndex: 900,
            }}
          />
        )}

        <div className="content">
          <div className="app-header">
            <div className="header-left">
              <img src="/logo-placeholder.png" alt="Logo" className="header-logo" />
              <span className="header-title">Lastwish Box</span>
            </div>
            <button
              className="hamburger-menu"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
            </button>
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
            <Route path="/messages/videos" element={<Videos user={user} />} />
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
            {/* Admin Dashboard (optional) */}
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
