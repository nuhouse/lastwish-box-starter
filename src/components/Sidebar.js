import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

// Define the sidebar structure
const menu = [
  {
    label: "Home",
    path: "/",
    icon: "🏠"
  },
  {
    label: "Vaults",
    icon: "🔒",
    children: [
      { label: "Digital Platforms", path: "/vaults/digital-platforms" }
    ]
  },
  {
    label: "Messages",
    icon: "✉️",
    children: [
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

export default function Sidebar() {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({});
  const [mobileOpen, setMobileOpen] = useState(false);

  // Toggles child menus open/close (accordion)
  function toggleMenu(index) {
    setOpenMenus(prev => ({ ...prev, [index]: !prev[index] }));
  }

  // Handles mobile sidebar toggle
  function handleMobileToggle() {
    setMobileOpen(v => !v);
  }

  // Close sidebar on link click (mobile)
  function handleLinkClick() {
    setMobileOpen(false);
  }

  return (
    <>
      {/* Hamburger Icon */}
      <div className="sidebar-mobile-toggle" onClick={handleMobileToggle}>
        <span>&#9776;</span>
      </div>
      <aside className={`sidebar-root${mobileOpen ? " sidebar-open" : ""}`}>
        <div style={{ fontWeight: "bold", fontSize: 23, margin: "18px 0 16px 0", textAlign: "center", color: "#fff" }}>
          Lastwish Box
        </div>
        <nav>
          <ul className="sidebar-list">
            {menu.map((item, i) => (
              <li key={item.label}>
                {item.children ? (
                  <>
                    <div
                      className={`sidebar-parent${openMenus[i] ? " open" : ""}`}
                      onClick={() => toggleMenu(i)}
                    >
                      <span style={{ marginRight: 10 }}>{item.icon}</span>
                      {item.label}
                      <span style={{
                        marginLeft: "auto",
                        fontSize: 18,
                        transition: "transform 0.2s",
                        transform: openMenus[i] ? "rotate(90deg)" : "rotate(0)"
                      }}>▶</span>
                    </div>
                    <ul className="sidebar-children" style={{ display: openMenus[i] ? "block" : "none" }}>
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
                    className={location.pathname === item.path ? "active sidebar-single" : "sidebar-single"}
                  >
                    <span style={{ marginRight: 10 }}>{item.icon}</span>
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
