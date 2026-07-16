"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { goToHisuiLogin } from "@/lib/auth.front";
import { useAuthUser } from "@/lib/auth.user";
import { TEAL } from "@/components/icons";
import { useIsMobile } from "@/lib/useIsMobile";
import SidePanelFiles    from "@/components/SidePanelFiles";
import SidePanelExport   from "@/components/SidePanelExport";
import type { ExportProgressInfo } from "@/components/SidePanelExport";
import type { GenMeta } from "@/lib/gen.meta";
import SidePanelConteProject from "@/components/SidePanelConteProject";
import SidePanelConvert  from "@/components/SidePanelConvert";
import WorkspaceBar      from "@/components/WorkspaceBar";
import UserDashboardModal from "@/components/UserDashboardModal";
import type { Project } from "@/lib/project.api";

export type AppMode = "video" | "conte";

type VideoTab  = "project" | "files" | "export";
type ConteTab  = "conte"   | "files" | "convert";
type AnyTab    = VideoTab | ConteTab;

const VIDEO_TABS: { id: VideoTab; label: string }[] = [
  { id: "project", label: "プロジェクト" },
  { id: "files",   label: "ファイル"     },
  { id: "export",  label: "書き出し"     },
];
const CONTE_TABS: { id: ConteTab; label: string }[] = [
  { id: "conte",   label: "プロジェクト" },
  { id: "files",   label: "ファイル" },
  { id: "convert", label: "変換"   },
];

type SidePanelProps = {
  selectedProjectId?: string | null;
  selectedProject?: Project | null;
  onSelectProject?: (project: Project | null) => void;
  onExportLocal?: () => void | Promise<void>;
  onExportApi?: (cb: (info: ExportProgressInfo) => void) => Promise<void>;
  isExporting?: boolean;
  isProjectLoading?: boolean;
  exportError?: string | null;
  appMode?: AppMode;
  onAppModeChange?: (mode: AppMode) => void;
  selectedStoryboardId?: string | null;
  onSelectStoryboard?: (id: string) => void;
  selectedWorkspaceId?: string | null;
  onSelectWorkspace?: (id: string, name: string) => void;
  onFileDoubleClick?: (fileUrl: string, meta: GenMeta | null) => void;
  isOpen?: boolean;
  onClose?: () => void;
};

