"use client";

import { useState } from "react";
import { goToHisuiLogin } from "@/lib/auth.front";
import { useAuthUser } from "@/lib/auth.user";
import { IconSettings, TEAL } from "@/components/icons";

export default function ProjectPanel() {
  const [activeTab, setActiveTab] = useState<"project" | "files" | "export">("project");
  const { user, loading, isLoggedIn } = useAuthUser();

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

      <div
        style={{
          padding: "10px 10px 0px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
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
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            "✦"
          )}
        </div>

        {loading ? (
          <div
            style={{
              padding: "6px 12px",
              fontSize: 13,
              color: "#777",
            }}
          >
            ...
          </div>
        ) : isLoggedIn ? (
          <button
            style={{
              padding: "6px 12px",
              fontSize: 13,
              border: "1px solid #e0e0e0",
              borderRadius: 8,
              background: "#fff",
              color: "#333",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              maxWidth: 170,
            }}
          >
            <IconSettings />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.name ?? "プロフィール"}
            </span>
          </button>
        ) : (
          <button
            onClick={goToHisuiLogin}
            style={{
              padding: "6px 12px",
              fontSize: 13,
              border: "1px solid #e0e0e0",
              borderRadius: 8,
              background: "#fff",
              color: "#333",
              cursor: "pointer",
            }}
          >
            ログイン
          </button>
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