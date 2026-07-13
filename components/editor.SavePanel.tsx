"use client";

import { useRef, useState } from "react";
import { TEAL } from "@/components/icons";

type SaveStatus = "idle" | "saving" | "saved" | "error";
export type AutoSaveMode = "onChange" | "interval";
export type AutoSaveInterval = 5 | 10 | 30 | 60;
export type SaveLog = {
  type: "auto" | "manual" | "ai-before";
  savedAt: Date;
  snapshot?: unknown; // ai-before エントリのみ: 復元用スナップショット
};

type Props = {
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  autoSaveMode: AutoSaveMode;
  autoSaveInterval: AutoSaveInterval;
  saveLogs: SaveLog[];
  onSave: () => void;
  onAutoSaveModeChange: (mode: AutoSaveMode) => void;
  onAutoSaveIntervalChange: (interval: AutoSaveInterval) => void;
  onRestore?: (snapshot: unknown) => void;
};

export default function EditorSavePanel({
  saveStatus,
  lastSavedAt,
  autoSaveMode,
  autoSaveInterval,
  saveLogs,
  onSave,
  onAutoSaveModeChange,
  onAutoSaveIntervalChange,
  onRestore,
}: Props) {
  const [pos, setPos] = useState({ x: 280, y: 80 });
  const [showSettings, setShowSettings] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragging.current) return;
    setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
  };

  const onMouseUp = () => {
    dragging.current = false;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // メインの状態テキスト
const statusText = () => {
  if (saveStatus === "saving") return { text: "保存中...", color: "#888" };
  if (saveStatus === "saved") return { text: "保存完了", color: TEAL };
  if (saveStatus === "error") return { text: "保存失敗", color: "#ef4444" };

  // idle時: 最新の保存ログを表示（手動・自動問わず）
  const last = [...saveLogs].reverse()[0];
  if (last) {
    const label = last.type === "auto" ? "自動保存" : last.type === "ai-before" ? "AI前保存" : "手動保存";
    return { text: `${label}：${formatTime(last.savedAt)}`, color: "#aaa" };
  }
  return { text: "未保存", color: "#bbb" };
};

  const { text, color } = statusText();

  return (
    <>
      <div
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          zIndex: 1000,
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
          padding: "6px 10px",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          cursor: "grab",
          userSelect: "none",
        }}
        onMouseDown={onMouseDown}
      >
        {/* グリップ */}
        <div style={{ color: "#ccc", padding: "0 2px", flexShrink: 0 }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <circle cx="2" cy="2" r="1"/><circle cx="8" cy="2" r="1"/>
            <circle cx="2" cy="5" r="1"/><circle cx="8" cy="5" r="1"/>
            <circle cx="2" cy="8" r="1"/><circle cx="8" cy="8" r="1"/>
          </svg>
        </div>

        {/* 保存ボタン */}
        <button
          onClick={(e) => { e.stopPropagation(); onSave(); }}
          onMouseDown={(e) => e.stopPropagation()}
          title="保存"
          style={{
            height: 28,
            padding: "0 10px",
            borderRadius: 7,
            border: "none",
            background: "#f5f5f5",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            fontWeight: 600,
            color: "#555",
            flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 13H3V3h7l3 3v7z"/>
            <path d="M5 13V9h6v4"/>
            <path d="M5 3v4h5"/>
          </svg>
          保存
        </button>

        {/* ステータステキスト */}
        <span
          style={{ fontSize: 11, color, whiteSpace: "nowrap", minWidth: 120 }}
          onClick={(e) => { e.stopPropagation(); setShowLogs((v) => !v); setShowSettings(false); }}
          onMouseDown={(e) => e.stopPropagation()}
          title="保存ログを表示"
          role="button"
        >
          {saveStatus === "saving" ? (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              {text}
            </span>
          ) : text}
        </span>

        {/* 設定ボタン */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowSettings((v) => !v); setShowLogs(false); }}
          onMouseDown={(e) => e.stopPropagation()}
          title="自動保存設定"
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            border: "none",
            background: showSettings ? "#f0f0f0" : "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#888",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="2"/>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/>
          </svg>
        </button>

        {/* ログパネル */}
        {showLogs && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              padding: 16,
              width: 240,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              zIndex: 1001,
              maxHeight: 240,
              overflowY: "auto",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>保存ログ</div>
            {saveLogs.length === 0 ? (
              <div style={{ fontSize: 11, color: "#aaa", textAlign: "center", padding: "12px 0" }}>
                まだ保存されていません
              </div>
            ) : (
              [...saveLogs].reverse().map((log, i) => {
                const isAiBefore = log.type === "ai-before";
                const badgeColor = isAiBefore ? "#f59e0b" : log.type === "manual" ? TEAL : "#888";
                const badgeBg   = isAiBefore ? "#fef3c7" : log.type === "manual" ? `${TEAL}18` : "#f0f0f0";
                const badgeLabel = isAiBefore ? "AI前" : log.type === "manual" ? "手動" : "自動";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                    <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: badgeBg, color: badgeColor }}>
                      {badgeLabel}
                    </span>
                    <span style={{ color: "#555", flex: 1 }}>{formatTime(log.savedAt)}</span>
                    {isAiBefore && log.snapshot !== undefined && onRestore && (
                      <button
                        onClick={() => onRestore(log.snapshot)}
                        style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, border: `1px solid ${badgeColor}`, background: badgeBg, color: badgeColor, cursor: "pointer", fontWeight: 600, flexShrink: 0 }}
                      >
                        復元
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 設定パネル */}
        {showSettings && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              padding: 16,
              width: 220,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              zIndex: 1001,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>自動保存設定</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(["onChange", "interval"] as AutoSaveMode[]).map((mode) => (
                <label key={mode} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#444" }}>
                  <input
                    type="radio"
                    name="autoSaveMode"
                    checked={autoSaveMode === mode}
                    onChange={() => onAutoSaveModeChange(mode)}
                    style={{ accentColor: TEAL }}
                  />
                  {mode === "onChange" ? "変更を加えるたびに保存" : "時間で保存"}
                </label>
              ))}
            </div>
            {autoSaveMode === "interval" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 11, color: "#aaa" }}>保存間隔</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {([5, 10, 30, 60] as AutoSaveInterval[]).map((sec) => (
                    <button
                      key={sec}
                      onClick={() => onAutoSaveIntervalChange(sec)}
                      style={{
                        padding: "4px 10px",
                        fontSize: 12,
                        borderRadius: 6,
                        border: `1.5px solid ${autoSaveInterval === sec ? TEAL : "#e0e0e0"}`,
                        background: autoSaveInterval === sec ? `${TEAL}11` : "#fafafa",
                        color: autoSaveInterval === sec ? TEAL : "#555",
                        cursor: "pointer",
                        fontWeight: autoSaveInterval === sec ? 600 : 400,
                      }}
                    >
                      {sec >= 60 ? `${sec / 60}分` : `${sec}秒`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}