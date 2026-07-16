"use client";

import { useState } from "react";
import type { MutableRefObject } from "react";
import { applyBulkEdit } from "@/lib/editjson.patch";
import type { BulkEditOps } from "@/lib/editjson.patch";
import { saveProjectEditJson } from "@/lib/project.api";

const FONT   = "'Noto Sans JP', sans-serif";
const GRAD   = "linear-gradient(45deg, #5184F0, #169385)";
const ACCENT = "#5184F0";

// ─── Types ────────────────────────────────────────────────────────────────────

type MinEdit = {
  getEdit:  () => unknown;
  loadEdit: (e: unknown) => Promise<void>;
};

export type Props = {
  open:            boolean;
  projectId:       string | null;
  editRef:         MutableRefObject<MinEdit | null>;
  onClose:         () => void;
  onApplied?:      () => void;
  onBeforeApply?:  (snapshot: unknown) => void;
};

type View = "home" | "A" | "B" | "C" | "D" | "E" | "F";

// ─── Category definitions ─────────────────────────────────────────────────────

const CATEGORIES: {
  key: Exclude<View, "home">;
  name: string;
  desc: string;
  sample: string;
  icon: React.ReactNode;
  ops: string[];
}[] = [
  {
    key: "A",
    name: "字幕編集",
    desc: "字幕の色・サイズ・位置・装飾などをまとめて変更します。",
    sample: "字幕を明朝体にして",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 3h12M8 3v10M5 13h6"/></svg>,
    ops: [
      "フォントを変更（ゴシック / 明朝体 / 太いゴシック など）",
      "字幕を太字にして / 細字にして",
      "字幕の文字色を変更（例：黄色、白、赤など任意の色）",
      "フォントサイズを変更（例：60px、40px）",
      "文字間隔を広げて / 詰めて（例：文字間を4pxにして）",
      "行間を広げて / 詰めて（例：行間を1.8倍にして）",
      "字幕の表示位置を上 / 下に変更",
      "テキストシャドウを ON / OFF",
      "字幕にフェードインをつけて / フェードアウトをつけて / フェードイン・アウト両方をつけて",
      "字幕のフェード（トランジション）を削除して",
    ],
  },
  {
    key: "B",
    name: "尺・タイミング",
    desc: "シーンの長さや開始位置、音声とのタイミングを調整します。",
    sample: "全シーンの長さを5秒に統一して",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2.5 1.5"/></svg>,
    ops: [
      "全シーンの長さをX秒に統一（例：5秒）",
      "動画クリップの尺に音声・テロップを同期",
      "全体をX秒に比例縮小（例：60秒）",
    ],
  },
  {
    key: "C",
    name: "トランジション・エフェクト",
    desc: "シーン切り替えやズームなどの動きを追加・変更します。",
    sample: "全シーンにフェードトランジションを追加して",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="6" height="8" rx="1"/><rect x="9" y="4" width="6" height="8" rx="1"/><path d="M7 8h2M8 6.5l1.5 1.5L8 9.5"/></svg>,
    ops: [
      "トランジションを追加（フェード・ワイプ・スライド・ズーム・リビールなど）",
      "全トランジション・エフェクトを一括削除",
      "カメラエフェクトを追加（ズームイン / アウト・スライドなど）",
    ],
  },
  {
    key: "D",
    name: "フィルター",
    desc: "映像の色味・明るさ・ぼかしなどをまとめて調整します。",
    sample: "映像全体をモノクロにして",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.22 3.22l1.42 1.42M11.36 11.36l1.42 1.42M3.22 12.78l1.42-1.42M11.36 4.64l1.42-1.42"/></svg>,
    ops: [
      "フィルターを適用（モノクロ・ぼかし・コントラスト強調・明るく・暗く・彩度下げ・ネガティブなど）",
      "全フィルターを一括解除",
    ],
  },
  {
    key: "E",
    name: "音声・BGM",
    desc: "BGMやナレーションの追加、音量、フェードを調整します。",
    sample: "ナレーションの音量を70%（0.7）に下げて",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 13V4l8-2v9"/><circle cx="4.5" cy="13" r="2"/><circle cx="12.5" cy="11" r="2"/></svg>,
    ops: [
      "BGMのURLを設定（音量・フェードエフェクト付き）",
      "BGMの音量を調整（0〜1）",
      "BGMにフェードイン / フェードアウトを追加",
      "ナレーション（音声）の音量を調整（0〜1）",
      "動画クリップの音声をミュート",
    ],
  },
  {
    key: "F",
    name: "出力設定",
    desc: "背景色・解像度・FPS・画面サイズなどを設定します。",
    sample: "解像度を1080pに変更して",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="2.2"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.22 3.22l1.06 1.06M11.72 11.72l1.06 1.06M3.22 12.78l1.06-1.06M11.72 4.28l1.06-1.06"/></svg>,
    ops: [
      "背景色を変更（任意の色を指定可）",
      "解像度を変更（720p / 1080p）",
      "FPSを変更（24 / 30 / 60fps）",
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EditorBulkEditModal({ open, projectId, editRef, onClose, onApplied, onBeforeApply }: Props) {
  const [view,    setView]    = useState<View>("home");
  const [prompt,  setPrompt]  = useState("");
  const [showOps, setShowOps] = useState(false);
  const [status,  setStatus]  = useState<"idle" | "applying" | "done" | "error">("idle");
  const [errMsg,  setErrMsg]  = useState("");

  if (!open) return null;

  const cat = view !== "home" ? CATEGORIES.find((c) => c.key === view) ?? null : null;

  const handleSelectCat = (key: Exclude<View, "home">) => {
    const c = CATEGORIES.find((x) => x.key === key);
    setPrompt(c?.sample ?? "");
    setView(key);
    setShowOps(false);
    setStatus("idle");
    setErrMsg("");
  };

  const handleBack = () => {
    setView("home");
    setShowOps(false);
    setStatus("idle");
    setErrMsg("");
  };

  const handleApply = async () => {
    if (!projectId || !editRef.current) return;
    if (!prompt.trim()) { setErrMsg("指示を入力してください"); return; }
    setStatus("applying");
    setErrMsg("");
    try {
      // ① AI適用前のスナップショットを保存（復元・Ctrl+Z用）
      const preAiSnapshot = structuredClone(editRef.current.getEdit());
      await saveProjectEditJson(projectId, preAiSnapshot);
      onBeforeApply?.(preAiSnapshot);

      const aiRes = await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), category: cat?.name }),
      });
      const aiData = await aiRes.json() as { ok: boolean; ops?: BulkEditOps; message?: string };
      if (!aiData.ok) throw new Error(aiData.message ?? "AI処理に失敗しました");

      const ops = aiData.ops ?? {};
      if (Object.keys(ops).length === 0) {
        setErrMsg("指示の内容を認識できませんでした。別の言い方で試してください。");
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
        return;
      }

      const patched = applyBulkEdit(editRef.current.getEdit(), ops);
      // ② Ctrl+Z で戻れるようにプリAI状態を先にロードして履歴に積む
      await editRef.current.loadEdit(structuredClone(preAiSnapshot));
      // ③ AI適用後の状態をロード
      await editRef.current.loadEdit(patched);
      await saveProjectEditJson(projectId, patched);

      setStatus("done");
      onApplied?.();
      setTimeout(() => { setStatus("idle"); setView("home"); setPrompt(""); setShowOps(false); }, 1800);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "適用に失敗しました");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3500);
    }
  };

  const handleClose = () => {
    if (status === "applying") return;
    setView("home");
    setPrompt("");
    setShowOps(false);
    setStatus("idle");
    setErrMsg("");
    onClose();
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}
      onClick={handleClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 18, width: 480, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 16px 56px rgba(0,0,0,0.22)", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── ヘッダー ── */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #f0f4f8", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {view !== "home" && (
            <button onClick={handleBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20, lineHeight: 1, padding: "0 4px 0 0", display: "flex", alignItems: "center" }}>
              ←
            </button>
          )}
          <span style={{ flex: 1, fontSize: 16, fontWeight: 700, backgroundImage: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {view === "home" ? "プロンプトで全体編集" : cat?.name}
          </span>
          <button onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#bbb", lineHeight: 1, padding: 0 }}>×</button>
        </div>

        {/* ── ホーム ── */}
        {view === "home" && (
          <div style={{ overflowY: "auto", padding: "16px 22px 22px" }}>
            <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#334155" }}>
              AIで行いたい処理を選択してください
            </p>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
              ※プロンプト例にない処理はできないことがあります
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {CATEGORIES.map((c) => (
                <CatCard key={c.key} cat={c} onClick={() => handleSelectCat(c.key)} />
              ))}
            </div>
          </div>
        )}

        {/* ── カテゴリ詳細 ── */}
        {view !== "home" && cat && (
          <div style={{ overflowY: "auto", flex: 1, padding: "20px 22px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
              {cat.desc}
            </p>

            {/* テキストエリア */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                指示を入力してください
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                disabled={status === "applying"}
                style={{
                  width: "100%", boxSizing: "border-box",
                  border: `1.5px solid ${status === "error" ? "#fca5a5" : "#e2e8f0"}`,
                  borderRadius: 10, padding: "12px 14px",
                  fontSize: 14, fontFamily: FONT,
                  color: "#1e293b", lineHeight: 1.65,
                  resize: "vertical", outline: "none",
                  background: status === "applying" ? "#f8fafc" : "#fff",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => { if (status !== "error") (e.target as HTMLTextAreaElement).style.borderColor = ACCENT; }}
                onBlur={(e)  => { if (status !== "error") (e.target as HTMLTextAreaElement).style.borderColor = "#e2e8f0"; }}
              />

              {/* サンプル注釈 + 可能な指示を見るボタン */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
                  上記はサンプルです。自由に書き換えて指示できます。
                </p>
                <button
                  onClick={() => setShowOps((v) => !v)}
                  style={{
                    flexShrink: 0,
                    background: "none",
                    border: `1px solid ${showOps ? ACCENT : "#e2e8f0"}`,
                    borderRadius: 6,
                    padding: "3px 9px",
                    fontSize: 11,
                    color: showOps ? ACCENT : "#64748b",
                    cursor: "pointer",
                    fontFamily: FONT,
                    whiteSpace: "nowrap",
                    display: "flex", alignItems: "center", gap: 4,
                    transition: "all 0.15s",
                  }}
                >
                  可能な指示を見る
                  <span style={{ fontSize: 9, display: "inline-block", transform: showOps ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
                </button>
              </div>

              {/* 可能な指示リスト */}
              {showOps && (
                <div style={{ background: "#f8fafc", border: "1px solid #e8edf4", borderRadius: 9, padding: "12px 14px" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: "0.04em" }}>
                    このカテゴリでできる操作
                  </p>
                  <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 5 }}>
                    {cat.ops.map((op) => (
                      <li key={op} style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                        {op}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* エラー */}
            {(status === "error" || errMsg) && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#b91c1c" }}>
                {errMsg}
              </div>
            )}

            {/* 適用ボタン */}
            <button
              onClick={handleApply}
              disabled={status === "applying" || status === "done"}
              style={{
                background: status === "done" ? "#10b981" : status === "applying" ? "#cbd5e1" : GRAD,
                color: "#fff", border: "none", borderRadius: 10,
                padding: "13px 0", fontWeight: 700, fontSize: 14,
                cursor: status === "applying" || status === "done" ? "not-allowed" : "pointer",
                fontFamily: FONT, transition: "background 0.2s", width: "100%",
              }}
            >
              {status === "applying" ? "AI処理中…" : status === "done" ? "✓ 適用完了" : "この指示を適用する"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Category Card ────────────────────────────────────────────────────────────

function CatCard({ cat, onClick }: { cat: typeof CATEGORIES[number]; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 13,
        background: hov ? "#f0f5ff" : "#f8fafc",
        border: `1.5px solid ${hov ? ACCENT : "#f0f4f8"}`,
        borderRadius: 11, padding: "13px 15px",
        cursor: "pointer", textAlign: "left", fontFamily: FONT,
        transition: "all 0.14s",
      }}
    >
      {/* アイコン */}
      <span style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: hov ? ACCENT + "22" : "#e8edf4",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: hov ? ACCENT : "#94a3b8",
        transition: "all 0.14s",
      }}>
        {cat.icon}
      </span>
      {/* テキスト */}
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 2 }}>{cat.name}</span>
        <span style={{ display: "block", fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>{cat.desc}</span>
      </span>
      {/* 矢印 */}
      <span style={{ color: hov ? ACCENT : "#d1d5db", fontSize: 16, flexShrink: 0, transition: "color 0.14s" }}>›</span>
    </button>
  );
}
