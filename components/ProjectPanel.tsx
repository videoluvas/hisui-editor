
import { useState } from "react";
const isLoggedIn = false;

type Tab = "all" | "images" | "audio";

const files = [
  { name: "source.png", type: "images" as const },
  { name: "logo.png", type: "images" as const },
  { name: "bgm.mp3", type: "audio" as const },
];

const tabs: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "images", label: "Images" },
  { id: "audio", label: "Audio" },
];

// Simple SVG icons
const IconStoryboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="10,8 16,12 10,16" />
  </svg>
);
const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);
const IconPlan = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
const IconBell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16,17 21,12 16,7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const TEAL = "#2aab8e";



export default function ProjectPanel() {
  const [activeTab, setActiveTab] = useState<"project" | "files" | "export">("project");

  return (
    <aside style={{
      width: 260,
      minHeight: "100vh",
      background: "#ffffff",
      borderRight: "1px solid #e8e8e8",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Noto Sans JP', sans-serif",
    }}>



      {/* Logo */}
      <div style={{
        padding: "20px",
        borderBottom: "1px solid #f0f0f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start"
      }}>
        <img
          src="https://pub-87b7ceb69f934edca6a352e5586daa82.r2.dev/hisui_video_ロゴ_03.png"
          alt="Hisui AI Logo"
          style={{
            height: 36,
            width: "auto",
            objectFit: "contain",
            display: "block"
          }}
        />
      </div>

      {/* User info */}
      <div style={{
        padding: "10px 10px 0px 10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        {/* 左：アイコン */}
        <div style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: `${TEAL}22`,
          border: `2px solid ${TEAL}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: TEAL,
          fontSize: 16
        }}>
          ✦
        </div>

        {/* 右：ボタン */}
        {isLoggedIn ? (
          <button style={{
            padding: "6px 12px",
            fontSize: 13,
            border: "1px solid #e0e0e0",
            borderRadius: 8,
            background: "#fff",
            color: "#333",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}>
            <IconSettings /> プロフィール
          </button>
        ) : (
          <button style={{
            padding: "6px 12px",
            fontSize: 13,
            border: "1px solid #e0e0e0",
            borderRadius: 8,
            background: "#fff",
            color: "#333",
            cursor: "pointer"
          }}>
            ログイン
          </button>
        )}
      </div>

      {/* Top tabs */}
      <div style={{ padding: "10px 10px 0px",  borderTop: "1px solid #f0f0f0", marginTop: 8 }}>
        <div style={{ display: "flex", gap: 1 }}>
          {[
            { id: "project", label: "プロジェクト" },
            { id: "files", label: "ファイル" },
            { id: "export", label: "書き出し" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as "project" | "files" | "export")}
                style={{
                  flex: 1,
                  height: 38,
                  fontSize: 12,
                  fontWeight: 600,

                  borderRadius: "10px 10px 0 0",
                  border: "none",
                  borderBottom: isActive ? `2px solid ${TEAL}` : "2px solid transparent",

                  background: isActive ? "#fff" : "#fff" ,
                  color: isActive ? "#222" : "#777",

                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty container */}
      <div style={{ flex: 1,  padding: "10px" }}>
        <div
          style={{
            minHeight: 260,
            borderRadius: "10px",
            background: "#fafafa",
          }}
        />
      </div></aside>);
}