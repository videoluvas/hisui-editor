"use client";

import { useState } from "react";
import { TEAL } from "@/components/icons";
import { getStoryboard, convertStoryboardToProject } from "@/lib/storyboard.api";
import type { StoryboardMainData } from "@/lib/storyboard.api";
import type { Project } from "@/lib/project.api";
import { loadExportSettings } from "@/lib/exportSettings";

const FONT = "'Noto Sans JP', sans-serif";

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconPdf = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={TEAL} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="22" rx="2" />
    <path d="M16 2 L20 6" />
    <path d="M16 2 v4 h4" fill="none" />
    <line x1="7" y1="11" x2="17" y2="11" />
    <line x1="7" y1="14" x2="17" y2="14" />
    <line x1="7" y1="17" x2="13" y2="17" />
    <rect x="14" y="18" width="10" height="7" rx="1.5" fill={TEAL} stroke="none" />
    <text x="19" y="23.5" textAnchor="middle" fontSize="4.5" fill="#fff" stroke="none" fontWeight="bold" fontFamily="sans-serif">PDF</text>
  </svg>
);

const IconSpreadsheet = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={TEAL} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="22" height="22" rx="2" />
    <line x1="11" y1="3" x2="11" y2="25" />
    <line x1="19" y1="3" x2="19" y2="25" />
    <line x1="3" y1="10" x2="25" y2="10" />
    <line x1="3" y1="17" x2="25" y2="17" />
    <line x1="5" y1="6.5" x2="9" y2="6.5" strokeWidth="1" />
    <line x1="13" y1="6.5" x2="17" y2="6.5" strokeWidth="1" />
    <line x1="5" y1="13.5" x2="9" y2="13.5" strokeWidth="1" />
    <line x1="13" y1="13.5" x2="17" y2="13.5" strokeWidth="1" />
    <line x1="21" y1="13.5" x2="23" y2="13.5" strokeWidth="1" />
    <line x1="5" y1="20.5" x2="9" y2="20.5" strokeWidth="1" />
  </svg>
);

const IconConvert = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={TEAL} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="8" width="10" height="12" rx="1.5" />
    <line x1="4" y1="12" x2="10" y2="12" strokeWidth="1" />
    <line x1="4" y1="15" x2="10" y2="15" strokeWidth="1" />
    <rect x="16" y="8" width="10" height="12" rx="1.5" />
    <rect x="16" y="9.5" width="2" height="2" rx="0.4" fill={TEAL} stroke="none" />
    <rect x="16" y="13" width="2" height="2" rx="0.4" fill={TEAL} stroke="none" />
    <rect x="16" y="16.5" width="2" height="2" rx="0.4" fill={TEAL} stroke="none" />
    <rect x="24" y="9.5" width="2" height="2" rx="0.4" fill={TEAL} stroke="none" />
    <rect x="24" y="13" width="2" height="2" rx="0.4" fill={TEAL} stroke="none" />
    <rect x="24" y="16.5" width="2" height="2" rx="0.4" fill={TEAL} stroke="none" />
    <path d="M13 14 L15 14" strokeWidth="1.8" />
    <path d="M13.5 12 L15.5 14 L13.5 16" strokeWidth="1.4" />
  </svg>
);

