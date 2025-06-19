import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const menu = [
  {
    title: "Vaults",
    children: ["Digital Platforms"]
  },
  {
    title: "Messages",
    children: ["Personal Messages", "Last Goodbyes", "Videos"]
  },
  {
    title: "Legal",
    children: ["Important Documents", "Secure E-Will"]
  },
  {
    title: "Personal",
    children: ["Organ Donation", "Funeral Planning", "Memory Lane", "Belongings"]
  },
  {
    title: "Proof of Life"
  },
  {
    title: "Contacts"
  }
];

export default function Sidebar() {
  const [open, setOpen] = useState({});
  const navigate = useNavigate();

  // Toggle accordion section
  const handleToggle = idx => {
    setOpen(open => ({ ...open, [idx]: !open[idx] }));
  };

  // Handles menu clicks (except for Personal Messages)
  const handlePlaceholder = (title) => {
    alert(`"${title}" page is coming soon!`);
  };

  return (
    <aside style={{
      width: 270,
      background: "#645155",
      color: "#fff",
      minHeight: "100vh",
      padding: "30px 0",
      boxSizing: "border-box",
      fontFamily: "inherit"
    }}>
      <div style={{ fontWeight: 700, fontSize: 23, padding: "0 26px 28px" }}>
        LastWishBox
      </div>
      <nav>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {menu.map((section, idx) => (
            <li key={section.title} style={{ marginBottom: 6 }}>
              <div
                onClick={() =>
                  section.children
                    ? handleToggle(idx)
                    : section.title === "Proof of Life" || section.title === "Contacts"
                    ? handlePlaceholder(section.title)
                    : null
                }
                style={{
                  cursor: section.children || section.title === "Proof of Life" || section.title === "Contacts"
                    ? "pointer"
                    : "default",
                  fontWeight: 600,
                  padding: "11px 26px",
                  background: open[idx] ? "#80646b" : "none",
                  borderRadius: 8,
                  transition: "background 0.2s"
                }}
              >
                {section.title}
                {section.children && (
                  <span style={{
                    float: "right",
                    fontSize: 14,
                    transform: open[idx] ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.2s"
                  }}>
                    ▶
                  </span>
                )}
              </div>
              {section.children && open[idx] && (
                <ul style={{ paddingLeft: 18, margin: 0 }}>
                  {section.children.map(child => (
                    <li key={child} style={{ padding: "6px 0 6px 10px", cursor: "pointer", color: "#fff", fontSize: 16 }}>
                      {child === "Personal Messages" ? (
                        // Navigate to /personal-messages for this item
                        <span
                          onClick={() => navigate("/personal-messages")}
                          style={{ textDecoration: "underline", color: "#ffcf70", cursor: "pointer" }}
                        >
                          {child}
                        </span>
                      ) : (
                        <span onClick={() => handlePlaceholder(child)} style={{ opacity: 0.82 }}>
                          {child}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
