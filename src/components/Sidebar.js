import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const menu = [
  { label: "Home", path: "/", icon: "🏠" },
  {
    label: "Vaults", icon: "🔒", children: [
      { label: "Password Vault", path: "/vaults/password-vault" },
      { label: "Digital Platforms", path: "/vaults/digital-platforms" },
      { label: "Devices", path: "/vaults/devices" }
    ]
  },
  {
    label: "Messages", icon: "✉️", children: [
      { label: "Legacy Messages", path: "/messages/legacy-message" },
      { label: "Personal Messages", path: "/messages/personal-messages" },
      { label: "Last Goodbyes", path: "/messages/last-goodbyes" },
      { label: "Videos", path: "/messages/videos" }
    ]
  },
  {
    label: "Legal", icon: "📄", children: [
      { label: "Important Documents", path: "/legal/important-documents" },
      { label: "Secure E-Will", path: "/legal/secure-e-will" }
    ]
  },
  {
    label: "Personal", icon: "🌱", children: [
      { label: "Organ Donation", path: "/personal/organ-donation" },
      { label: "Funeral Planning", path: "/personal/funeral-planning" },
      { label: "Memory Lane", path: "/personal/memory-lane" },
      { label: "Belongings", path: "/personal/belongings" }
    ]
  },
  { label: "Proof of Life", icon: "🔎", path: "/proof-of-life" },
  { label: "Contacts", icon: "👥", path: "/contacts" }
];

export default function Sidebar({ open = false, onClose, user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState({});
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSent, setPwSent] = useState(false);

  // Accordion: only one parent at a time
  function toggleMenu(index) {
    setOpenMenus(prev => {
      const next = {};
      if (!prev[index]) next[index] = true;
      return next;
    });
  }

  function isChildActive(children) {
    return children.some(child => location.pathname === child.path);
  }

  function handleLinkClick() {
    if (onClose) onClose();
  }

  const userInitial = user?.username
    ? user.username[0].toUpperCase()
    : "U";

  function handleProfile() {
    navigate("/profile");
    if (onClose) onClose();
  }

  async function sendPwReset(e) {
    e.preventDefault();
    setPwLoading(true);
    try {
      // Replace with your password reset function (e.g., Firebase sendPasswordResetEmail)
      await new Promise(r => setTimeout(r, 1200)); // fake delay
      setPwSent(true);
    } catch (err) {
      alert("Failed to send password reset link.");
    }
    setPwLoading(false);
  }

  function handleLogout() {
    window.location.reload();
  }

  return (
    <>
      <aside className={`sidebar-root${open ? " sidebar-open" : ""}`}>
        <div className="sidebar-brand">Lastwish Box</div>
        <nav>
          <ul className="sidebar-list">
            {menu.map((item, i) => (
              <li key={item.label}>
                {item.children ? (
                  <>
                    <div
                      className={
                        "sidebar-parent" +
                        (openMenus[i] ? " open" : "") +
                        (isChildActive(item.children) ? " active" : "")
                      }
                      onClick={() => toggleMenu(i)}
                    >
                      <span style={{ marginRight: 10 }}>{item.icon}</span>
                      {item.label}
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: 18,
                          transition: "transform 0.2s",
                          transform: openMenus[i] ? "rotate(90deg)" : "rotate(0)"
                        }}
                      >▶</span>
                    </div>
                    <ul
                      className="sidebar-children"
                      style={{ display: openMenus[i] || isChildActive(item.children) ? "block" : "none" }}
                    >
                      {item.children.map(child => (
                        <li key={child.label}>
                          <Link
                            to={child.path}
                            onClick={handleLinkClick}
                            className={location.pathname === child.path ? "active" : ""}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <Link
                    to={item.path}
                    onClick={handleLinkClick}
                    className={
                      "sidebar-single" +
                      (location.pathname === item.path ? " active" : "")
                    }
                  >
                    <span style={{ marginRight: 10 }}>{item.icon}</span>
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        {/* --- Profile Section --- */}
        <div className="sidebar-profile-section">
          <div className="profile-avatar" onClick={handleProfile}>
            {userInitial}
          </div>
          <div className="profile-username">{user?.username || "User"}</div>
          <button
            className="btn-main profile-btn"
            style={{ marginTop: 12, marginBottom: 5, width: "90%" }}
            onClick={handleProfile}
          >
            View Profile
          </button>
          <button
            className="btn-main profile-btn"
            style={{ width: "90%" }}
            onClick={() => setShowPwModal(true)}
          >
            Reset Password
          </button>
          <button
            className="btn-danger profile-btn"
            style={{ width: "90%", marginTop: 10, marginBottom: 7 }}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </aside>
      {/* --- Password reset modal --- */}
      {showPwModal && (
        <div className="modal-bg" onClick={() => setShowPwModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Reset Password</h3>
            {pwSent ? (
              <div>
                <div style={{ color: "#2a0516", fontWeight: 500, margin: "22px 0 24px" }}>
                  A password reset email has been sent to:<br /><span style={{ color: "#8cade1" }}>{user.username}</span>
                </div>
                <button className="btn-main" style={{ width: 100 }} onClick={() => setShowPwModal(false)}>Close</button>
              </div>
            ) : (
              <form onSubmit={sendPwReset}>
                <label style={{ fontWeight: 500, marginBottom: 5, display: "block" }}>Email</label>
                <input
                  type="email"
                  value={user.username}
                  disabled
                  style={{ marginBottom: 15, width: "100%" }}
                />
                <button className="btn-main" style={{ width: "100%" }} disabled={pwLoading}>
                  {pwLoading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      {/* --- Styles for profile section and modal --- */}
      <style>{`
        .sidebar-profile-section {
          margin-top: auto;
          padding: 30px 0 18px 0;
          background: #22091a06;
          display: flex;
          flex-direction: column;
          align-items: center;
          border-top: 1.3px solid #5e4561;
        }
        .profile-avatar {
          width: 54px;
          height: 54px;
          background: #fff;
          color: #2a0516;
          border-radius: 50%;
          font-size: 2.0rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 7px;
          margin-top: 3px;
          cursor: pointer;
          box-shadow: 0 2px 10px #22091a16;
        }
        .profile-username {
          font-size: 1.04rem;
          font-weight: 500;
          margin-bottom: 5px;
          color: #fff;
          text-align: center;
          width: 100%;
        }
        .profile-btn {
          font-size: 1em;
        }
        .modal-bg {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(32,12,28,0.19);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-card {
          background: #fff;
          padding: 38px 32px 24px 32px;
          border-radius: 16px;
          box-shadow: 0 4px 32px #2a051626;
          max-width: 97vw;
          width: 320px;
        }
        @media (max-width: 900px) {
          .sidebar-profile-section {
            padding-bottom: env(safe-area-inset-bottom, 34px); /* Room for mobile nav bar */
          }
        }
      `}</style>
    </>
  );
}