// ─── PDF・CSV生成ユーティリティ ───────────────────────────────────────────────

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function exportToPdf(sb: StoryboardMainData) {
  const w = window.open("", "_blank");
  if (!w) { alert("ポップアップがブロックされています。ブラウザのポップアップ許可を確認してください。"); return; }

  const rows = sb.scenes.map((scene, i) => `
    <tr>
      <td class="no">${i + 1}</td>
      <td class="img">${scene.imgUrl ? `<img src="${esc(scene.imgUrl)}" alt="" />` : '<span class="none">—</span>'}</td>
      <td class="content">
        <div class="title">${esc(scene.title ?? `シーン ${i + 1}`)}</div>
        ${scene.imgPromptContent ? `<div class="lbl">内容</div><div class="val">${esc(scene.imgPromptContent)}</div>` : ""}
        ${scene.imgPromptAngle   ? `<div class="lbl">構図</div><div class="val">${esc(scene.imgPromptAngle)}</div>`   : ""}
        ${scene.videoPrompt      ? `<div class="lbl">動画</div><div class="val">${esc(scene.videoPrompt)}</div>`      : ""}
      </td>
      <td class="narration">${esc(scene.naText ?? "")}</td>
    </tr>`).join("");

  w.document.write(`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8"/>
<title>${esc(sb.title ?? "コンテ")}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Noto Sans JP',sans-serif;font-size:11px;color:#1e293b;padding:20px}
  h1{font-size:16px;font-weight:700;margin-bottom:14px;color:#0f172a}
  table{width:100%;border-collapse:collapse}
  th{background:#f1f5f9;padding:6px 8px;text-align:left;font-size:10px;font-weight:700;color:#64748b;border:1px solid #e2e8f0}
  td{padding:8px;border:1px solid #e2e8f0;vertical-align:top}
  td.no{width:28px;text-align:center;font-weight:700;color:#64748b;font-size:12px}
  td.img{width:110px}
  td.img img{width:100%;border-radius:4px;display:block}
  td.img .none{color:#94a3b8}
  td.content{width:38%}
  .title{font-weight:700;font-size:11px;margin-bottom:4px}
  .lbl{font-size:9px;font-weight:700;color:#94a3b8;margin-top:5px;text-transform:uppercase}
  .val{font-size:10px;line-height:1.5;margin-top:1px}
  td.narration{line-height:1.7;white-space:pre-wrap;font-size:10px}
  @media print{body{padding:6px}@page{margin:1cm;size:A4 landscape}}
</style>
</head>
<body>
<h1>${esc(sb.title ?? "コンテ")}</h1>
<table>
  <thead><tr><th>#</th><th>画像</th><th>シーン内容</th><th>ナレーション</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<script>window.addEventListener('load',()=>{window.print()})<\/script>
</body></html>`);
  w.document.close();
}

