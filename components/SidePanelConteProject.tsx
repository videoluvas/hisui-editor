"use client";

import { useEffect, useRef, useState } from "react";
import {
  listStoryboards, createStoryboard, updateStoryboard, generateStoryboard,
} from "@/lib/storyboard.api";
import { getProjects, createProject, deleteProject } from "@/lib/project.api";
import type { StoryboardListItem } from "@/lib/storyboard.api";
import type { Project } from "@/lib/project.api";
import SidePanelProjectCreateModal from "@/components/SidePanelProjectCreateModal";

const CONTE_COLOR = "#169385";
const SEQ_COLOR   = "#7F5AF0";
const FONT        = "'Noto Sans JP', sans-serif";

// ─── Icons ────────────────────────────────────────────────────────────────────

function ConteIcon({ color = CONTE_COLOR }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="5.2" height="4" rx="1"/>
      <rect x="7.8" y="1" width="5.2" height="4" rx="1"/>
      <rect x="1" y="7" width="5.2" height="4" rx="1"/>
      <rect x="7.8" y="7" width="5.2" height="4" rx="1"/>
      <circle cx="3.6" cy="3" r="0.8" fill={color} stroke="none"/>
      <circle cx="10.4" cy="3" r="0.8" fill={color} stroke="none"/>
    </svg>
  );
}

function SequenceIcon({ color = SEQ_COLOR }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2.5" width="12" height="3" rx="0.8"/>
      <rect x="1" y="7.5" width="7.5" height="3" rx="0.8"/>
      <line x1="3.5" y1="2.5" x2="3.5" y2="5.5"/>
      <line x1="6" y1="2.5" x2="6" y2="5.5"/>
      <line x1="8.5" y1="2.5" x2="8.5" y2="5.5"/>
      <line x1="3.5" y1="7.5" x2="3.5" y2="10.5"/>
      <line x1="6" y1="7.5" x2="6" y2="10.5"/>
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 1.5l2 2L4 10H2V8L8.5 1.5z"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h8M5 3V2h2v1M4 3v6a.5.5 0 0 0 .5.5h3A.5.5 0 0 0 8 9V3"/>
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.34.07-.68.07-1.08s-.03-.74-.07-1.08l2.32-1.84c.21-.16.27-.47.12-.7l-2.2-3.82c-.14-.23-.44-.3-.67-.23l-2.73 1.1c-.57-.44-1.18-.81-1.85-1.08L14.09 2H9.91L9.5 4.83C8.83 5.1 8.22 5.47 7.65 5.91L4.92 4.81c-.23-.07-.53 0-.67.23L2.05 8.86c-.14.23-.08.54.12.7l2.32 1.84C4.03 11.26 4 11.6 4 12s.03.74.07 1.08l-2.32 1.84c-.21.16-.27.47-.12.7l2.2 3.82c.14.23.44.3.67.23l2.73-1.1c.57.44 1.18.81 1.85 1.08L9.91 22h4.18l.41-2.83c.67-.27 1.28-.64 1.85-1.08l2.73 1.1c.23.07.53 0 .67-.23l2.2-3.82c.14-.23.08-.54-.12-.7l-2.32-1.84Z"/>
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M7.5 1v2M7.5 12v2M1 7.5h2M12 7.5h2M3.3 3.3l1.4 1.4M10.3 10.3l1.4 1.4M10.3 4.7l1.4-1.4M3.3 11.7l1.4-1.4"/>
      <circle cx="7.5" cy="7.5" r="2" fill="currentColor" stroke="none"/>
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

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <rect x="5" y="1" width="4" height="7" rx="2"/><path d="M2 7a5 5 0 0 0 10 0M7 12v1.5"/>
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

function FolderPlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 4a1 1 0 0 1 1-1h3l1.5 1.5H13a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1V4z"/>
    </svg>
  );
}

// ─── 型 ───────────────────────────────────────────────────────────────────────

type ConteItem    = { kind: "conte" }    & StoryboardListItem;
type SequenceItem = { kind: "sequence" } & { id: string; title: string; updatedAt: string; project: Project };
type MixedItem    = ConteItem | SequenceItem;

// ─── 設定ポップアップ ─────────────────────────────────────────────────────────

