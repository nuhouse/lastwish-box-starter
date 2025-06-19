import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const menu = [
  {
    title: "Home",
    path: "/"
  },
  {
    title: "Vaults",
    children: [
      { title: "Digital Platforms", path: "/vaults/digital-platforms" }
    ]
  },
  {
    title: "Messages",
    children: [
      { title: "Personal Messages", path: "/messages/personal-messages" },
      { title: "Last Goodbyes", path: "/messages/last-goodbyes" },
      { title: "Videos", path: "/messages/videos" }
    ]
  },
  {
    title: "Legal",
    children: [
      { title: "Important Documents", path: "/legal/important-documents" },
      { title: "Secure E-Will", path: "/legal/secure-e-will" }
    ]
  },
  {
    title: "Personal",
    children: [
      { title: "Organ Donation", path: "/personal/organ-donation" },
      { title: "Funeral Planning", path: "/personal/funeral-planning" },
      { title: "Memory Lane", path: "/personal/memory-lane" },
      { title: "Belongings", path: "/personal/belongings" }
    ]
  },
  {
    title: "Proof of Life",
    path: "/proof-of-life"
  },
  {
    title: "Contacts",
    path: "/contacts"
  }
];

export default function Sidebar() {
  const [open, setOpen] = useState({});
  const location = useLocation();

  const toggle = idx => setOpen(o => ({ ...o, [idx]: !o[idx] }));

  return (
    <div style={{
      width: 260, background: "#645155", color: "#fff", height: "100vh", paddingTop: 25,
      display: "flex", flexDirection: "column", fontFamily: "inherit", position: "fixed"
    }}>
      {menu.map((item, idx) => (
        <div key={item.title}>
          {item.children ? (
            <div>
              <div
                onClick={() => toggle(idx)}
                style={{
                  fontWeight: 600, padding: "11px 20px", cursor: "pointer",
                  background: open[idx] ? "#513e36" : "transparent",
                  borderBottom: "1px solid #806c63"
                }}
              >
                {item.title}
              </div>
              {open[idx] && (
                <div>
                  {item.children.map(child => (
                    <Link
                      key={child.title}
                      to={child.path}
                      style={{
                        display: "block",
                        padding: "9px 42px",
                        color: location.pathname === child.path ? "#f9cb40" : "#fff",
                        background: location.pathname === child.path ? "#2a0516" : "none",
                        textDecoration: "none",
                        borderBottom: "1px solid #75625a"
                      }}
                    >
                      {child.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Link
              to={item.path}
              style={{
                display: "block",
                fontWeight: 600,
                padding: "13px 20px",
                color: location.pathname === item.path ? "#f9cb40" : "#fff",
                background: location.pathname === item.path ? "#2a0516" : "none",
                textDecoration: "none",
                borderBottom: "1px solid #806c63"
              }}
            >
              {item.title}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
