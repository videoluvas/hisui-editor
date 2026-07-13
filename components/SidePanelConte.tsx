"use client";

import { useEffect, useRef, useState } from "react";
import { TEAL } from "@/components/icons";
import { listStoryboards, createStoryboard, updateStoryboard, generateStoryboard } from "@/lib/storyboard.api";
import type { StoryboardListItem } from "@/lib/storyboard.api";

const CYAN = "#5184F0";
const FONT = "'Noto Sans JP', sans-serif";

type Props = {
  selectedStoryboardId: string | null;
  onSelectStoryboard: (id: string) => void;
  workspaceId?: string | null;
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

// ─── Flat SVG icons ───────────────────────────────────────────────────────────

function SparkleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M7.5 1v2M7.5 12v2M1 7.5h2M12 7.5h2M3.3 3.3l1.4 1.4M10.3 10.3l1.4 1.4M10.3 4.7l1.4-1.4M3.3 11.7l1.4-1.4"/>
      <circle cx="7.5" cy="7.5" r="2" fill="currentColor" stroke="none"/>
    </svg>
  );
}
function FolderPlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 4a1 1 0 0 1 1-1h3l1.5 1.5H13a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1V4z"/>
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
function DocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <rect x="2" y="1" width="10" height="12" rx="1.5"/><path d="M5 5h4M5 7.5h4M5 10h2.5"/>
    </svg>
  );
}
function MonitorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1.5" width="12" height="8.5" rx="1.5"/><path d="M5 12h4M7 10v2"/>
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1"/><rect x="9.5" y="1.5" width="5" height="5" rx="1"/>
      <rect x="1.5" y="9.5" width="5" height="5" rx="1"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/>
    </svg>
  );
}

const IconConte = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="28" height="32" rx="3" />
    <line x1="12" y1="4" x2="12" y2="36" /><line x1="12" y1="16" x2="34" y2="16" />
    <line x1="12" y1="26" x2="34" y2="26" /><line x1="23" y1="4" x2="23" y2="16" />
    <line x1="23" y1="16" x2="23" y2="26" />
    <circle cx="17.5" cy="10" r="2" strokeWidth="1.2" /><circle cx="28.5" cy="10" r="2" strokeWidth="1.2" />
    <path d="M14 21 l3-3 l3 3 l3-2.5" strokeWidth="1.2" />
    <line x1="15" y1="29" x2="31" y2="29" strokeWidth="1.2" /><line x1="15" y1="32" x2="26" y2="32" strokeWidth="1.2" />
  </svg>
);

// ─── AI Conte Popup ───────────────────────────────────────────────────────────


