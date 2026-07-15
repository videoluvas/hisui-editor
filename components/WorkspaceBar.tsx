"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TEAL } from "@/components/icons";
import { useIsMobile } from "@/lib/useIsMobile";
import { listWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace } from "@/lib/workspace.api";
import type { WorkspaceItem } from "@/lib/workspace.api";
import WorkspaceSettingsModal from "@/components/WorkspaceSettingsModal";

const FONT = "'Noto Sans JP', sans-serif";

function FolderIcon({ active }: { active?: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: active ? TEAL : "#64748b" }}>
      <path d="M1 3.5a1 1 0 0 1 1-1h3l1.5 1.5H12a1 1 0 0 1 1 1V10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3.5z"/>
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
      <path d="M3 4.5l3 3 3-3"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M7 2v10M2 7h10"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6l3 3 5-5"/>
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 1.5l2 2L4 10H2V8L8.5 1.5z"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h8M5 3V2h2v1M4 3v6a.5.5 0 0 0 .5.5h3A.5.5 0 0 0 8 9V3"/>
    </svg>
  );
}

function GearIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.34.07-.68.07-1.08s-.03-.74-.07-1.08l2.32-1.84c.21-.16.27-.47.12-.7l-2.2-3.82c-.14-.23-.44-.3-.67-.23l-2.73 1.1c-.57-.44-1.18-.81-1.85-1.08L14.09 2H9.91L9.5 4.83C8.83 5.1 8.22 5.47 7.65 5.91L4.92 4.81c-.23-.07-.53 0-.67.23L2.05 8.86c-.14.23-.08.54.12.7l2.32 1.84C4.03 11.26 4 11.6 4 12s.03.74.07 1.08l-2.32 1.84c-.21.16-.27.47-.12.7l2.2 3.82c.14.23.44.3.67.23l2.73-1.1c.57.44 1.18.81 1.85 1.08L9.91 22h4.18l.41-2.83c.67-.27 1.28-.64 1.85-1.08l2.73 1.1c.23.07.53 0 .67-.23l2.2-3.82c.14-.23.08-.54-.12-.7l-2.32-1.84Z"/>
    </svg>
  );
}

// ─── WorkspaceBar ─────────────────────────────────────────────────────────────

type Props = {
  selectedWorkspaceId: string | null;
  onSelectWorkspace: (id: string, name: string) => void;
  onCreated?: () => void;
  isLoggedIn?: boolean;
};