const ASPECT_RATIO_PRESETS = [
  { label: "16:9 横長（標準）",        value: "16:9"  },
  { label: "9:16 縦長（スマホ）",      value: "9:16"  },
  { label: "1:1 正方形",               value: "1:1"   },
  { label: "4:3 スタンダード",          value: "4:3"   },
  { label: "21:9 シネマスコープ",       value: "21:9"  },
];

const RESOLUTION_PRESETS = [
  { label: "1080p",     w: 1920, h: 1080 },
  { label: "720p",      w: 1280, h: 720  },
  { label: "縦 720",    w: 720,  h: 1280 },
  { label: "縦 1080",   w: 1080, h: 1920 },
  { label: "正方形",    w: 1080, h: 1080 },
];


type SettingsModalProps = {
  item:     MixedItem;
  onClose:  () => void;
  onSaved:  (id: string, patch: { title?: string }) => void;
  onDelete: (item: MixedItem) => void;
};

function SettingsModal({ item, onClose, onSaved, onDelete }: SettingsModalProps) {
  const isConte = item.kind === "conte";
  const color   = isConte ? CONTE_COLOR : SEQ_COLOR;
  const project = isConte ? null : (item as SequenceItem).project;

  // ─── フォーム state ──────────────────────────────────────────────────────────
  const [title,       setTitle]       = useState(item.title ?? "");

  // コンテ固有
  const [duration,    setDuration]    = useState(60);

  // シーケンス固有
  const [aspectRatio, setAspectRatio] = useState(project?.aspectRatio ?? "16:9");
  const [width,       setWidth]       = useState(project?.width ?? 1920);
  const [height,      setHeight]      = useState(project?.height ?? 1080);
  const [fps,         setFps]         = useState(project?.fps ?? 30);
  const [bgColor,     setBgColor]     = useState(project?.backgroundColor ?? "#000000");

  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState<string | null>(null);

  // ─── スタイル定数 ────────────────────────────────────────────────────────────
  const INPUT: React.CSSProperties = {
    width: "100%", border: "1px solid #e2e8f0", borderRadius: 8,
    background: "#f8fafd", fontSize: 12, color: "#1e293b",
    fontFamily: FONT, padding: "8px 10px", outline: "none", boxSizing: "border-box",
  };
  const LBL: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "#475569",
    display: "block", marginBottom: 4, fontFamily: FONT,
  };
  const SEC: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.07em",
    textTransform: "uppercase" as const, marginTop: 16, marginBottom: 10,
    paddingBottom: 6, borderBottom: "1px solid #f1f5f9", fontFamily: FONT,
  };
  const FIELD: React.CSSProperties = { marginBottom: 12 };

  // ─── 保存 ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    try {
      if (isConte) {
        await updateStoryboard(item.id, { title: title.trim() || "無題のコンテ" });
      }
      // sequence タイトル更新: TODO API (/api/projects/[id] PATCH)
      onSaved(item.id, { title: title.trim() || item.title || "" });
      onClose();
    } catch (e: any) {
      setSaveError(e?.message ?? "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const sceneCount = isConte ? (item as ConteItem).sceneCount : null;
  const dateStr = (iso: string) =>
    new Date(iso).toLocaleString("ja-JP", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.4)", zIndex:3000, display:"flex", alignItems:"center", justifyContent:"center", padding:16, fontFamily:FONT }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:460, maxHeight:"88vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(0,0,0,0.22)" }}>

        {/* ヘッダー */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"16px 20px", borderBottom:"1px solid #f1f5f9", flexShrink:0 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:`${color}15`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            {isConte ? <ConteIcon color={color} /> : <SequenceIcon color={color} />}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#1e293b" }}>
              {isConte ? "コンテの設定" : "シーケンスの設定"}
            </div>
            <div style={{ fontSize:11, color:"#94a3b8", marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {item.title ?? "無題"}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#94a3b8", lineHeight:1, padding:"4px 6px", borderRadius:6, flexShrink:0 }}>×</button>
        </div>

        {/* ボディ（スクロール） */}
        <div style={{ flex:1, overflowY:"auto", padding:"4px 20px 0" }}>

          {/* ── 基本情報 ── */}
          <div style={SEC}>基本情報</div>

          <div style={FIELD}>
            <label style={LBL}>タイトル</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }} style={INPUT} />
          </div>

          {/* ── コンテ：動画の尺 ── */}
          {isConte && (
            <div style={FIELD}>
              <label style={LBL}>動画の尺</label>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <input type="range" min={15} max={600} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                  style={{ flex:1, accentColor:color, cursor:"pointer" }} />
                <span style={{ fontSize:12, fontWeight:700, color:"#1e293b", minWidth:44, textAlign:"right", flexShrink:0 }}>{duration}秒</span>
              </div>
            </div>
          )}

          {/* ── シーケンス：動画設定 ── */}
          {!isConte && (<>
            <div style={SEC}>動画設定</div>

            <div style={FIELD}>
              <label style={LBL}>アスペクト比</label>
              <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} style={{ ...INPUT, cursor:"pointer" }}>
                {ASPECT_RATIO_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div style={FIELD}>
              <label style={LBL}>解像度</label>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))} min={1} max={7680}
                  style={{ ...INPUT, flex:1 }} />
                <span style={{ fontSize:12, color:"#94a3b8", fontWeight:600, flexShrink:0 }}>×</span>
                <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} min={1} max={4320}
                  style={{ ...INPUT, flex:1 }} />
                <span style={{ fontSize:11, color:"#94a3b8", flexShrink:0 }}>px</span>
              </div>
              <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                {RESOLUTION_PRESETS.map((p) => {
                  const active = width === p.w && height === p.h;
                  return (
                    <button key={p.label} onClick={() => { setWidth(p.w); setHeight(p.h); }}
                      style={{ padding:"3px 8px", fontSize:10, fontWeight:600, borderRadius:5, border:`1px solid ${active?color:"#e2e8f0"}`, background:active?`${color}0e`:"#fafafa", color:active?color:"#64748b", cursor:"pointer", fontFamily:FONT }}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={FIELD}>
              <label style={LBL}>フレームレート</label>
              <select value={fps} onChange={(e) => setFps(Number(e.target.value))} style={{ ...INPUT, cursor:"pointer" }}>
                <option value={24}>24 fps（映画風）</option>
                <option value={30}>30 fps（標準）</option>
                <option value={60}>60 fps（滑らか）</option>
              </select>
            </div>

            <div style={FIELD}>
              <label style={LBL}>背景色</label>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                  style={{ width:34, height:34, border:"1px solid #e2e8f0", borderRadius:7, padding:3, cursor:"pointer", background:"none", flexShrink:0 }} />
                <span style={{ fontSize:11, color:"#64748b", fontFamily:"monospace" }}>{bgColor.toUpperCase()}</span>
                <div style={{ display:"flex", gap:4, marginLeft:2 }}>
                  {["#000000","#ffffff","#1e293b","#f8fafd"].map((c) => (
                    <button key={c} onClick={() => setBgColor(c)} title={c}
                      style={{ width:20, height:20, borderRadius:5, background:c, border:`2px solid ${bgColor===c?color:"#e2e8f0"}`, cursor:"pointer", padding:0 }} />
                  ))}
                </div>
              </div>
            </div>
          </>)}

          {/* ── 情報 ── */}
          <div style={SEC}>情報</div>

          <div style={{ background:"#f8fafd", border:"1px solid #f0f0f0", borderRadius:8, padding:"10px 12px", marginBottom:16 }}>
            {sceneCount !== null && (
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"3px 0" }}>
                <span style={{ color:"#64748b" }}>シーン数</span>
                <span style={{ fontWeight:700, color:"#1e293b" }}>{sceneCount} シーン</span>
              </div>
            )}
            {!isConte && project?.durationSec && (
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"3px 0" }}>
                <span style={{ color:"#64748b" }}>総尺</span>
                <span style={{ fontWeight:700, color:"#1e293b" }}>{project.durationSec} 秒</span>
              </div>
            )}
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"3px 0" }}>
              <span style={{ color:"#64748b" }}>更新日時</span>
              <span style={{ color:"#334155" }}>{dateStr(item.updatedAt)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"3px 0", borderTop:"1px solid #f0f0f0", marginTop:4, paddingTop:6 }}>
              <span style={{ color:"#64748b" }}>ID</span>
              <span style={{ color:"#94a3b8", fontSize:10, fontFamily:"monospace", userSelect:"all" }}>{item.id}</span>
            </div>
          </div>

          {saveError && (
            <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#dc2626", marginBottom:12 }}>
              {saveError}
            </div>
          )}
        </div>

        {/* フッター */}
        <div style={{ padding:"12px 20px 16px", borderTop:"1px solid #f1f5f9", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <button
            onClick={() => { onDelete(item); onClose(); }}
            style={{ padding:"8px 14px", fontSize:12, fontWeight:600, borderRadius:8, border:"1px solid #fca5a5", background:"#fff5f5", color:"#ef4444", cursor:"pointer", fontFamily:FONT }}
          >
            削除
          </button>
          <div style={{ flex:1 }} />
          <button onClick={onClose}
            style={{ padding:"8px 14px", fontSize:12, fontWeight:600, borderRadius:8, border:"1px solid #e2e8f0", background:"#fff", color:"#64748b", cursor:"pointer", fontFamily:FONT }}>
            キャンセル
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding:"8px 22px", fontSize:12, fontWeight:700, borderRadius:8, border:"none", background:saving?`${color}55`:color, color:"#fff", cursor:saving?"not-allowed":"pointer", fontFamily:FONT }}>
            {saving ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
}

