import React from "react";
import { useNavigate } from "react-router-dom";

// Each block has a `path` for navigation (update as needed!)
const serviceBlocks = [
  {
    title: "Vaults",
    img: "https://img.icons8.com/external-flatart-icons-outline-flatarticons/64/000000/external-vault-bank-flatart-icons-outline-flatarticons-1.png",
    desc: "Store digital platform logins and essential accounts in one secure, encrypted vault for your peace of mind.",
    path: "/vaults/digital-platforms"
  },
  {
    title: "Messages",
    img: "https://img.icons8.com/ios-filled/100/000000/message-group.png",
    desc: "Leave heartfelt personal messages, last goodbyes, and scheduled videos for your loved ones.",
    path: "/messages/personal-messages"
  },
  {
    title: "Legal",
    img: "https://img.icons8.com/ios-filled/100/000000/law.png",
    desc: "Upload important documents and create a secure digital will, all managed safely in the cloud.",
    path: "/legal/important-documents"
  },
  {
    title: "Personal",
    img: "https://img.icons8.com/ios-filled/100/000000/user-male-circle.png",
    desc: "Document organ donation, funeral wishes, memory lane stories, and track belongings for loved ones.",
    path: "/personal/organ-donation"
  },
  {
    title: "Proof of Life",
    img: "https://img.icons8.com/ios-filled/100/000000/fingerprint-scan.png",
    desc: "Add time-stamped proof of life content to verify your well-being or trigger legacy protocols.",
    path: "/proof-of-life"
  },
  {
    title: "Contacts",
    img: "https://img.icons8.com/ios-filled/100/000000/contacts.png",
    desc: "Manage trusted contacts who can access your wishes and be notified in case of emergencies.",
    path: "/contacts"
  }
];

export default function Homepage() {
  const navigate = useNavigate();

  return (
    <div style={{
      maxWidth: 1100,
      margin: "0 auto",
      padding: "38px 18px 55px 18px"
    }}>
      <div style={{
        fontSize: 32,
        fontWeight: 700,
        textAlign: "center",
        marginBottom: 16,
        color: "#2a0516"
      }}>
        Welcome to LastWishBox
      </div>
      <div style={{
        textAlign: "center",
        fontSize: 18,
        maxWidth: 600,
        margin: "0 auto 36px auto",
        color: "#333"
      }}>
        Your digital legacy, protected. Secure your accounts, messages, and final wishes in one trusted place.
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
          gap: 30,
          alignItems: "stretch"
        }}
      >
        {serviceBlocks.map((block) => (
          <article
            key={block.title}
            tabIndex={0}
            onClick={() => navigate(block.path)}
            onKeyDown={e => (e.key === "Enter" || e.key === " ") && navigate(block.path)}
            style={{
              background: "#fff",
              borderRadius: 18,
              boxShadow: "0 2px 16px 0 #2a05160c",
              padding: "34px 22px 26px 22px",
              textAlign: "center",
              transition: "transform 0.18s, box-shadow 0.18s",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minHeight: 320,
              outline: "none",
            }}
            className="home-block"
            aria-label={block.title}
          >
            <img
              src={block.img}
              alt={block.title}
              style={{
                width: 64,
                height: 64,
                marginBottom: 20,
                borderRadius: 16,
                background: "#f3e8f4"
              }}
            />
            <div style={{
              fontSize: 22,
              fontWeight: 600,
              marginBottom: 10,
              color: "#2a0516"
            }}>
              {block.title}
            </div>
            <div style={{
              fontSize: 16,
              color: "#645155",
              flex: 1
            }}>
              {block.desc}
            </div>
          </article>
        ))}
      </div>
      {/* Inline styles for focus/hover */}
      <style>{`
        .home-block:hover, .home-block:focus {
          transform: translateY(-6px) scale(1.04);
          box-shadow: 0 8px 24px 0 #2a05161a;
          outline: 2px solid #e97c13;
        }
      `}</style>
    </div>
  );
}
