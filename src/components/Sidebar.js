import React, { useState } from "react";

const menu = [
  {
    label: "Home",
    path: "/"
  },
  {
    label: "Vaults",
    children: [
      { label: "Digital Platforms", path: "/digital-platforms" }
    ]
  },
  {
    label: "Messages",
    children: [
      { label: "Personal Messages", path: "/personal-messages" },
      { label: "Last Goodbyes", path: "/last-goodbyes" },
      { label: "Videos", path: "/videos" }
    ]
  },
  {
    label: "Legal",
    children: [
      { label: "Important Documents", path: "/important-documents" },
      { label: "Secure E-Will", path: "/secure-e-will" }
    ]
  },
  {
    label: "Personal",
    children: [
      { label: "Organ Donation", path: "/organ-donation" },
      { label: "Funeral Planning", path: "/funeral-planning" },
      { label: "Memory Lane", path: "/memory-lane" },
      { label: "Belongings", path: "/belongings" }
    ]
  },
  { label: "Proof of Life", path: "/proof-of-life" },
  { label: "Contacts", path: "/contacts" }
];

export default function Sidebar() {
  const [openIndex, setOpenIndex] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMenuClick = idx => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <>
      {/* Hamburger for mobile */}
      <div className="sidebar-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
        <span>&#9776;</span>
      </div>
      <aside className={`sidebar-root ${mobileOpen ? "sidebar-open" : ""}`}>
        <div style={{
          fontWeight: 700, fontSize: 22, padding: "24px 0 10px 20px",
          letterSpacing: 1
        }}>
          LastWish Box
        </div>
        <nav>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {menu.map((item, idx) => (
              <li key={item.label}>
                <div
                  onClick={() => item.children ? handleMenuClick(idx) : null}
                  style={{
                    padding: "12px 20px",
                    cursor: "pointer",
                    fontWeight: item.children ? 600 : 400,
                    background: openIndex === idx ? "#523f48" : "transparent"
                  }}
                >
                  <a
                    href={item.path || "#"}
                    style={{
                      color: "#fff",
                      textDecoration: "none",
                      display: "inline-block",
                      width: "100%"
                    }}
                  >
                    {item.label}
                  </a>
                  {item.children && (
                    <span style={{ float: "right" }}>
                      {openIndex === idx ? "▼" : "►"}
                    </span>
                  )}
                </div>
                {item.children && openIndex === idx && (
                  <ul style={{
                    listStyle: "none",
                    paddingLeft: 28,
                    background: "#6b5363"
                  }}>
                    {item.children.map(child => (
                      <li key={child.label}>
                        <a
                          href={child.path}
                          style={{
                            color: "#eee",
                            textDecoration: "none",
                            display: "block",
                            padding: "8px 0"
                          }}
                        >
                          {child.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <style>{`
        .sidebar-root {
          width: 230px;
          background: #645155;
          color: #fff;
          min-height: 100vh;
          position: fixed;
          top: 0; left: 0; bottom: 0;
          z-index: 100;
          transition: left 0.2s;
        }
        .sidebar-mobile-toggle {
          display: none;
          position: fixed;
          left: 10px; top: 10px;
          z-index: 200;
          background: #645155;
          color: #fff;
          border-radius: 5px;
          padding: 7px 14px;
          font-size: 25px;
          cursor: pointer;
        }
        @media (max-width: 900px) {
          .sidebar-root {
            left: -230px;
            position: fixed;
          }
          .sidebar-root.sidebar-open {
            left: 0;
          }
          .sidebar-mobile-toggle {
            display: block;
          }
        }
      `}</style>
    </>
  );
}