function AiContePopup({ onClose, onCreated, workspaceId }: {
  onClose: () => void;
  onCreated: (item: StoryboardListItem) => void;
  workspaceId?: string | null;
}) {
  const [conteName,   setConteName]   = useState("新しいコンテ");
  const [sourceText,  setSourceText]  = useState("");
  const [duration,    setDuration]    = useState(60);
  const [generating,  setGenerating]  = useState(false);
  const [genError,    setGenError]    = useState<string | null>(null);
  const [genStep,     setGenStep]     = useState<"idle" | "creating" | "generating" | "saving">("idle");

  const handleGenerate = async () => {
    if (generating || !sourceText.trim()) return;
    setGenerating(true);
    setGenError(null);
    setGenStep("creating");

    // 1. ストーリーボードを作成
    const createRes = await createStoryboard({ title: conteName.trim() || "新しいコンテ", workspaceId });
    if (!createRes.ok || !createRes.storyboard) {
      setGenError(createRes.message ?? "コンテの作成に失敗しました");
      setGenerating(false);
      setGenStep("idle");
      return;
    }

    const sbId = createRes.storyboard.id;
    setGenStep("generating");

    // 2. AI でシーンを生成
    const genRes = await generateStoryboard(sbId, {
      sourceText,
      duration,
      speed: "通常(1文字0.20秒)",
    });

    if (!genRes.ok) {
      setGenError(genRes.message ?? "AI生成に失敗しました");
      setGenerating(false);
      setGenStep("idle");
      return;
    }

    setGenStep("saving");
    await new Promise((r) => setTimeout(r, 300));

    const item: StoryboardListItem = {
      id: sbId,
      title: conteName.trim() || "新しいコンテ",
      status: "ready",
      updatedAt: new Date().toISOString(),
      sceneCount: genRes.sceneCount ?? 0,
    };
    onCreated(item);
    setGenerating(false);
    setGenStep("idle");
    onClose();
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (!generating && e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 500, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.18)", fontFamily: FONT }}>

        {/* ヘッダー */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px 0" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>原稿からAIがコンテ作成</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#94a3b8", lineHeight: 1, padding: "2px 6px", borderRadius: 4 }}>×</button>
        </div>

        {/* スクロール本体 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* コンテ名 */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 5 }}>コンテ名</label>
            <input
              value={conteName}
              onChange={(e) => setConteName(e.target.value)}
              placeholder="コンテのタイトルを入力"
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafd", fontSize: 13, color: "#1e293b", fontFamily: FONT, padding: "8px 10px", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* 元となる原稿 */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <span style={{ color: "#64748b", display: "flex" }}><DocIcon /></span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>ナレーションの元となる原稿</span>
            </div>
            <p style={{ margin: "0 0 7px", fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
              動画に入れたい情報をご入力ください。箇条書きやメモでも問題ありません。AIが最適化します。
            </p>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              rows={8}
              placeholder="例：当社はテクノロジーで社会の基盤を支えるを理念に..."
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafd", resize: "none", overflowY: "auto", fontSize: 12, color: "#334155", fontFamily: FONT, padding: "10px 12px", lineHeight: 1.7, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* 動画の尺 */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#64748b", display: "flex", flexShrink: 0 }}><MonitorIcon /></span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap" }}>動画の尺</span>
              <input
                type="range" min={15} max={600} step={5} value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                style={{ flex: 1, accentColor: CYAN, cursor: "pointer" }}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", minWidth: 44, textAlign: "right", flexShrink: 0 }}>{duration} 秒</span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 10, color: "#94a3b8" }}>
              5分以上の動画コンテが必要な方は、分割して出力してください
            </p>
          </div>

          {/* エラー表示 */}
          {genError && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#dc2626", lineHeight: 1.5 }}>
              {genError}
            </div>
          )}

          {/* 生成ボタン / 進捗表示 */}
          {generating ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <style>{`@keyframes ai-spin{to{transform:rotate(360deg)}}@keyframes ai-bar-pulse{0%,100%{opacity:.7}50%{opacity:1}}`}</style>

              {/* グラデーションボタン（進捗表示） */}
              <div style={{
                height: 52, borderRadius: 99,
                background: "linear-gradient(45deg, #5184F0, #169385)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                fontSize: 14, fontWeight: 700, fontFamily: FONT, letterSpacing: "0.02em",
                animation: "ai-bar-pulse 1.8s ease infinite",
                boxShadow: "0 4px 16px rgba(81,132,240,0.35)",
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation: "ai-spin 0.9s linear infinite", flexShrink: 0 }}>
                  <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
                  <path d="M10 2a8 8 0 0 1 8 8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                {genStep === "creating"   ? "コンテを準備中..."    :
                 genStep === "generating" ? "AIがナレーションを生成中..." :
                                           "シーンを保存中..."}
              </div>

              {/* ステップインジケーター */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "4px 6px" }}>
                {[
                  { key: "creating",   label: "コンテを準備",           sub: "ストーリーボードを作成しています" },
                  { key: "generating", label: "AIがナレーションを生成",  sub: "原稿からシーン構成を作成しています" },
                  { key: "saving",     label: "シーンに分割して保存",    sub: "生成結果を保存しています" },
                ].map(({ key, label, sub }) => {
                  const stepOrder = ["creating", "generating", "saving"];
                  const currentIdx = stepOrder.indexOf(genStep);
                  const thisIdx    = stepOrder.indexOf(key);
                  const done   = thisIdx < currentIdx;
                  const active = thisIdx === currentIdx;
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      {/* アイコン */}
                      <div style={{ width: 22, height: 22, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                        {done ? (
                          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                            <circle cx="11" cy="11" r="10" fill="#169385" fillOpacity="0.12"/>
                            <circle cx="11" cy="11" r="10" stroke="#169385" strokeWidth="1.5"/>
                            <path d="M7 11l3 3 5-5" stroke="#169385" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : active ? (
                          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ animation: "ai-spin 1s linear infinite" }}>
                            <circle cx="11" cy="11" r="9" stroke="#e2e8f0" strokeWidth="2.5"/>
                            <path d="M11 2a9 9 0 0 1 9 9" stroke="#5184F0" strokeWidth="2.5" strokeLinecap="round"/>
                          </svg>
                        ) : (
                          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                            <circle cx="11" cy="11" r="10" stroke="#e2e8f0" strokeWidth="1.5"/>
                          </svg>
                        )}
                      </div>
                      {/* テキスト */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: done || active ? 700 : 400, color: done ? "#169385" : active ? "#1e293b" : "#94a3b8", lineHeight: 1.3 }}>{label}</div>
                        {active && <div style={{ fontSize: 10, color: "#64748b", marginTop: 2, lineHeight: 1.4 }}>{sub}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleGenerate}
                disabled={!sourceText.trim()}
                style={{
                  flex: 1, height: 48, borderRadius: 99,
                  background: !sourceText.trim() ? `${CYAN}55` : "linear-gradient(45deg, #5184F0, #169385)",
                  color: "#fff", border: "none",
                  fontSize: 14, fontWeight: 700,
                  cursor: !sourceText.trim() ? "not-allowed" : "pointer",
                  fontFamily: FONT, letterSpacing: "0.02em",
                  boxShadow: sourceText.trim() ? "0 3px 12px rgba(81,132,240,0.3)" : "none",
                  transition: "all 0.15s",
                }}
              >
                コンテ化して出力する
              </button>
              <button
                style={{ width: 48, height: 48, borderRadius: 12, background: "#f0f4f8", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", flexShrink: 0 }}
                title="詳細設定"
              >
                <GridIcon />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SidePanelConte({ selectedStoryboardId, onSelectStoryboard, workspaceId }: Props) {
  const [items,            setItems]            = useState<StoryboardListItem[]>([]);
  const [loadingList,      setLoadingList]      = useState(true);
  const [creating,         setCreating]         = useState(false);
  const [showChoiceModal,  setShowChoiceModal]  = useState(false);
  const [showAiPopup,      setShowAiPopup]      = useState(false);
  const [renamingId,       setRenamingId]       = useState<string | null>(null);
  const [renameValue,      setRenameValue]      = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoadingList(true);
    listStoryboards(workspaceId).then((res) => {
      if (res.ok) setItems(res.items);
      setLoadingList(false);
    });
  }, [workspaceId]);

  // リネーム開始
  const startRename = (item: StoryboardListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(item.id);
    setRenameValue(item.title ?? "");
    setTimeout(() => renameInputRef.current?.focus(), 30);
  };

  // リネーム確定
  const commitRename = async () => {
    if (!renamingId) return;
    const newTitle = renameValue.trim() || "無題のコンテ";
    setItems((prev) => prev.map((x) => x.id === renamingId ? { ...x, title: newTitle } : x));
    setRenamingId(null);
    await updateStoryboard(renamingId, { title: newTitle });
  };

  const handleCreateEmpty = async () => {
    setShowChoiceModal(false);
    setCreating(true);
    const res = await createStoryboard({ title: "新しいコンテ", workspaceId });
    if (res.ok && res.storyboard) {
      const item: StoryboardListItem = {
        id: res.storyboard.id,
        title: res.storyboard.title,
        status: res.storyboard.status,
        updatedAt: res.storyboard.updatedAt,
        sceneCount: 0,
      };
      setItems((prev) => [item, ...prev]);
      onSelectStoryboard(res.storyboard!.id);
    }
    setCreating(false);
  };

  const handleAiCreated = (item: StoryboardListItem) => {
    setItems((prev) => [item, ...prev]);
    onSelectStoryboard(item.id);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 8, fontFamily: FONT }}>

      {/* 作成方法選択モーダル */}
      {showChoiceModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowChoiceModal(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: 16, padding: "22px 20px 18px", width: 260, boxShadow: "0 8px 32px rgba(0,0,0,0.14)", fontFamily: FONT }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "#1e293b", textAlign: "center" }}>
              コンテの作成方法
            </p>
            <button
              onClick={() => { setShowChoiceModal(false); setShowAiPopup(true); }}
              style={{
                width: "100%", padding: "11px 12px", fontSize: 13, fontWeight: 600, borderRadius: 10,
                border: `1.5px solid ${TEAL}`, background: `${TEAL}0e`, color: TEAL,
                cursor: "pointer", textAlign: "left", fontFamily: FONT,
                display: "flex", alignItems: "center", gap: 10,
              }}
            >
              <span style={{ color: TEAL, display: "flex" }}><SparkleIcon /></span>
              <span>原稿からAIがコンテ作成</span>
            </button>
            <div style={{ height: 8 }} />
            <button
              onClick={handleCreateEmpty}
              style={{
                width: "100%", padding: "11px 12px", fontSize: 13, fontWeight: 600, borderRadius: 10,
                border: "1.5px solid #e2e8f0", background: "#fafafa", color: "#475569",
                cursor: "pointer", textAlign: "left", fontFamily: FONT,
                display: "flex", alignItems: "center", gap: 10,
              }}
            >
              <span style={{ color: "#64748b", display: "flex" }}><FolderPlusIcon /></span>
              <span>空のコンテから始める</span>
            </button>
            <div style={{ height: 12 }} />
            <button
              onClick={() => setShowChoiceModal(false)}
              style={{ width: "100%", padding: "7px", fontSize: 12, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", fontFamily: FONT }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* AI コンテ作成ポップアップ */}
      {showAiPopup && (
        <AiContePopup
          onClose={() => setShowAiPopup(false)}
          onCreated={handleAiCreated}
          workspaceId={workspaceId}
        />
      )}

      {/* 新規作成ボタン */}
      <button
        onClick={() => setShowChoiceModal(true)}
        disabled={creating}
        style={{
          width: "100%", padding: "8px 0", fontSize: 13, fontWeight: 600, borderRadius: 8,
          border: `1px solid ${TEAL}`, background: `${TEAL}11`, color: TEAL,
          cursor: creating ? "not-allowed" : "pointer", opacity: creating ? 0.6 : 1,
          fontFamily: FONT,
        }}
      >
        {creating ? "作成中..." : "+ 新規コンテ作成"}
      </button>

      {/* リスト */}
      {loadingList ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 12, color: "#aaa" }}>読み込み中...</span>
        </div>
      ) : items.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "24px 16px" }}>
          <IconConte />
          <p style={{ margin: 0, fontSize: 12, color: "#aaa", textAlign: "center", lineHeight: 1.6 }}>
            コンテがまだありません
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((item) => {
            const isSelected = item.id === selectedStoryboardId;
            const isRenaming = renamingId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => !isRenaming && onSelectStoryboard(item.id)}
                style={{
                  width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 8,
                  border: isSelected ? `1.5px solid ${TEAL}` : "1.5px solid #f0f0f0",
                  background: isSelected ? `${TEAL}0d` : "#fafafa",
                  cursor: "pointer", fontFamily: FONT, transition: "all 0.12s",
                  position: "relative",
                }}
              >
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingId(null); }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: "100%", border: `1px solid ${TEAL}`, borderRadius: 4, background: "#fff", fontSize: 12, fontWeight: 700, color: "#1e293b", padding: "2px 4px", outline: "none", fontFamily: FONT }}
                  />
                ) : (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: isSelected ? TEAL : "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.title ?? "無題のコンテ"}
                    </span>
                    <span
                      onClick={(e) => startRename(item, e)}
                      style={{ color: "#cbd5e1", display: "flex", flexShrink: 0, padding: "1px 0", cursor: "pointer" }}
                      title="名前を変更"
                    >
                      <PencilIcon />
                    </span>
                  </div>
                )}
                {!isRenaming && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>{item.sceneCount} シーン</span>
                    <span style={{ fontSize: 10, color: "#cbd5e1" }}>·</span>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>{fmtDate(item.updatedAt)}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
