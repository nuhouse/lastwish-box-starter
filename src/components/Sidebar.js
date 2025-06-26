import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

const menu = [
  {
    label: "Home",
    path: "/",
    icon: "🏠",
  },
  {
    label: "Vaults",
    icon: "🔒",
    children: [
      { label: "Password Vault", path: "/vaults/password-vault" },
      { label: "Digital Platforms", path: "/vaults/digital-platforms" },
      { label: "Devices", path: "/vaults/devices" }
    ]
  },
  {
    label: "Messages",
    icon: "✉️",
    children: [
      { label: "Legacy Messages", path: "/messages/legacy-message" },
      { label: "Personal Messages", path: "/messages/personal-messages" },
      { label: "Last Goodbyes", path: "/messages/last-goodbyes" },
      { label: "Videos", path: "/messages/videos" }
    ]
  },
  {
    label: "Legal",
    icon: "📄",
    children: [
      { label: "Important Documents", path: "/legal/important-documents" },
      { label: "Secure E-Will", path: "/legal/secure-e-will" }
    ]
  },
  {
    label: "Personal",
    icon: "🌱",
    children: [
      { label: "Organ Donation", path: "/personal/organ-donation" },
      { label: "Funeral Planning", path: "/personal/funeral-planning" },
      { label: "Memory Lane", path: "/personal/memory-lane" },
      { label: "Belongings", path: "/personal/belongings" }
    ]
  },
  {
    label: "Proof of Life",
    icon: "🔎",
    path: "/proof-of-life"
  },
  {
    label: "Contacts",
    icon: "👥",
    path: "/contacts"
  }
];

export default function Sidebar({ open = false, onClose, user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState({});

  // Accordion: Only one open at a time
  function toggleMenu(index) {
    setOpenMenus(prev => {
      // If already open, close it; else open this and close others
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

  // Password Reset Flow
  function handlePasswordReset(email) {
    if (!email) {
      alert("No email found for this account.");
      return;
    }
    if (window.confirm(`Send a password reset email to ${email}?`)) {
      sendPasswordResetEmail(auth, email)
        .then(() => {
          alert(`A password reset email has been sent to ${email}.`);
        })
        .catch(err => {
          alert("Failed to send reset email: " + err.message);
        });
    }
  }

  // Optional: Logout function
  function handleLogout() {
    if (window.confirm("Log out?")) {
      // You can call Firebase auth.signOut() here if desired
      window.location.reload();
    }
  }

  // Scrollable sidebar on mobile if needed
  return (
    <aside className={`sidebar-root${open ? " sidebar-open" : ""}`}>
      <div className="sidebar-brand">
        Lastwish Box
      </div>
      <nav style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
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

      {/* Profile block at the bottom */}
      <div className="sidebar-profile-block">
        <div className="profile-email" style={{
          fontSize: 14,
          color: "#eee",
          marginBottom: 7,
          overflowWrap: "break-word"
        }}>
          <span style={{ fontWeight: 600 }}>{user?.name || user?.username || "User"}</span><br />
          <span style={{ color: "#cdbce2" }}>{user?.email}</span>
        </div>
        <button
          className="btn-main sidebar-reset"
          style={{ marginBottom: 12, width: "100%" }}
          onClick={() => handlePasswordReset(user?.email)}
        >
          Reset Password
        </button>
        <button
          className="btn-cancel"
          style={{ width: "100%" }}
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
