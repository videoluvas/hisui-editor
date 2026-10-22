"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TEAL } from "@/components/icons";
import { useIsMobile } from "@/lib/useIsMobile";
import { listWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace, TOOL_TYPE_LABEL, TOOL_TYPE_DESC } from "@/lib/workspace.api";
import type { WorkspaceItem, SampleProject, ToolType } from "@/lib/workspace.api";
import WorkspaceSettingsModal from "@/components/WorkspaceSettingsModal";
import { peekOpenWorkspace } from "@/lib/pptxHandoff";

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

function ToolBadge({ toolType }: { toolType: ToolType }) {
  const pptx = toolType === "pptx";
  return (
    <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: pptx ? "#fff1e6" : `${TEAL}15`, color: pptx ? "#c2410c" : TEAL }}>
      {pptx ? "パワポ" : "コンテ"}
    </span>
  );
}

function ToolTypePicker({ value, onChange, options }: { value: ToolType; onChange: (t: ToolType) => void; options: ToolType[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
      {options.map((t) => {
        const active = value === t;
        const desc = TOOL_TYPE_DESC[t];
        return (
          <button
            key={t}
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(t); }}
            style={{
              padding: "14px 14px 12px", borderRadius: 12, textAlign: "left",
              border: `1.5px solid ${active ? TEAL : "#e2e8f0"}`, background: active ? `${TEAL}0b` : "#fff",
              cursor: "pointer", fontFamily: FONT, display: "flex", flexDirection: "column", gap: 6,
              boxShadow: active ? `0 0 0 3px ${TEAL}1f` : "none",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 14, height: 14, borderRadius: "50%", border: `1.5px solid ${active ? TEAL : "#cbd5e1"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {active && <span style={{ width: 7, height: 7, borderRadius: "50%", background: TEAL }} />}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: active ? TEAL : "#1e293b" }}>{TOOL_TYPE_LABEL[t]}</span>
            </span>
            <span style={{ fontSize: 11, color: "#475569", lineHeight: 1.6 }}>{desc.lead}</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {desc.points.map((p) => (
                <span key={p} style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.5 }}>・{p}</span>
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CreateWorkspaceModal({ first, submitting, onCreate, onClose, toolTypes }: {
  first: boolean;
  toolTypes: ToolType[];
  submitting: boolean;
  onCreate: (name: string, toolType: ToolType) => void;
  onClose?: () => void;
}) {
  const [name, setName]         = useState("");
  const [toolType, setToolType] = useState<ToolType>(toolTypes[0]);
  const submit = () => onCreate(name.trim() || "新しいワークスペース", toolType);

  return (
    <div
      onClick={first || submitting ? undefined : onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
        zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, fontFamily: FONT,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20, width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto",
          padding: "28px 24px 24px", boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
          display: "flex", flexDirection: "column", gap: 20, position: "relative", boxSizing: "border-box",
        }}
      >
        {!first && (
          <button type="button" onClick={onClose} disabled={submitting} aria-label="閉じる"
            style={{ position: "absolute", top: 12, right: 14, border: "none", background: "transparent", color: "#94a3b8", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>
            ×
          </button>
        )}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: `${TEAL}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 7a2 2 0 0 1 2-2h4l2 2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z"/>
              <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{first ? "ワークスペースを作成" : "新しいワークスペース"}</div>
            {first && (
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, lineHeight: 1.6 }}>
                コンテ・シーケンス・ファイルを管理する<br/>ワークスペースが必要です
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>ツール（作成後は変更できません）</label>
          <ToolTypePicker value={toolType} onChange={setToolType} options={toolTypes} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>ワークスペース名</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：プロジェクトA、クライアント名 など"
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            autoFocus
            disabled={submitting}
            style={{
              width: "100%", border: `1.5px solid ${TEAL}55`, borderRadius: 10,
              background: "#f8fafd", fontSize: 13, color: "#1e293b",
              padding: "10px 12px", outline: "none", fontFamily: FONT,
              boxSizing: "border-box",
            }}
          />
        </div>

        <button
          onClick={submit}
          disabled={submitting}
          style={{
            width: "100%", padding: "12px", fontSize: 14, fontWeight: 700,
            borderRadius: 10, border: "none",
            background: submitting ? "#94a3b8" : `linear-gradient(135deg, ${TEAL}, #0d7a6e)`,
            color: "#fff", cursor: submitting ? "not-allowed" : "pointer", fontFamily: FONT,
            boxShadow: submitting ? "none" : `0 4px 14px ${TEAL}44`,
          }}
        >
          {submitting ? "作成中..." : first ? "作成してはじめる" : "作成する"}
        </button>
      </div>
    </div>
  );
}

// ─── WorkspaceBar ─────────────────────────────────────────────────────────────

type Props = {
  selectedWorkspaceId: string | null;
  onSelectWorkspace: (id: string, name: string, toolType: ToolType) => void;
  onCreated?: (storyboardId: string | null, project: SampleProject | null, toolType: ToolType) => void;
  isLoggedIn?: boolean;
  allowedToolTypes?: ToolType[];
};

export default function WorkspaceBar({ selectedWorkspaceId, onSelectWorkspace, onCreated, isLoggedIn, allowedToolTypes = ["pptx"] }: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [workspaces, setWorkspaces]     = useState<WorkspaceItem[]>([]);
  const [loaded, setLoaded]             = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [creating, setCreating]         = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [renamingId, setRenamingId]     = useState<string | null>(null);
  const [renameValue, setRenameValue]   = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dropdownRef    = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listWorkspaces().then((res) => {
      if (res.ok) {
        const list = res.workspaces;
        // スタートページで取り込んだ場合は、そのワークスペースを開く
        const openId = peekOpenWorkspace();
        const pick = list.find((w) => w.id === openId) ?? list[0];
        setWorkspaces(list);
        if (pick && !selectedWorkspaceId) onSelectWorkspace(pick.id, pick.name, pick.toolType);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setRenamingId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedWs = workspaces.find((w) => w.id === selectedWorkspaceId) ?? null;

  const handleCreate = async (name: string, toolType: ToolType) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await createWorkspace(name, toolType);
      if (res.ok && res.workspace) {
        setWorkspaces((prev) => [res.workspace!, ...prev]);
        onSelectWorkspace(res.workspace!.id, name, res.workspace!.toolType);
        onCreated?.(res.sampleStoryboardId ?? null, res.sampleProject ?? null, res.workspace!.toolType);
      }
      setCreating(false);
      setDropdownOpen(false);
    } finally {
      setSubmitting(false);
    }
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
    if (!confirm(`「${ws.name}」を削除しますか？\nコンテ・プロジェクト・ファイルもすべて削除されます。`)) return;
    const res = await deleteWorkspace(ws.id);
    if (res.ok) {
      const next = workspaces.filter((w) => w.id !== ws.id);
      setWorkspaces(next);
      if (selectedWorkspaceId === ws.id && next.length > 0) {
        onSelectWorkspace(next[0].id, next[0].name, next[0].toolType);
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

        <CreateWorkspaceModal first submitting={submitting} onCreate={handleCreate} toolTypes={allowedToolTypes} />
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
              onClick={() => { setDropdownOpen((o) => !o); setRenamingId(null); }}
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
              {!isMobile && selectedWs && <ToolBadge toolType={selectedWs.toolType} />}
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
                    onClick={() => { if (!isRenaming) { onSelectWorkspace(ws.id, ws.name, ws.toolType); setDropdownOpen(false); } }}
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
                    {!isRenaming && <ToolBadge toolType={ws.toolType} />}
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

              <div style={{ padding: "8px 10px" }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); setCreating(true); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 2px", border: "none", background: "transparent",
                    cursor: "pointer", fontFamily: FONT, color: "#64748b",
                  }}
                >
                  <span style={{ display: "flex" }}><PlusIcon /></span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>新しいワークスペース</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {creating && (
        <CreateWorkspaceModal first={false} submitting={submitting} onCreate={handleCreate} onClose={() => setCreating(false)} toolTypes={allowedToolTypes} />
      )}

      {/* 設定モーダル */}
      {settingsOpen && selectedWs && (
        <WorkspaceSettingsModal
          defaultTab="general"
          workspaceId={selectedWs.id}
          workspaceName={selectedWs.name}
          toolType={selectedWs.toolType}
          onClose={() => setSettingsOpen(false)}
          onNameChanged={(newName) => {
            setWorkspaces((prev) => prev.map((w) => w.id === selectedWs.id ? { ...w, name: newName } : w));
          }}
        />
      )}
    </>
  );
}
