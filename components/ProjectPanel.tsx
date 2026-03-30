"use client";

import { useState } from "react";
import { goToHisuiLogin } from "@/lib/auth.front";
import { useAuthUser } from "@/lib/auth.user";
import { IconSettings, TEAL } from "@/components/icons";

export default function ProjectPanel() {
  const [activeTab, setActiveTab] = useState<"project" | "files" | "export">("project");
  const { user, loading, isLoggedIn, logoutUser } = useAuthUser();

  return (
    <aside
      style={{
        width: 260,
        minHeight: "100vh",
        background: "#ffffff",
        borderRight: "1px solid #e8e8e8",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Noto Sans JP', sans-serif",
      }}
    >
      <div
        style={{
          padding: "20px",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        <img
          src="https://pub-87b7ceb69f934edca6a352e5586daa82.r2.dev/hisui_video_ロゴ_03.png"
          alt="Hisui AI Logo"
          style={{
            height: 36,
            width: "auto",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
      
     {/*ログインステータス*/}
      <div
        style={{
          padding: "10px 10px 0px 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {/* アイコン */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: `${TEAL}22`,
            border: `2px solid ${TEAL}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: TEAL,
            fontSize: 16,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {user?.iconUrl ? (
            <img
              src={user.iconUrl}
              alt={user.name ?? "User"}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            "✦"
          )}
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: "#777" }}>...</div>
        ) : isLoggedIn ? (
          <>
            {/* ユーザー名 */}
            <span style={{ fontSize: 13, color: "#333", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.name ?? "ユーザー"}
            </span>
            {/* ログアウトアイコン */}
            <button
  onClick={async () => {
    await logoutUser();
    goToHisuiLogin();
  }}
  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#aaa", display: "flex", alignItems: "center", flexShrink: 0 }}
  title="ログアウト"
>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>
                <path d="M11 11l3-3-3-3"/>
                <path d="M14 8H6"/>
              </svg>
            </button>
            {/* プランバッジ */}
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#e6f4ea", color: "#2e7d32", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
              {user?.plan?.replace("プラン", "").trim() ?? "プラン"}
            </span>
          </>
        ) : (
          <>
            {/* ログインしてください */}
            <span style={{ fontSize: 11, color: "#999", flex: 1 }}>
              ログインしてください
            </span>
            {/* ログインボタン */}
            <button
              onClick={goToHisuiLogin}
              style={{ padding: "6px 10px", fontSize: 13, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fff", color: "#333", cursor: "pointer", flexShrink: 0 }}
            >
              ログイン
            </button>
          </>
        )}
      </div>

      <div style={{ padding: "10px 10px 0px", borderTop: "1px solid #f0f0f0", marginTop: 8 }}>
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
                  background: "#fff",
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

      <div style={{ flex: 1, padding: "10px" }}>
        <div
          style={{
            minHeight: 260,
            borderRadius: "10px",
            background: "#fafafa",
          }}
        />
      </div>
    </aside>
  );
}