// ─── AI コンテポップアップ ────────────────────────────────────────────────────

const SPEED_OPTIONS = [
  { label: "遅い", sub: "×0.67", value: "遅い(1文字0.30秒)" },
  { label: "通常", sub: "×1.0",  value: "通常(1文字0.20秒)" },
  { label: "速い", sub: "×1.3",  value: "速い(1文字0.15秒)" },
  { label: "超速", sub: "×2.0",  value: "かなり速い(1文字0.10秒)" },
];

function AiContePopup({ onClose, onCreated, workspaceId }: {
  onClose:    () => void;
  onCreated:  (item: StoryboardListItem) => void;
  workspaceId?: string | null;
}) {
  const [conteName,  setConteName]  = useState("新しいコンテ");
  const [sourceText, setSourceText] = useState("");
  const [promptText, setPromptText] = useState("");
  const [duration,   setDuration]   = useState(60);
  const [speed,      setSpeed]      = useState("通常(1文字0.20秒)");
  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState<string | null>(null);
  const [genStep,    setGenStep]    = useState<"idle"|"creating"|"generating"|"saving">("idle");

  const handleGenerate = async () => {
    if (generating || !sourceText.trim()) return;
    setGenerating(true); setGenError(null); setGenStep("creating");

    const createRes = await createStoryboard({ title: conteName.trim() || "新しいコンテ", workspaceId });
    if (!createRes.ok || !createRes.storyboard) {
      setGenError(createRes.message ?? "コンテの作成に失敗しました");
      setGenerating(false); setGenStep("idle"); return;
    }
    const sbId = createRes.storyboard.id;
    setGenStep("generating");

    const genRes = await generateStoryboard(sbId, { sourceText, prompt: promptText, duration, speed });
    if (!genRes.ok) {
      setGenError(genRes.message ?? "AI生成に失敗しました");
      setGenerating(false); setGenStep("idle"); return;
    }
    setGenStep("saving");
    await new Promise((r) => setTimeout(r, 300));
    onCreated({ id: sbId, title: conteName.trim() || "新しいコンテ", status: "ready", updatedAt: new Date().toISOString(), sceneCount: genRes.sceneCount ?? 0 });
    setGenerating(false); setGenStep("idle"); onClose();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.3)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={(e) => { if (!generating && e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:500, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 16px 48px rgba(0,0,0,0.18)", fontFamily:FONT }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px 0" }}>
          <span style={{ fontSize:14, fontWeight:700, color:"#1e293b" }}>原稿からAIがコンテ作成</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:"#94a3b8", lineHeight:1, padding:"2px 6px", borderRadius:4 }}>×</button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"14px 18px 20px", display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#475569", display:"block", marginBottom:5 }}>コンテ名</label>
            <input value={conteName} onChange={(e) => setConteName(e.target.value)}
              style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, background:"#f8fafd", fontSize:13, color:"#1e293b", fontFamily:FONT, padding:"8px 10px", outline:"none", boxSizing:"border-box" }}/>
          </div>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
              <span style={{ color:"#64748b", display:"flex" }}><DocIcon /></span>
              <span style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>ナレーションの元となる原稿</span>
            </div>
            <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} rows={8}
              placeholder="例：当社はテクノロジーで社会の基盤を支えるを理念に..."
              style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:10, background:"#f8fafd", resize:"none", fontSize:12, color:"#334155", fontFamily:FONT, padding:"10px 12px", lineHeight:1.7, outline:"none", boxSizing:"border-box" }}/>
          </div>
          <div>
            <textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} rows={3}
              placeholder="指示プロンプト（例：学生にもわかるように...）"
              style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:10, background:"#f8fafd", resize:"none", fontSize:12, color:"#334155", fontFamily:FONT, padding:"10px 12px", lineHeight:1.7, outline:"none", boxSizing:"border-box" }}/>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ color:"#64748b", display:"flex", flexShrink:0 }}><MonitorIcon /></span>
            <span style={{ fontSize:13, fontWeight:700, color:"#1e293b", whiteSpace:"nowrap" }}>動画の尺</span>
            <input type="range" min={15} max={600} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))}
              style={{ flex:1, accentColor:CONTE_COLOR, cursor:"pointer" }}/>
            <span style={{ fontSize:13, fontWeight:700, color:"#1e293b", minWidth:44, textAlign:"right", flexShrink:0 }}>{duration} 秒</span>
          </div>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <span style={{ color:"#64748b", display:"flex", flexShrink:0 }}><MicIcon /></span>
              <span style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>読み速度</span>
            </div>
            <div style={{ display:"flex", gap:4, background:"#f0f0f0", borderRadius:10, padding:3 }}>
              {SPEED_OPTIONS.map((s) => {
                const active = speed === s.value;
                return (
                  <button key={s.value} onClick={() => setSpeed(s.value)} style={{ flex:1, padding:"6px 4px", fontSize:11, fontWeight:600, borderRadius:8, border:"none", background:active?"#fff":"transparent", color:active?CONTE_COLOR:"#999", boxShadow:active?"0 1px 4px rgba(0,0,0,0.1)":"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:1, fontFamily:FONT }}>
                    <span>{s.label}</span><span style={{ fontSize:9, opacity:0.7 }}>{s.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {genError && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"9px 12px", fontSize:12, color:"#dc2626" }}>{genError}</div>}

          {generating ? (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <style>{`@keyframes cp-spin{to{transform:rotate(360deg)}}`}</style>
              <div style={{ height:52, borderRadius:99, background:`linear-gradient(45deg, ${CONTE_COLOR}, #0d7a6e)`, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", gap:10, fontSize:14, fontWeight:700, fontFamily:FONT }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation:"cp-spin 0.9s linear infinite" }}>
                  <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
                  <path d="M10 2a8 8 0 0 1 8 8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                {genStep === "creating" ? "準備中..." : genStep === "generating" ? "AIが生成中..." : "保存中..."}
              </div>
            </div>
          ) : (
            <button onClick={handleGenerate} disabled={!sourceText.trim()} style={{ flex:1, height:48, borderRadius:99, background:!sourceText.trim()?`${CONTE_COLOR}55`:`linear-gradient(45deg, ${CONTE_COLOR}, #0d7a6e)`, color:"#fff", border:"none", fontSize:14, fontWeight:700, cursor:!sourceText.trim()?"not-allowed":"pointer", fontFamily:FONT }}>
              コンテ化して出力する
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 作成方法選択モーダル ─────────────────────────────────────────────────────

function ConteChoiceModal({ onClose, onAi, onBlank }: {
  onClose: () => void; onAi: () => void; onBlank: () => void;
}) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.25)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:16, padding:"22px 20px 18px", width:260, boxShadow:"0 8px 32px rgba(0,0,0,0.14)", fontFamily:FONT }}
        onClick={(e) => e.stopPropagation()}>
        <p style={{ margin:"0 0 14px", fontSize:13, fontWeight:700, color:"#1e293b", textAlign:"center" }}>コンテの作成方法</p>
        <button onClick={onAi} style={{ width:"100%", padding:"11px 12px", fontSize:13, fontWeight:600, borderRadius:10, border:`1.5px solid ${CONTE_COLOR}`, background:`${CONTE_COLOR}0e`, color:CONTE_COLOR, cursor:"pointer", textAlign:"left", fontFamily:FONT, display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
          <span style={{ color:CONTE_COLOR, display:"flex" }}><SparkleIcon /></span>原稿からAIがコンテ作成
        </button>
        <button onClick={onBlank} style={{ width:"100%", padding:"11px 12px", fontSize:13, fontWeight:600, borderRadius:10, border:"1.5px solid #e2e8f0", background:"#fafafa", color:"#475569", cursor:"pointer", textAlign:"left", fontFamily:FONT, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ color:"#64748b", display:"flex" }}><FolderPlusIcon /></span>空のコンテから始める
        </button>
        <div style={{ height:12 }}/>
        <button onClick={onClose} style={{ width:"100%", padding:"7px", fontSize:12, color:"#94a3b8", background:"none", border:"none", cursor:"pointer", fontFamily:FONT }}>キャンセル</button>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  selectedStoryboardId: string | null;
  onSelectStoryboard:   (id: string) => void;
  selectedProjectId:    string | null;
  onSelectProject:      (project: Project | null) => void;
  onSwitchToVideo:      () => void;
  onSwitchToConte?:     () => void;
  workspaceId?:         string | null;
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SidePanelConteProject({
  selectedStoryboardId,
  onSelectStoryboard,
  selectedProjectId,
  onSelectProject,
  onSwitchToVideo,
  onSwitchToConte,
  workspaceId,
}: Props) {
  const [items,       setItems]       = useState<MixedItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [createMenu,  setCreateMenu]  = useState(false);
  const [creating,    setCreating]    = useState(false);
  const [showChoice,  setShowChoice]  = useState(false);
  const [showAiPopup, setShowAiPopup] = useState(false);
  const [showSeqModal,setShowSeqModal]= useState(false);
  const [renamingId,   setRenamingId]   = useState<string | null>(null);
  const [renameValue,  setRenameValue]  = useState("");
  const [renameKind,   setRenameKind]   = useState<"conte"|"sequence">("conte");
  const [settingsItem, setSettingsItem] = useState<MixedItem | null>(null);
  const menuRef      = useRef<HTMLDivElement>(null);
  const renameRef    = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const [sbRes, prRes] = await Promise.all([
      listStoryboards(workspaceId),
      getProjects(workspaceId),
    ]);
    const contes: ConteItem[] = (sbRes.ok ? sbRes.items : []).map((s) => ({ kind: "conte" as const, ...s }));
    const seqs:   SequenceItem[] = (prRes.ok && prRes.projects ? prRes.projects : []).map((p) => ({
      kind: "sequence" as const, id: p.id, title: p.title, updatedAt: p.updatedAt, project: p,
    }));
    const merged: MixedItem[] = [...contes, ...seqs].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    setItems(merged);
    setLoading(false);
  };

  useEffect(() => { load(); }, [workspaceId]);

  // メニュー外クリックで閉じる
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setCreateMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ─── コンテ作成 ─────────────────────────────────────────────────────────────

  const handleCreateBlank = async () => {
    setShowChoice(false); setCreating(true);
    const res = await createStoryboard({ title: "新しいコンテ", workspaceId });
    if (res.ok && res.storyboard) {
      const item: ConteItem = { kind: "conte", id: res.storyboard.id, title: res.storyboard.title, status: res.storyboard.status, updatedAt: res.storyboard.updatedAt, sceneCount: 0 };
      setItems((prev) => [item, ...prev]);
      onSelectStoryboard(res.storyboard!.id);
      onSwitchToConte?.();
    }
    setCreating(false);
  };

  const handleAiCreated = (sb: StoryboardListItem) => {
    const item: ConteItem = { kind: "conte", ...sb };
    setItems((prev) => [item, ...prev]);
    onSelectStoryboard(sb.id);
    onSwitchToConte?.();
  };

  // ─── シーケンス作成 ──────────────────────────────────────────────────────────

  const handleCreateSequence = async (
    title: string, aspectRatio: string, width: number, height: number, fps: number, backgroundColor: string,
  ) => {
    const res = await createProject(title, aspectRatio, width, height, fps, backgroundColor, workspaceId);
    if (res.ok && res.project) {
      const item: SequenceItem = { kind: "sequence", id: res.project.id, title: res.project.title, updatedAt: res.project.updatedAt, project: res.project };
      setItems((prev) => [item, ...prev]);
      onSelectProject(res.project);
      onSwitchToVideo();
    }
    setShowSeqModal(false);
  };

  // ─── リネーム ────────────────────────────────────────────────────────────────

  const startRename = (item: MixedItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(item.id);
    setRenameKind(item.kind);
    setRenameValue(item.title ?? "");
    setTimeout(() => renameRef.current?.focus(), 30);
  };

  const commitRename = async () => {
    if (!renamingId) return;
    const newTitle = renameValue.trim() || (renameKind === "conte" ? "無題のコンテ" : "Untitled Project");
    setItems((prev) => prev.map((x) => x.id === renamingId ? { ...x, title: newTitle } : x));
    setRenamingId(null);
    if (renameKind === "conte") await updateStoryboard(renamingId, { title: newTitle });
  };

  // ─── 削除 ────────────────────────────────────────────────────────────────────

  const handleDelete = async (item: MixedItem) => {
    const label = item.kind === "conte" ? "コンテ" : "シーケンス";
    if (!confirm(`「${item.title ?? "無題"}」${label}を削除しますか？`)) return;
    if (item.kind === "sequence") {
      const res = await deleteProject(item.id);
      if (res.ok) {
        setItems((prev) => prev.filter((x) => x.id !== item.id));
        if (selectedProjectId === item.id) onSelectProject(null);
      }
    }
    if (item.kind === "conte") {
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    }
  };

  const handleSettingsSaved = (id: string, patch: { title?: string }) => {
    setItems((prev) =>
      prev.map((x) => x.id === id && patch.title ? { ...x, title: patch.title! } : x)
    );
  };

  // ─── 空の絵 ──────────────────────────────────────────────────────────────────

  const EmptyState = () => (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, padding:"24px 16px" }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#ccc" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="8" width="16" height="12" rx="2"/>
        <rect x="26" y="8" width="16" height="12" rx="2"/>
        <rect x="6" y="26" width="16" height="12" rx="2"/>
        <rect x="26" y="26" width="10" height="12" rx="2"/>
      </svg>
      <p style={{ margin:0, fontSize:12, color:"#aaa", textAlign:"center", lineHeight:1.6 }}>
        コンテ・シーケンスがありません
      </p>
    </div>
  );

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", gap:8, fontFamily:FONT }}>

      {/* 作成ボタン（ドロップダウン） */}
      <div ref={menuRef} style={{ position:"relative" }}>
        <button
          onClick={() => setCreateMenu((o) => !o)}
          disabled={creating}
          style={{ width:"100%", padding:"8px 0", fontSize:13, fontWeight:600, borderRadius:8, border:`1px solid #e2e8f0`, background:"#f8fafd", color:"#334155", cursor:creating?"not-allowed":"pointer", opacity:creating?0.6:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:FONT }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>
          新規作成
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft:2 }}><path d="M2 3.5l3 3 3-3"/></svg>
        </button>

        {createMenu && (
          <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, boxShadow:"0 6px 20px rgba(0,0,0,0.1)", zIndex:100, overflow:"hidden" }}>
            <button
              onClick={() => { setCreateMenu(false); setShowChoice(true); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 14px", border:"none", background:"transparent", cursor:"pointer", fontFamily:FONT, borderBottom:"1px solid #f1f5f9" }}
            >
              <span style={{ width:24, height:24, borderRadius:6, background:`${CONTE_COLOR}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <ConteIcon />
              </span>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:13, fontWeight:600, color:CONTE_COLOR }}>コンテ</div>
                <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>ナレーション・画像・音声コンテ</div>
              </div>
            </button>
            <button
              onClick={() => { setCreateMenu(false); setShowSeqModal(true); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 14px", border:"none", background:"transparent", cursor:"pointer", fontFamily:FONT }}
            >
              <span style={{ width:24, height:24, borderRadius:6, background:`${SEQ_COLOR}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <SequenceIcon />
              </span>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:13, fontWeight:600, color:SEQ_COLOR }}>シーケンス</div>
                <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>タイムライン動画編集</div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* リスト */}
      {loading ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:12, color:"#aaa" }}>読み込み中...</span>
        </div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:4 }}>
          {items.map((item) => {
            const isConte    = item.kind === "conte";
            const color      = isConte ? CONTE_COLOR : SEQ_COLOR;
            const isSelected = isConte ? item.id === selectedStoryboardId : item.id === selectedProjectId;
            const isRenaming = renamingId === item.id;

            return (
              <button
                key={`${item.kind}-${item.id}`}
                onClick={() => {
                  if (isRenaming) return;
                  if (isConte) {
                    onSelectStoryboard(item.id);
                    onSwitchToConte?.();
                  } else {
                    onSelectProject((item as SequenceItem).project);
                    onSwitchToVideo();
                  }
                }}
                style={{
                  width:"100%", textAlign:"left", padding:"8px 10px", borderRadius:8,
                  border: isSelected ? `1.5px solid ${color}` : "1.5px solid #f0f0f0",
                  background: isSelected ? `${color}0d` : "#fafafa",
                  cursor:"pointer", fontFamily:FONT, transition:"all 0.12s", position:"relative",
                }}
              >
                {isRenaming ? (
                  <input
                    ref={renameRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingId(null); }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width:"100%", border:`1px solid ${color}`, borderRadius:4, background:"#fff", fontSize:12, fontWeight:700, color:"#1e293b", padding:"2px 4px", outline:"none", fontFamily:FONT }}
                  />
                ) : (
                  <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                    {/* 左: アイコン + タイプバッジ */}
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, flexShrink:0, paddingTop:1 }}>
                      <span style={{ display:"flex", opacity: isSelected ? 1 : 0.6 }}>
                        {isConte ? <ConteIcon color={color} /> : <SequenceIcon color={color} />}
                      </span>
                      <span style={{ fontSize:8, fontWeight:700, letterSpacing:"0.04em", padding:"1px 5px", borderRadius:3, background:`${color}18`, color, whiteSpace:"nowrap" }}>
                        {isConte ? "コンテ" : "SEQ"}
                      </span>
                    </div>

                    {/* 右: タイトル + メタ + アクション */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <span style={{ flex:1, fontSize:12, fontWeight:isSelected?700:500, color:isSelected?color:"#1e293b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {item.title ?? "無題"}
                        </span>
                        <div style={{ display:"flex", gap:2, flexShrink:0 }}>
                          <span onClick={(e) => startRename(item, e)} style={{ color:"#cbd5e1", cursor:"pointer", display:"flex", padding:2 }} title="名前を変更">
                            <PencilIcon />
                          </span>
                          <span onClick={(e) => { e.stopPropagation(); setSettingsItem(item); }} style={{ color:"#cbd5e1", cursor:"pointer", display:"flex", padding:2 }} title="設定">
                            <GearIcon />
                          </span>
                          <span onClick={(e) => { e.stopPropagation(); handleDelete(item); }} style={{ color:"#cbd5e1", cursor:"pointer", display:"flex", padding:2 }} title="削除">
                            <TrashIcon />
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize:10, color:"#94a3b8", marginTop:3 }}>
                        {isConte && `${(item as ConteItem).sceneCount} シーン · `}{fmtDate(item.updatedAt)}
                      </div>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* モーダル群 */}
      {showChoice && (
        <ConteChoiceModal
          onClose={() => setShowChoice(false)}
          onAi={() => { setShowChoice(false); setShowAiPopup(true); }}
          onBlank={() => { setShowChoice(false); handleCreateBlank(); }}
        />
      )}
      {showAiPopup && (
        <AiContePopup
          onClose={() => setShowAiPopup(false)}
          onCreated={handleAiCreated}
          workspaceId={workspaceId}
        />
      )}
      {showSeqModal && (
        <SidePanelProjectCreateModal
          onClose={() => setShowSeqModal(false)}
          onCreate={handleCreateSequence}
        />
      )}
      {settingsItem && (
        <SettingsModal
          item={settingsItem}
          onClose={() => setSettingsItem(null)}
          onSaved={handleSettingsSaved}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