function exportToCsv(sb: StoryboardMainData) {
  const BOM = "﻿";
  const headers = ["シーン番号", "タイトル", "シーン内容", "構図・アングル", "動画プロンプト", "ナレーション", "画像URL", "動画URL"];
  const rows = sb.scenes.map((scene, i) => [
    String(i + 1),
    scene.title ?? "",
    scene.imgPromptContent ?? "",
    scene.imgPromptAngle   ?? "",
    scene.videoPrompt      ?? "",
    scene.naText           ?? "",
    scene.imgUrl           ?? "",
    scene.videoUrl         ?? "",
  ]);

  const csv = BOM + [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${sb.title ?? "コンテ"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

type Props = {
  selectedStoryboardId?: string | null;
  onProjectCreated?: (project: Project) => void;
};

export default function SidePanelConvert({ selectedStoryboardId, onProjectCreated }: Props) {
  const [busy, setBusy] = useState<"pdf" | "csv" | "project" | null>(null);
  const [projectCreated, setProjectCreated] = useState(false);

  const run = async (type: "pdf" | "csv") => {
    if (!selectedStoryboardId) { alert("コンテを選択してください"); return; }
    setBusy(type);
    try {
      const res = await getStoryboard(selectedStoryboardId);
      if (!res.ok || !res.storyboard) throw new Error("コンテの取得に失敗しました");
      if (type === "pdf") exportToPdf(res.storyboard);
      else                exportToCsv(res.storyboard);
    } catch (e) {
      alert(`出力に失敗しました: ${e}`);
    } finally {
      setBusy(null);
    }
  };

  const runProject = async () => {
    if (!selectedStoryboardId) { alert("コンテを選択してください"); return; }
    setBusy("project");
    setProjectCreated(false);
    try {
      const res = await convertStoryboardToProject(selectedStoryboardId, loadExportSettings() as unknown as Record<string, unknown>);
      if (!res.ok || !res.project) throw new Error(res.message ?? "変換に失敗しました");
      setProjectCreated(true);
      onProjectCreated?.(res.project as unknown as Project);
    } catch (e) {
      alert(`変換に失敗しました: ${e}`);
    } finally {
      setBusy(null);
    }
  };

  const disabled = !selectedStoryboardId;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: FONT }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: "0.04em", textTransform: "uppercase", fontFamily: FONT }}>
        変換ツール
      </p>

      {/* ── コンテ → PDF ── */}
      <div style={{ borderRadius: 10, border: "1px solid #f0f0f0", padding: 14, background: "#fff", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flexShrink: 0 }}><IconPdf /></div>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, fontFamily: FONT }}>PDF</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#333", fontFamily: FONT }}>コンテ → PDF</div>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "#888", lineHeight: 1.7, fontFamily: FONT }}>
          コンテの各シーンをPDF形式に変換して書き出します
        </p>
        <button
          type="button"
          onClick={() => run("pdf")}
          disabled={disabled || busy === "pdf"}
          style={{
            width: "100%", padding: "7px 0", fontSize: 12, fontWeight: 600,
            borderRadius: 7, border: "none", cursor: disabled || busy === "pdf" ? "not-allowed" : "pointer",
            background: disabled || busy === "pdf" ? "#c8e6e0" : TEAL, color: "#fff", fontFamily: FONT,
          }}
        >
          {busy === "pdf" ? "準備中..." : "PDF出力"}
        </button>
      </div>

      {/* ── コンテ → Excel / CSV ── */}
      <div style={{ borderRadius: 10, border: "1px solid #f0f0f0", padding: 14, background: "#fff", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flexShrink: 0 }}><IconSpreadsheet /></div>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, fontFamily: FONT }}>Excel / CSV</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#333", fontFamily: FONT }}>コンテ → Excel / CSV</div>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "#888", lineHeight: 1.7, fontFamily: FONT }}>
          コンテの各シーンをスプレッドシートの各行に変換して書き出します
        </p>
        <button
          type="button"
          onClick={() => run("csv")}
          disabled={disabled || busy === "csv"}
          style={{
            width: "100%", padding: "7px 0", fontSize: 12, fontWeight: 600,
            borderRadius: 7, border: "none", cursor: disabled || busy === "csv" ? "not-allowed" : "pointer",
            background: disabled || busy === "csv" ? "#c8e6e0" : TEAL, color: "#fff", fontFamily: FONT,
          }}
        >
          {busy === "csv" ? "準備中..." : "Excel / CSV出力"}
        </button>
      </div>

      {/* ── コンテ → 動画プロジェクト ── */}
      <div style={{ borderRadius: 10, border: "1px solid #f0f0f0", padding: 14, background: "#fff", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flexShrink: 0 }}><IconConvert /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#333", fontFamily: FONT }}>コンテ → 動画プロジェクト</div>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "#888", lineHeight: 1.7, fontFamily: FONT }}>
          コンテの画像・動画・ナレーションをタイムラインに配置した動画プロジェクトを作成します
        </p>
        {projectCreated && (
          <div style={{ fontSize: 11, color: "#2e7d32", background: "#e6f4ea", borderRadius: 6, padding: "6px 10px", fontFamily: FONT }}>
            ✓ 動画プロジェクトに変換しました。動画編集モードに切り替えます。
          </div>
        )}
        <button
          type="button"
          onClick={runProject}
          disabled={disabled || busy === "project"}
          style={{
            width: "100%", padding: "7px 0", fontSize: 12, fontWeight: 600,
            borderRadius: 7, border: "none", cursor: disabled || busy === "project" ? "not-allowed" : "pointer",
            background: disabled || busy === "project" ? "#c8e6e0" : TEAL, color: "#fff", fontFamily: FONT,
          }}
        >
          {busy === "project" ? "変換中..." : "動画プロジェクトに変換"}
        </button>
      </div>
    </div>
  );
}