export default function WorkspaceBar({ selectedWorkspaceId, onSelectWorkspace, onCreated, isLoggedIn }: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [workspaces, setWorkspaces]     = useState<WorkspaceItem[]>([]);
  const [loaded, setLoaded]             = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [creating, setCreating]         = useState(false);
  const [newName, setNewName]           = useState("");
  const [renamingId, setRenamingId]     = useState<string | null>(null);
  const [renameValue, setRenameValue]   = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dropdownRef    = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listWorkspaces().then((res) => {
      if (res.ok) {
        setWorkspaces(res.workspaces);
        if (res.workspaces.length > 0 && !selectedWorkspaceId) {
          onSelectWorkspace(res.workspaces[0].id, res.workspaces[0].name);
        }
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setCreating(false);
        setRenamingId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedWs = workspaces.find((w) => w.id === selectedWorkspaceId) ?? null;

  const handleCreate = async () => {
    const name = newName.trim() || "新しいワークスペース";
    const res = await createWorkspace(name);
    if (res.ok && res.workspace) {
      setWorkspaces((prev) => [res.workspace!, ...prev]);
      onSelectWorkspace(res.workspace!.id, name);
      onCreated?.();
    }
    setNewName("");
    setCreating(false);
    setDropdownOpen(false);
  };

  const startRename = (ws: WorkspaceItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(ws.id);
    setRenameValue(ws.name);
    setTimeout(() => renameInputRef.current?.focus(), 30);
  };

  const commitRename = async () => {
    if (!renamingId) return;
    const name = renameValue.trim() || "ワークスペース";
    setWorkspaces((prev) => prev.map((w) => w.id === renamingId ? { ...w, name } : w));
    setRenamingId(null);
    await updateWorkspace(renamingId, name);
  };

  const handleDelete = async (ws: WorkspaceItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`「${ws.name}」を削除しますか？\n（コンテ・プロジェクト・ファイルは削除されません）`)) return;
    const res = await deleteWorkspace(ws.id);
    if (res.ok) {
      const next = workspaces.filter((w) => w.id !== ws.id);
      setWorkspaces(next);
      if (selectedWorkspaceId === ws.id && next.length > 0) {
        onSelectWorkspace(next[0].id, next[0].name);
      }
    }
  };

  // ─── ワークスペース未作成：未ログインはログインページへ、ログイン済みは作成モーダル ───
  if (loaded && workspaces.length === 0) {
    if (isLoggedIn === false) {
      router.replace("/auth");
      return null;
    }
    return (
      <>
        <div style={{ padding: "6px 10px 0", fontFamily: FONT }}>
          <div style={{ height: 32, borderRadius: 8, background: "#f1f5f9" }} />
        </div>

        <div style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
          zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24, fontFamily: FONT,
        }}>
          <div style={{
            background: "#fff", borderRadius: 20, width: "100%", maxWidth: 400,
            padding: "32px 28px 28px", boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
            display: "flex", flexDirection: "column", gap: 20,
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: `${TEAL}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 7a2 2 0 0 1 2-2h4l2 2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z"/>
                  <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
                </svg>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>ワークスペースを作成</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, lineHeight: 1.6 }}>
                  コンテ・シーケンス・ファイルを管理する<br/>ワークスペースが必要です
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>ワークスペース名</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例：プロジェクトA、クライアント名 など"
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                autoFocus
                style={{
                  width: "100%", border: `1.5px solid ${TEAL}55`, borderRadius: 10,
                  background: "#f8fafd", fontSize: 13, color: "#1e293b",
                  padding: "10px 12px", outline: "none", fontFamily: FONT,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              onClick={handleCreate}
              style={{
                width: "100%", padding: "12px", fontSize: 14, fontWeight: 700,
                borderRadius: 10, border: "none",
                background: `linear-gradient(135deg, ${TEAL}, #0d7a6e)`,
                color: "#fff", cursor: "pointer", fontFamily: FONT,
                boxShadow: `0 4px 14px ${TEAL}44`,
              }}
            >
              作成してはじめる
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ padding: "6px 10px 0", position: "relative", fontFamily: FONT }}>
        <div ref={dropdownRef} style={{ position: "relative" }}>

          {/* トリガーボタン */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              type="button"
              onClick={() => { setDropdownOpen((o) => !o); setCreating(false); setRenamingId(null); }}
              style={{
                flex: 1, display: "flex", alignItems: "center", gap: 6,
                padding: isMobile ? "9px 10px" : "6px 9px", borderRadius: 8,
                border: `1px solid ${selectedWs ? `${TEAL}44` : "#e2e8f0"}`,
                background: `${TEAL}09`,
                cursor: "pointer", fontFamily: FONT,
              }}
            >
              <FolderIcon active />
              {!isMobile && (
                <span style={{
                  flex: 1, textAlign: "left", fontSize: 12, fontWeight: 600,
                  color: TEAL, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {selectedWs?.name ?? "ワークスペースを選択"}
                </span>
              )}
              {isMobile && selectedWs && (
                <span style={{
                  flex: 1, textAlign: "left", fontSize: 11, fontWeight: 600,
                  color: TEAL, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  maxWidth: 80,
                }}>
                  {selectedWs.name}
                </span>
              )}
              <span style={{ color: "#94a3b8", display: "flex" }}><ChevronIcon open={dropdownOpen} /></span>
            </button>

            {/* 設定ボタン */}
            {selectedWs && (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                title="ワークスペースの設定"
                style={{
                  width: isMobile ? 36 : 30, height: isMobile ? 36 : 30,
                  flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafd",
                  color: "#94a3b8", cursor: "pointer",
                }}
              >
                <GearIcon size={14} />
              </button>
            )}
          </div>

          {/* ドロップダウン */}
          {dropdownOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
              background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
              boxShadow: "0 6px 24px rgba(0,0,0,0.1)", zIndex: 200, overflow: "hidden",
            }}>

              {workspaces.map((ws) => {
                const isSelected = ws.id === selectedWorkspaceId;
                const isRenaming = renamingId === ws.id;
                return (
                  <div
                    key={ws.id}
                    onClick={() => { if (!isRenaming) { onSelectWorkspace(ws.id, ws.name); setDropdownOpen(false); } }}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 12px",
                      background: isSelected ? `${TEAL}09` : "transparent",
                      cursor: isRenaming ? "default" : "pointer",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <span style={{ color: isSelected ? TEAL : "#64748b", display: "flex", flexShrink: 0 }}>
                      <FolderIcon active={isSelected} />
                    </span>
                    {isRenaming ? (
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingId(null); }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ flex: 1, border: `1px solid ${TEAL}`, borderRadius: 4, background: "#fff", fontSize: 12, fontWeight: 600, color: "#1e293b", padding: "2px 4px", outline: "none", fontFamily: FONT }}
                      />
                    ) : (
                      <span style={{ flex: 1, fontSize: 12, fontWeight: isSelected ? 700 : 400, color: isSelected ? TEAL : "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ws.name}
                      </span>
                    )}
                    {!isRenaming && (
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <span onClick={(e) => startRename(ws, e)} style={{ color: "#cbd5e1", cursor: "pointer", display: "flex" }} title="名前を変更">
                          <PencilIcon />
                        </span>
                        <span onClick={(e) => handleDelete(ws, e)} style={{ color: "#fca5a5", cursor: "pointer", display: "flex" }} title="削除">
                          <TrashIcon />
                        </span>
                      </div>
                    )}
                    {isSelected && !isRenaming && (
                      <span style={{ color: TEAL, display: "flex", flexShrink: 0 }}><CheckIcon /></span>
                    )}
                  </div>
                );
              })}

              {/* 新規作成エリア */}
              <div style={{ padding: "8px 10px" }}>
                {creating ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="ワークスペース名"
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
                      autoFocus
                      style={{ flex: 1, border: `1px solid ${TEAL}`, borderRadius: 6, background: "#f8fafd", fontSize: 12, color: "#1e293b", padding: "5px 8px", outline: "none", fontFamily: FONT }}
                    />
                    <button
                      onClick={handleCreate}
                      style={{ padding: "5px 10px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", background: TEAL, color: "#fff", cursor: "pointer", whiteSpace: "nowrap", fontFamily: FONT }}
                    >
                      作成
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setCreating(true); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 2px", border: "none", background: "transparent",
                      cursor: "pointer", fontFamily: FONT, color: "#64748b",
                    }}
                  >
                    <span style={{ display: "flex" }}><PlusIcon /></span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>新しいワークスペース</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 設定モーダル */}
      {settingsOpen && selectedWs && (
        <WorkspaceSettingsModal
          defaultTab="general"
          workspaceId={selectedWs.id}
          workspaceName={selectedWs.name}
          onClose={() => setSettingsOpen(false)}
          onNameChanged={(newName) => {
            setWorkspaces((prev) => prev.map((w) => w.id === selectedWs.id ? { ...w, name: newName } : w));
          }}
        />
      )}
    </>
  );
}