export default function SidePanel({
  selectedProjectId = null,
  selectedProject   = null,
  onSelectProject,
  onExportLocal,
  onExportApi,
  isExporting        = false,
  isProjectLoading   = false,
  exportError        = null,
  appMode            = "video",
  onAppModeChange,
  selectedStoryboardId = null,
  onSelectStoryboard,
  selectedWorkspaceId  = null,
  onSelectWorkspace,
  onFileDoubleClick,
  isOpen  = false,
  onClose,
}: SidePanelProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<AnyTab>("project");
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(() => {
    try { return localStorage.getItem("hisui_header_collapsed") === "1"; } catch { return false; }
  });
  const { user, loading, isLoggedIn, logoutUser, refreshUser } = useAuthUser();
  const router = useRouter();

  const [credits, setCredits] = useState<number | null>(null);

  const fetchCredits = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch("/api/user/credits", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (data.ok) setCredits(data.credits as number);
    } catch {}
  }, [isLoggedIn]);

  useEffect(() => {
    fetchCredits();
    const id = setInterval(fetchCredits, 60_000);
    return () => clearInterval(id);
  }, [fetchCredits]);

  const toggleHeader = () => {
    setHeaderCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem("hisui_header_collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  };

  // モード切替時にタブを既定値にリセット
  useEffect(() => {
    setActiveTab(appMode === "video" ? "project" : "conte");
  }, [appMode]);

  const tabs = appMode === "video" ? VIDEO_TABS : CONTE_TABS;

  return (
    <>
      {/* モバイル：オーバーレイ */}
      {isMobile && isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 999,
          }}
        />
      )}
    <aside
      style={{
        width: isMobile ? "min(80vw, 300px)" : 260,
        alignSelf: isMobile ? undefined : "stretch",
        height: isMobile ? "100dvh" : undefined,
        background: "#ffffff",
        borderRight: "1px solid #e8e8e8",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Noto Sans JP', sans-serif",
        overflow: "hidden",
        position: isMobile ? "fixed" : "relative",
        top: isMobile ? 0 : undefined,
        left: isMobile ? 0 : undefined,
        zIndex: isMobile ? 1000 : 10,
        transform: isMobile ? (isOpen ? "translateX(0)" : "translateX(-100%)") : undefined,
        transition: isMobile ? "transform 0.25s ease" : undefined,
        boxShadow: isMobile && isOpen ? "4px 0 24px rgba(0,0,0,0.18)" : undefined,
      }}
    >
      {/* モバイル：閉じるボタン */}
      {isMobile && (
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 10, right: 10, zIndex: 10,
            width: 32, height: 32, border: "none", background: "#f1f5f9",
            borderRadius: 8, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", color: "#64748b",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 1l12 12M13 1L1 13"/>
          </svg>
        </button>
      )}

      {/* Logo + User bar（折りたたみ可） */}
      <div style={{ borderBottom: "1px solid #f0f0f0", overflow: "hidden", transition: "max-height 0.25s ease", maxHeight: headerCollapsed ? 0 : 200 }}>
        {/* Logo */}
        <div style={{ padding: "14px 14px 0", display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
          <img
            src="https://assets.hisui-ai.com/system/img/hisui_video_%E3%83%AD%E3%82%B4_01.png"
            alt="Hisui AI Logo"
            style={{ height: 24, width: "auto", objectFit: "contain", display: "block" }}
          />
        </div>

        {/* User bar */}
        <div
          onClick={() => isLoggedIn && setDashboardOpen(true)}
          style={{
            padding: "10px 10px 12px 10px", display: "flex", alignItems: "center", gap: 8,
            cursor: isLoggedIn ? "pointer" : "default",
            borderRadius: 8, transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { if (isLoggedIn) (e.currentTarget as HTMLDivElement).style.background = "#f8fafc"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
          title={isLoggedIn ? "ダッシュボードを開く" : undefined}
        >
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${TEAL}22`, border: `2px solid ${TEAL}`, display: "flex", alignItems: "center", justifyContent: "center", color: TEAL, fontSize: 16, overflow: "hidden", flexShrink: 0 }}>
            {user?.iconUrl
              ? <img src={user.iconUrl} alt={user.name ?? "User"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              : "✦"}
          </div>

          {loading ? (
            <div style={{ fontSize: 13, color: "#777" }}>...</div>
          ) : isLoggedIn ? (
            <>
              <span style={{ fontSize: 13, color: "#333", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.name ?? "ユーザー"}
              </span>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#e6f4ea", color: "#2e7d32", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                {user?.plan === "Free" || !user?.plan ? "無料" : (user.plan.replace("プラン", "").trim())}
              </span>
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); router.push("/auth"); }}
              style={{ flex: 1, padding: "7px 10px", fontSize: 12, fontWeight: 700, border: `1px solid ${TEAL}`, borderRadius: 8, background: TEAL, color: "#fff", cursor: "pointer" }}
            >
              ログイン / 新規登録
            </button>
          )}
        </div>

        {/* クレジット残数ミニ表示 */}
        {isLoggedIn && credits !== null && (
          <div
            onClick={() => setDashboardOpen(true)}
            style={{
              margin: "0 10px 10px", padding: "6px 10px", cursor: "pointer",
              background: credits < 200 ? "#fef2f2" : "#f8fafc",
              border: `1px solid ${credits < 200 ? "#fecaca" : "#f1f5f9"}`,
              borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
            title={credits < 500 ? "クレジットが少なくなっています。クリックして確認" : "クリックしてダッシュボードを開く"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {credits < 200 && <span style={{ fontSize: 10 }}>⚠️</span>}
              <span style={{ fontSize: 10, color: credits < 200 ? "#b91c1c" : "#94a3b8", fontWeight: 600 }}>
                {credits < 200 ? "残量注意" : "残クレジット"}
              </span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: credits < 500 ? "#ef4444" : credits < 2000 ? "#f59e0b" : "#169385" }}>
              {credits.toLocaleString()} cr
            </span>
          </div>
        )}
        {isLoggedIn && credits !== null && credits < 500 && credits >= 200 && (
          <div style={{ margin: "-6px 10px 10px", fontSize: 10, color: "#f59e0b", textAlign: "right", paddingRight: 2 }}>
            残りわずかです
          </div>
        )}
      </div>

      {/* 折りたたみトグル */}
      <button
        onClick={toggleHeader}
        title={headerCollapsed ? "プロフィールを展開" : "プロフィールを折りたたむ"}
        style={{
          width: "100%", padding: "3px 0", border: "none", background: "none",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: "#c0cad6", borderBottom: "1px solid #f0f0f0",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = TEAL; (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#c0cad6"; (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
      >
        <svg width="14" height="8" viewBox="0 0 14 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: "transform 0.25s", transform: headerCollapsed ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M1 6.5L7 1.5L13 6.5"/>
        </svg>
      </button>

      {dashboardOpen && (
        <UserDashboardModal
          onClose={() => { setDashboardOpen(false); fetchCredits(); }}
          onLogout={async () => { setDashboardOpen(false); await logoutUser(); goToHisuiLogin(); }}
          userIconUrl={user?.iconUrl}
          userName={user?.name}
          onProfileUpdated={() => refreshUser()}
        />
      )}

      {/* Mode switcher */}
      <div style={{ padding: "10px 10px 6px" }}>
        <div style={{ display: "flex", gap: 4, background: "#f0f0f0", borderRadius: 10, padding: 3 }}>
          {([ { id: "conte", label: "コンテ作成" }, { id: "video", label: "動画編集" } ] as const).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onAppModeChange?.(m.id)}
              style={{
                flex: 1, height: 30, fontSize: 12, fontWeight: 600, borderRadius: 8, border: "none",
                background: appMode === m.id ? "#fff" : "transparent",
                color: appMode === m.id ? TEAL : "#999",
                boxShadow: appMode === m.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                cursor: "pointer", transition: "all 0.15s ease",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Workspace bar */}
      <WorkspaceBar
        selectedWorkspaceId={selectedWorkspaceId}
        onSelectWorkspace={onSelectWorkspace ?? (() => {})}
        onCreated={(sbId, proj) => {
          onAppModeChange?.("conte");
          if (sbId) onSelectStoryboard?.(sbId);
          if (proj) onSelectProject?.(proj);
        }}
        isLoggedIn={loading ? undefined : isLoggedIn}
      />

      {/* Tabs */}
      <div style={{ padding: "6px 10px 0px", borderTop: "1px solid #f0f0f0", marginTop: 4 }}>
        <div style={{ display: "flex", gap: 1 }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{ flex: 1, height: 38, fontSize: 12, fontWeight: 600, borderRadius: "10px 10px 0 0", border: "none", borderBottom: isActive ? `2px solid ${TEAL}` : "2px solid transparent", background: "#fff", color: isActive ? "#222" : "#777", cursor: "pointer", transition: "all 0.2s ease" }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* ── 動画編集タブ ── */}
        {activeTab === "project" && (
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "10px" }}>
            <SidePanelConteProject
              selectedStoryboardId={selectedStoryboardId}
              onSelectStoryboard={onSelectStoryboard ?? (() => {})}
              selectedProjectId={selectedProjectId}
              onSelectProject={onSelectProject ?? (() => {})}
              onSwitchToVideo={() => onAppModeChange?.("video")}
              onSwitchToConte={() => onAppModeChange?.("conte")}
              workspaceId={selectedWorkspaceId}
            />
          </div>
        )}
        {activeTab === "export" && (
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "10px" }}>
            <SidePanelExport
              selectedProject={selectedProject}
              onExportLocal={onExportLocal ?? (() => {})}
              onExportApi={onExportApi ?? (async (_cb) => {})}
              isExporting={isExporting}
              isProjectLoading={isProjectLoading}
              exportError={exportError}
              onOpenDashboard={() => setDashboardOpen(true)}
            />
          </div>
        )}

        {/* ── コンテ作成：プロジェクトタブ ── */}
        {activeTab === "conte" && (
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "10px" }}>
            <SidePanelConteProject
              selectedStoryboardId={selectedStoryboardId}
              onSelectStoryboard={onSelectStoryboard ?? (() => {})}
              selectedProjectId={selectedProjectId}
              onSelectProject={onSelectProject ?? (() => {})}
              onSwitchToVideo={() => onAppModeChange?.("video")}
              onSwitchToConte={() => onAppModeChange?.("conte")}
              workspaceId={selectedWorkspaceId}
            />
          </div>
        )}
        {activeTab === "convert" && (
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "10px" }}>
            <SidePanelConvert
              selectedStoryboardId={selectedStoryboardId}
              onProjectCreated={(project) => {
                onSelectProject?.(project);
                onAppModeChange?.("video");
              }}
            />
          </div>
        )}

        {/* ── 共通：ファイル ── */}
        {activeTab === "files" && (
          <div style={{ flex: 1, height: 0, overflowY: "auto", overflowX: "hidden", padding: "10px", display: "flex", flexDirection: "column" }}>
            <SidePanelFiles
              selectedProjectId={selectedProjectId}
              workspaceId={selectedWorkspaceId}
              onFileDoubleClick={onFileDoubleClick}
            />
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
