import React, { useState, useEffect } from "react";
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
import ProfilePage from "./components/ProfilePage";
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on desktop resize
  useEffect(() => {
    const closeSidebarOnResize = () => {
      if (window.innerWidth >= 900) setSidebarOpen(false);
    };
    window.addEventListener("resize", closeSidebarOnResize);
    return () => window.removeEventListener("resize", closeSidebarOnResize);
  }, []);

  // Auth logic
  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  function handleProfileUpdate(newProfile) {
  setUser(prev => ({
    ...prev,
    ...newProfile,
    username: prev.username // Don't allow username change!
  }));
  // Optionally, add your DB update logic here!
}


  // Logout and Password Reset handlers (customize for your backend)
  function handleLogout() {
    // Add your logout logic (firebase signOut etc)
    setUser(null);
    window.location.reload();
  }
  function handlePasswordReset() {
    // Add your password reset logic (firebase, modal, etc)
    alert("Password reset flow coming soon!");
  }

  return (
    <Router>
      <div className="app-root">
        {/* Sidebar with user and profile props */}
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
        
        />

            <Sidebar
  open={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
  user={user}
/>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
            tabIndex={0}
            aria-label="Close menu"
            style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 1090,
              background: "rgba(30,15,25,0.44)"
            }}
          />
        )}

        {/* Main content area */}
        <div className="content">
          {/* Header */}
          <div className="app-header" style={{ position: "sticky", top: 0, zIndex: 100, background: "#fff" }}>
            <div className="header-left" style={{ display: "flex", alignItems: "center" }}>
              <img
                src="/logo-placeholder.png"
                alt="Logo"
                className="header-logo"
                style={{ width: 40, height: 40, marginRight: 10 }}
              />
              <span
                className="header-title"
                style={{
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                  letterSpacing: 1,
                  color: "#2a0516",
                  lineHeight: 1
                }}
              >
                Lastwish Box
              </span>
            </div>
            {/* Hamburger menu (mobile only) */}
            <button
              className="hamburger-menu"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                cursor: "pointer"
              }}
            >
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
            </button>
          </div>

          {/* Main routes */}
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
            {/* Profile Page */}
            <Route path="/profile" element={
  <ProfilePage
    user={user}
    onUpdate={handleProfileUpdate}
    onLogout={handleLogout}
    // ...other props
  />
} />
            {/* Admin Dashboard (optional) */}
            {/* <Route path="/admin" element={<AdminDashboard user={user} />} /> */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
      {/* Hamburger menu styles */}
      <style>{`
        .hamburger-menu {
          display: none;
          flex-direction: column;
          gap: 4px;
          margin-left: auto;
          background: none;
          border: none;
          outline: none;
          cursor: pointer;
          z-index: 1201;
        }
        .hamburger-menu .bar {
          display: block;
          width: 27px;
          height: 3.7px;
          background: #2a0516;
          border-radius: 3px;
          margin: 2px 0;
        }
        @media (max-width: 900px) {
          .hamburger-menu {
            display: flex;
          }
        }
      `}</style>
    </Router>
  );
}

export default App;
