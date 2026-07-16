"use client";

import { useEffect, useRef, useState } from "react";
import { TEAL } from "@/components/icons";
import { useAuthUser } from "@/lib/auth.user";
import { updateWorkspace } from "@/lib/workspace.api";
import { loadImageSettings, saveImageSettings, DEFAULT_IMAGE_SETTINGS } from "@/lib/imageSettings";
import type { ImageSettings } from "@/lib/imageSettings";
import { IMAGE_STYLE_TEMPLATES, getTemplateById, TEMPLATE_CATEGORY_LABELS } from "@/lib/imageTemplates";
import type { ImageStyleTemplate } from "@/lib/imageTemplates";
import { getPresignedUrl } from "@/lib/fileupload.front";
import { loadVideoSettings, saveVideoSettings, DEFAULT_VIDEO_SETTINGS } from "@/lib/videoSettings";
import type { VideoSettings } from "@/lib/videoSettings";
import { loadTtsSettings, saveTtsSettings, DEFAULT_TTS_SETTINGS, GEMINI_TTS_MODELS, GEMINI_VOICES, GEMINI_VOICE_META, TTS_PACING_OPTIONS, TTS_TONE_OPTIONS } from "@/lib/ttsSettings";
import type { TtsSettings } from "@/lib/ttsSettings";
import { loadScriptSettings, saveScriptSettings, DEFAULT_SCRIPT_SETTINGS } from "@/lib/scriptSettings";
import type { ScriptSettings } from "@/lib/scriptSettings";
import { loadTelopSettings, saveTelopSettings, DEFAULT_TELOP_SETTINGS } from "@/lib/telopSettings";
import type { TelopSettings } from "@/lib/telopSettings";
import { loadExportSettings, saveExportSettings, DEFAULT_EXPORT_SETTINGS, RESOLUTION_MAP, loadPdfSettings, savePdfSettings, DEFAULT_PDF_SETTINGS, loadSpreadsheetSettings, saveSpreadsheetSettings, DEFAULT_SPREADSHEET_SETTINGS } from "@/lib/exportSettings";
import type { ExportSettings, ExportResolution, PdfSettings, SpreadsheetSettings } from "@/lib/exportSettings";
import { loadBgmSettings, saveBgmSettings, DEFAULT_BGM_SETTINGS } from "@/lib/bgmSettings";
import type { BgmSettings, BgmVocal, BgmModel } from "@/lib/bgmSettings";
import { loadVideoExportSettings, saveVideoExportSettings, resetVideoExportToSequence } from "@/lib/videoExportSettings";
import type { VideoExportSettings } from "@/lib/videoExportSettings";

export type WsSettingsTab = "general" | "script" | "telop" | "image" | "video" | "narration" | "bgm" | "render" | "export";

const FONT = "'Noto Sans JP', sans-serif";

// ─── Icons ────────────────────────────────────────────────────────────────────

function GearFillIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.34.07-.68.07-1.08s-.03-.74-.07-1.08l2.32-1.84c.21-.16.27-.47.12-.7l-2.2-3.82c-.14-.23-.44-.3-.67-.23l-2.73 1.1c-.57-.44-1.18-.81-1.85-1.08L14.09 2H9.91L9.5 4.83C8.83 5.1 8.22 5.47 7.65 5.91L4.92 4.81c-.23-.07-.53 0-.67.23L2.05 8.86c-.14.23-.08.54.12.7l2.32 1.84C4.03 11.26 4 11.6 4 12s.03.74.07 1.08l-2.32 1.84c-.21.16-.27.47-.12.7l2.2 3.82c.14.23.44.3.67.23l2.73-1.1c.57.44 1.18.81 1.85 1.08L9.91 22h4.18l.41-2.83c.67-.27 1.28-.64 1.85-1.08l2.73 1.1c.23.07.53 0 .67-.23l2.2-3.82c.14-.23.08-.54-.12-.7l-2.32-1.84Z"/>
    </svg>
  );
}

function DocTabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <rect x="2" y="1" width="10" height="12" rx="1.5"/><path d="M5 5h4M5 7.5h4M5 10h2.5"/>
    </svg>
  );
}

function TelopTabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <rect x="1" y="3" width="12" height="8" rx="1.5"/>
      <path d="M3.5 7h7M3.5 9.5h4"/>
    </svg>
  );
}

function ImgTabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="12" height="10" rx="1.5"/>
      <circle cx="4.5" cy="5.5" r="1"/>
      <path d="M1 10l3.5-3.5L7 9l2-2 4 3"/>
    </svg>
  );
}

function VideoTabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2.5" width="9" height="9" rx="1.5"/>
      <path d="M10 5l3-2v8l-3-2"/>
    </svg>
  );
}

function MicTabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <rect x="5" y="1" width="4" height="7" rx="2"/><path d="M2 7a5 5 0 0 0 10 0M7 12v1.5"/>
    </svg>
  );
}

function ExportTabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="12" height="9" rx="1.5"/>
      <path d="M4 13h6M7 10v3"/>
      <path d="M4.5 6l2.5-2.5L9.5 6"/>
      <path d="M7 3.5v4"/>
    </svg>
  );
}

function BgmTabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 11V3l7-1.5v8"/>
      <circle cx="3.5" cy="11" r="1.5"/>
      <circle cx="10.5" cy="9.5" r="1.5"/>
    </svg>
  );
}

function RenderTabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="12" height="10" rx="1.5"/>
      <path d="M5.5 5.2l4 2.3-4 2.3V5.2z" fill="currentColor" stroke="none"/>
    </svg>
  );
}

// ─── Provider logos ───────────────────────────────────────────────────────────

function ProviderLogo({ provider, size = 20 }: { provider: "google" | "byteplus" | "reve" | "elevenlabs" | "anthropic"; size?: number }) {
  if (provider === "google") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    );
  }
  const cfg = provider === "byteplus"   ? { bg: "#E67D30", text: "B+", r: 5 }
            : provider === "elevenlabs" ? { bg: "#6C47FF", text: "11", r: 5 }
            : provider === "anthropic"  ? { bg: "#D97706", text: "A",  r: 5 }
            :                             { bg: "#7F5AF0", text: "R",  r: size };
  return (
    <div style={{
      width: size, height: size, borderRadius: cfg.r, background: cfg.bg,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      fontSize: Math.floor(size * 0.44), fontWeight: 800, color: "#fff",
      fontFamily: "Arial, sans-serif", letterSpacing: "-0.5px",
    }}>
      {cfg.text}
    </div>
  );
}

// ─── Model dropdown ────────────────────────────────────────────────────────────

type ModelEntry = { id: string; label: string; sub: string; color: string; provider: "google" | "byteplus" | "reve" | "elevenlabs" | "anthropic" };

function ModelDropdown({ models, value, onChange, lockedIds }: {
  models: readonly ModelEntry[];
  value: string;
  onChange: (id: string) => void;
  lockedIds?: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = models.find((m) => m.id === value) ?? models[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "9px 12px", border: `1.5px solid ${open ? selected.color : "#e2e8f0"}`,
          borderRadius: 10, background: "#fff", cursor: "pointer", fontFamily: FONT,
          transition: "border-color 0.15s",
        }}
      >
        <ProviderLogo provider={selected.provider} size={22} />
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{selected.label}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginTop: 1 }}>{selected.sub}</div>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#94a3b8" strokeWidth="1.6" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <path d="M2 4l4 4 4-4"/>
        </svg>
      </button>

      {/* dropdown list */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200,
          background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden",
        }}>
          {models.map((m, idx) => {
            const isSelected = m.id === value;
            const isLocked   = lockedIds?.includes(m.id) ?? false;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => { if (isLocked) return; onChange(m.id); setOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", border: "none",
                  borderBottom: idx < models.length - 1 ? "1px solid #f1f5f9" : "none",
                  background: isLocked ? "#f8fafc" : isSelected ? `${m.color}0f` : "transparent",
                  cursor: isLocked ? "not-allowed" : "pointer", fontFamily: FONT,
                  opacity: isLocked ? 0.65 : 1,
                }}
              >
                <ProviderLogo provider={m.provider} size={20} />
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 9, color: isLocked ? "#94a3b8" : (isSelected ? m.color : "#94a3b8"), fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{m.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isLocked ? "#94a3b8" : (isSelected ? m.color : "#334155"), marginTop: 1 }}>{m.sub}</div>
                </div>
                {isLocked && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#e67d30", background: "#fff3e8", padding: "2px 6px", borderRadius: 4, border: "1px solid #e67d3040", whiteSpace: "nowrap", flexShrink: 0 }}>
                    有料プラン
                  </span>
                )}
                {isSelected && !isLocked && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={m.color} strokeWidth="2" strokeLinecap="round">
                    <path d="M2 7l4 4 6-6"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: { id: WsSettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: "general",   label: "一般",            icon: <GearFillIcon size={14} /> },
  { id: "script",    label: "AI 台本生成",      icon: <DocTabIcon /> },
  { id: "telop",     label: "AI テロップ生成",  icon: <TelopTabIcon /> },
  { id: "image",     label: "AI 画像生成",      icon: <ImgTabIcon /> },
  { id: "video",     label: "AI 動画生成",      icon: <VideoTabIcon /> },
  { id: "narration", label: "AI ナレーション",  icon: <MicTabIcon /> },
  { id: "bgm",       label: "AI BGM",           icon: <BgmTabIcon /> },
  { id: "export",    label: "コンテ変換",         icon: <ExportTabIcon /> },
  { id: "render",    label: "動画書き出し",       icon: <RenderTabIcon /> },
];

// ─── Model definitions ────────────────────────────────────────────────────────

const IMAGE_MODELS = [
  { id: "google-image-lite", label: "Google AI",         sub: "Nano Banana 2 Lite", color: "#4285F4", provider: "google"   as const },
  { id: "google-image-pro",  label: "Google AI",         sub: "Nano Banana Pro",    color: "#1A73E8", provider: "google"   as const },
  { id: "reve-1",            label: "Reve AI",           sub: "Reve-1",             color: "#7F5AF0", provider: "reve"     as const },
  { id: "seedream-5-0-pro",  label: "BytePlus ModelArk", sub: "Seedream 5.0 Pro",   color: "#E67D30", provider: "byteplus" as const },
] as const;

const VIDEO_MODELS = [
  { id: "veo-3-lite",       label: "Google AI",         sub: "Veo 3.1 Lite",     color: "#4285F4", provider: "google"   as const, veoLite: true  },
  { id: "veo-3",            label: "Google AI",         sub: "Veo 3.1",          color: "#1A73E8", provider: "google"   as const, veoLite: false },
  { id: "seedance-1-5-pro", label: "BytePlus ModelArk", sub: "Seedance 1.5 Pro", color: "#E67D30", provider: "byteplus" as const, veoLite: false },
] as const;

const TTS_MODELS = [
  { id: "gemini-tts-high",  label: "Google AI",   sub: "Gemini 3.1 Flash TTS",  color: "#1A73E8", provider: "google"     as const },
  { id: "elevenlabs",       label: "ElevenLabs",  sub: "ElevenLabs",            color: "#6C47FF", provider: "elevenlabs" as const },
] as const;

const SCRIPT_MODELS = [
  { id: "claude-haiku-4-5",  label: "Anthropic", sub: "Claude Haiku 4.5",  color: "#D97706", provider: "anthropic" as const },
  { id: "claude-sonnet-4-6", label: "Anthropic", sub: "Claude Sonnet 4.6", color: "#B45309", provider: "anthropic" as const },
  { id: "claude-opus-4-7",   label: "Anthropic", sub: "Claude Opus 4.7",   color: "#92400E", provider: "anthropic" as const },
] as const;

const TELOP_MODELS = [
  { id: "claude-haiku-4-5",  label: "Anthropic", sub: "Claude Haiku 4.5",  color: "#D97706", provider: "anthropic" as const },
  { id: "claude-sonnet-4-6", label: "Anthropic", sub: "Claude Sonnet 4.6", color: "#B45309", provider: "anthropic" as const },
  { id: "claude-opus-4-7",   label: "Anthropic", sub: "Claude Opus 4.7",   color: "#92400E", provider: "anthropic" as const },
] as const;

const BGM_MODEL_ENTRIES = [
  { id: "lyria-3-pro-preview", label: "Google AI", sub: "Lyria 3 Pro", color: "#1A73E8", provider: "google" as const },
  { id: "lyria-2",             label: "Google AI", sub: "Lyria 2",     color: "#4285F4", provider: "google" as const },
] as const;

const SD_ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4", "3:2", "2:3", "21:9"] as const;

const SD_SIZE_MAP: Record<string, Record<string, string>> = {
  "1K": { "1:1":"1024x1024","4:3":"1152x864","3:4":"864x1152","16:9":"1424x800","9:16":"800x1424","3:2":"1248x832","2:3":"832x1248","21:9":"1568x672" },
  "2K": { "1:1":"2048x2048","4:3":"2368x1776","3:4":"1776x2368","16:9":"2816x1584","9:16":"1584x2816","3:2":"2496x1664","2:3":"1664x2496","21:9":"3136x1344" },
};

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  defaultTab?: WsSettingsTab;
  workspaceId?: string;
  workspaceName?: string;
  onClose: () => void;
  onNameChanged?: (name: string) => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function WorkspaceSettingsModal({ defaultTab = "image", workspaceId, workspaceName, onClose, onNameChanged }: Props) {
  const [activeTab, setActiveTab] = useState<WsSettingsTab>(
    !workspaceId && defaultTab === "general" ? "image" : defaultTab
  );
  const [wsName, setWsName] = useState(workspaceName ?? "");
  const [img, setImg]       = useState<ImageSettings>(() => loadImageSettings());
  const [vid, setVid]       = useState<VideoSettings>(() => loadVideoSettings());
  const [tts, setTts]       = useState<TtsSettings>(() => loadTtsSettings());
  const [scr, setScr]       = useState<ScriptSettings>(() => loadScriptSettings());
  const [telop, setTelop]   = useState<TelopSettings>(() => loadTelopSettings());
  const [exp, setExp]       = useState<ExportSettings>(() => loadExportSettings());
  const [pdf, setPdf]       = useState<PdfSettings>(() => loadPdfSettings());
  const [ss,  setSs]        = useState<SpreadsheetSettings>(() => loadSpreadsheetSettings());
  const [bgm, setBgm]       = useState<BgmSettings>(() => loadBgmSettings());
  const [render, setRender] = useState<VideoExportSettings>(() => loadVideoExportSettings());
  const [saving, setSaving] = useState(false);
  const [wsTemplatePickerOpen, setWsTemplatePickerOpen] = useState(false);
  const [uploadingRefImg, setUploadingRefImg] = useState(false);
  const wsRefUploadRef = useRef<HTMLInputElement>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { user } = useAuthUser();
  const isFree = !user?.plan || user.plan === "Free";

  const visibleTabs = workspaceId ? TABS : TABS.filter((t) => t.id !== "general");

  const INPUT: React.CSSProperties = {
    width: "100%", border: "1px solid #e2e8f0", borderRadius: 8,
    background: "#f8fafd", fontSize: 12, color: "#1e293b",
    fontFamily: FONT, padding: "8px 10px", outline: "none", boxSizing: "border-box",
  };
  const LBL: React.CSSProperties   = { fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4, fontFamily: FONT };
  const SEC: React.CSSProperties   = { fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.07em", textTransform: "uppercase" as const, marginTop: 16, marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #f1f5f9", fontFamily: FONT };
  const FIELD: React.CSSProperties = { marginBottom: 12 };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (workspaceId && wsName.trim()) {
        await updateWorkspace(workspaceId, wsName.trim());
        onNameChanged?.(wsName.trim());
      }
      saveImageSettings(img);
      saveVideoSettings(vid);
      saveTtsSettings(tts);
      saveScriptSettings(scr);
      saveTelopSettings(telop);
      saveExportSettings(exp);
      savePdfSettings(pdf);
      saveSpreadsheetSettings(ss);
      saveBgmSettings(bgm);
      saveVideoExportSettings(render);
      audioRef.current?.pause();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleWsRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRefImg(true);
    try {
      const data = await getPresignedUrl(file, undefined, workspaceId);
      if (!data.ok || !data.presignedUrl) { alert(data.message ?? "アップロードに失敗しました"); return; }
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error("upload failed")));
        xhr.onerror = () => reject(new Error("network error"));
        xhr.open("PUT", data.presignedUrl!);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
      if (data.fileUrl) setImg((s) => ({ ...s, refImageUrl: data.fileUrl! }));
    } catch {
      alert("アップロードに失敗しました");
    } finally {
      setUploadingRefImg(false);
      e.target.value = "";
    }
  };

  const currentModelDef = IMAGE_MODELS.find((m) => m.id === img.imageModel) ?? IMAGE_MODELS[0];

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: FONT }}
      onClick={(e) => { if (e.target === e.currentTarget) { audioRef.current?.pause(); onClose(); } }}
    >
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 580, maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>

        {/* ヘッダー */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: `${TEAL}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: TEAL }}>
            <GearFillIcon size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>ワークスペースの設定</div>
            {workspaceName && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{workspaceName}</div>}
          </div>
          <button onClick={() => { audioRef.current?.pause(); onClose(); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94a3b8", lineHeight: 1, padding: "4px 6px", borderRadius: 6, flexShrink: 0 }}>×</button>
        </div>

        {/* ボディ：サイドバー ＋ コンテンツ */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* 左サイドバー */}
          <div style={{ width: 152, flexShrink: 0, background: "#f8fafd", borderRight: "1px solid #f1f5f9", padding: "10px 6px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
            {visibleTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", borderRadius: 8, border: "none",
                    background: isActive ? `${TEAL}18` : "transparent",
                    color: isActive ? TEAL : "#64748b",
                    cursor: "pointer", fontFamily: FONT, fontSize: 12,
                    fontWeight: isActive ? 700 : 500,
                    textAlign: "left", transition: "all 0.12s ease",
                  }}
                >
                  <span style={{ display: "flex", flexShrink: 0 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 右コンテンツ */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 20px" }}>

            {/* ── 一般 ── */}
            {activeTab === "general" && workspaceId && (
              <>
                <div style={SEC}>基本情報</div>
                <div style={FIELD}>
                  <label style={LBL}>ワークスペース名</label>
                  <input
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                    style={INPUT}
                  />
                </div>
              </>
            )}

            {/* ── AI台本生成 ── */}
            {activeTab === "script" && (() => {
              const scrModel = SCRIPT_MODELS.find((m) => m.id === scr.scriptModel) ?? SCRIPT_MODELS[1];
              return (
              <>
                <div style={SEC}>使用モデル</div>
                <div style={FIELD}>
                  <ModelDropdown
                    models={SCRIPT_MODELS}
                    value={scr.scriptModel}
                    onChange={(id) => setScr((s) => ({ ...s, scriptModel: id as ScriptSettings["scriptModel"] }))}
                  />
                  <div style={{ marginTop: 6, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                    {scrModel.sub === "Claude Haiku 4.5"  && "高速・低コスト。シンプルな台本生成に適しています。"}
                    {scrModel.sub === "Claude Sonnet 4.6" && "バランス型。品質とコストのバランスが取れています。"}
                    {scrModel.sub === "Claude Opus 4.7"   && "最高品質。複雑な台本や高い表現力が必要な場合に適しています。"}
                  </div>
                </div>

                {/* ── 区切りライン ── */}
                <div style={{ margin: "8px 0 4px", borderTop: "2px solid #e2e8f0", position: "relative" }}>
                  <span style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", background: "#fff", padding: "0 10px", fontSize: 10, color: "#cbd5e1", fontFamily: FONT, letterSpacing: "0.1em" }}>
                    ──────────
                  </span>
                </div>

                {/* ── 共通ルール ── */}
                <div style={{ ...SEC, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>共通ルール（全モデル適用）</span>
                  <button type="button" onClick={() => setScr((s) => ({ ...s, scriptCommonRules: DEFAULT_SCRIPT_SETTINGS.scriptCommonRules, scriptNegativePrompt: DEFAULT_SCRIPT_SETTINGS.scriptNegativePrompt }))} style={{ fontSize: 10, fontWeight: 600, color: TEAL, background: "none", border: `1px solid ${TEAL}55`, borderRadius: 5, cursor: "pointer", padding: "1px 7px", textTransform: "none" as const, letterSpacing: 0, fontFamily: FONT }}>デフォルトに戻す</button>
                </div>
                <div style={FIELD}>
                  <label style={LBL}>生成ルール</label>
                  <textarea
                    value={scr.scriptCommonRules}
                    onChange={(e) => setScr((s) => ({ ...s, scriptCommonRules: e.target.value }))}
                    rows={3}
                    style={{ ...INPUT, resize: "vertical", lineHeight: 1.6 }}
                  />
                  <div style={{ marginTop: 4, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                    すべてのモデルの台本生成に追加されるルールです。空にすると追加されません。
                  </div>
                </div>
                <div style={FIELD}>
                  <label style={LBL}>ネガティブプロンプト（除外指示）</label>
                  <textarea
                    value={scr.scriptNegativePrompt}
                    onChange={(e) => setScr((s) => ({ ...s, scriptNegativePrompt: e.target.value }))}
                    placeholder="例: 機械的な表現、過度な敬語、冗長な説明"
                    rows={2}
                    style={{ ...INPUT, resize: "none", lineHeight: 1.6 }}
                  />
                  <div style={{ marginTop: 4, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                    全モデル共通。「避けてください: ...」として台本生成指示に追加されます。
                  </div>
                </div>
              </>
              );
            })()}

            {/* ── AI テロップ生成 ── */}
            {activeTab === "telop" && (() => {
              const telopModel = TELOP_MODELS.find((m) => m.id === telop.telopModel) ?? TELOP_MODELS[0];
              return (
              <>
                <div style={SEC}>使用モデル</div>
                <div style={FIELD}>
                  <ModelDropdown
                    models={TELOP_MODELS}
                    value={telop.telopModel}
                    onChange={(id) => setTelop((s) => ({ ...s, telopModel: id as TelopSettings["telopModel"] }))}
                  />
                  <div style={{ marginTop: 6, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                    {telopModel.sub === "Claude Haiku 4.5"  && "高速・低コスト。短いテロップ生成に最適です。"}
                    {telopModel.sub === "Claude Sonnet 4.6" && "バランス型。品質とコストのバランスが取れています。"}
                    {telopModel.sub === "Claude Opus 4.7"   && "最高品質。高い表現力が必要な場合に適しています。"}
                  </div>
                </div>

                {/* ── 区切りライン ── */}
                <div style={{ margin: "8px 0 4px", borderTop: "2px solid #e2e8f0", position: "relative" }}>
                  <span style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", background: "#fff", padding: "0 10px", fontSize: 10, color: "#cbd5e1", fontFamily: FONT, letterSpacing: "0.1em" }}>
                    ──────────
                  </span>
                </div>

                {/* ── 共通ルール ── */}
                <div style={{ ...SEC, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>共通ルール（全モデル適用）</span>
                  <button type="button" onClick={() => setTelop((s) => ({ ...s, telopCommonRules: DEFAULT_TELOP_SETTINGS.telopCommonRules, telopNegativePrompt: DEFAULT_TELOP_SETTINGS.telopNegativePrompt }))} style={{ fontSize: 10, fontWeight: 600, color: TEAL, background: "none", border: `1px solid ${TEAL}55`, borderRadius: 5, cursor: "pointer", padding: "1px 7px", textTransform: "none" as const, letterSpacing: 0, fontFamily: FONT }}>デフォルトに戻す</button>
                </div>
                <div style={FIELD}>
                  <label style={LBL}>生成ルール</label>
                  <textarea
                    value={telop.telopCommonRules}
                    onChange={(e) => setTelop((s) => ({ ...s, telopCommonRules: e.target.value }))}
                    rows={3}
                    style={{ ...INPUT, resize: "vertical", lineHeight: 1.6 }}
                  />
                  <div style={{ marginTop: 4, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                    すべてのモデルのテロップ生成に追加されるルールです。空にすると追加されません。
                  </div>
                </div>
                <div style={FIELD}>
                  <label style={LBL}>ネガティブプロンプト（除外指示）</label>
                  <textarea
                    value={telop.telopNegativePrompt}
                    onChange={(e) => setTelop((s) => ({ ...s, telopNegativePrompt: e.target.value }))}
                    placeholder="例: 長文、難しい言葉、専門用語"
                    rows={2}
                    style={{ ...INPUT, resize: "none", lineHeight: 1.6 }}
                  />
                  <div style={{ marginTop: 4, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                    全モデル共通。「避けてください: ...」としてテロップ生成指示に追加されます。
                  </div>
                </div>
              </>
              );
            })()}

            {/* ── AI画像生成 ── */}
            {activeTab === "image" && (
              <>
                {/* モデル選択 */}
                <div style={SEC}>使用モデル</div>
                <div style={FIELD}>
                  <ModelDropdown
                    models={IMAGE_MODELS}
                    value={img.imageModel}
                    onChange={(id) => setImg((s) => ({ ...s, imageModel: id as ImageSettings["imageModel"] }))}
                    lockedIds={isFree ? ["google-image-pro", "reve-1", "seedream-5-0-pro"] : []}
                  />
                </div>

                {/* ── Reve AI 設定 ── */}
                {img.imageModel === "reve-1" && (
                  <>
                    <div style={SEC}>生成設定</div>

                    <div style={FIELD}>
                      <label style={LBL}>アスペクト比</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {(["16:9", "3:2", "4:3", "1:1", "3:4", "2:3", "9:16", "auto"] as const).map((ar) => (
                          <button key={ar} onClick={() => setImg((s) => ({ ...s, aspectRatio: ar }))}
                            style={{
                              fontSize: 11, padding: "4px 9px", borderRadius: 6, cursor: "pointer", fontFamily: FONT,
                              border: `1.5px solid ${img.aspectRatio === ar ? TEAL : "#e2e8f0"}`,
                              background: img.aspectRatio === ar ? `${TEAL}18` : "#fff",
                              color: img.aspectRatio === ar ? TEAL : "#64748b",
                              fontWeight: img.aspectRatio === ar ? 700 : 400,
                            }}
                          >{ar}</button>
                        ))}
                      </div>
                    </div>

                    <div style={FIELD}>
                      <label style={LBL}>バージョン</label>
                      <select value={img.version} onChange={(e) => setImg((s) => ({ ...s, version: e.target.value }))} style={{ ...INPUT, cursor: "pointer" }}>
                        <option value="latest">latest（最高品質）</option>
                        <option value="latest-fast">latest-fast（高速）</option>
                        <option value="reve-edit@20250915">reve-edit@20250915</option>
                        <option value="reve-edit-fast@20251030">reve-edit-fast@20251030</option>
                      </select>
                    </div>

                    <div style={FIELD}>
                      <label style={LBL}>
                        品質スコア（test_time_scaling）：<span style={{ color: TEAL, fontWeight: 800 }}>{img.testTimeScaling}</span>
                      </label>
                      <input type="range" min={1} max={15} value={img.testTimeScaling}
                        onChange={(e) => setImg((s) => ({ ...s, testTimeScaling: Number(e.target.value) }))}
                        style={{ display: "block", width: "100%", accentColor: TEAL }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#cbd5e1", marginTop: 2, fontFamily: FONT }}>
                        <span>1（高速）</span><span>15（最高品質）</span>
                      </div>
                    </div>

                    <div style={FIELD}>
                      <label style={LBL}>アップスケール</label>
                      <select value={img.upscaleFactor} onChange={(e) => setImg((s) => ({ ...s, upscaleFactor: Number(e.target.value) }))} style={{ ...INPUT, cursor: "pointer" }}>
                        <option value={0}>なし</option>
                        <option value={2}>2x</option>
                        <option value={3}>3x</option>
                        <option value={4}>4x</option>
                      </select>
                    </div>

                    <div style={FIELD}>
                      <label style={LBL}>後処理</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#475569", fontFamily: FONT }}>
                          <input type="checkbox" checked={img.removeBg} onChange={(e) => setImg((s) => ({ ...s, removeBg: e.target.checked }))} style={{ accentColor: TEAL, width: 14, height: 14 }} />
                          背景除去
                        </label>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input type="checkbox" checked={img.fitImageMaxDim > 0} onChange={(e) => setImg((s) => ({ ...s, fitImageMaxDim: e.target.checked ? 1024 : 0 }))} style={{ accentColor: TEAL, width: 14, height: 14 }} />
                          <span style={{ fontSize: 12, color: "#475569", fontFamily: FONT }}>フィット</span>
                          {img.fitImageMaxDim > 0 && (
                            <select value={img.fitImageMaxDim} onChange={(e) => setImg((s) => ({ ...s, fitImageMaxDim: Number(e.target.value) }))}
                              style={{ fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 6, padding: "3px 6px", background: "#fff", color: "#475569", fontFamily: FONT, outline: "none" }}
                            >
                              <option value={512}>512px</option>
                              <option value={1024}>1024px</option>
                              <option value={2048}>2048px</option>
                              <option value={4096}>4096px</option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Google AI 設定 ── */}
                {(img.imageModel === "google-image-lite" || img.imageModel === "google-image-pro") && (
                  <>
                    <div style={SEC}>生成設定</div>

                    <div style={FIELD}>
                      <label style={LBL}>アスペクト比（プロンプトへのヒント）</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {(["16:9", "9:16", "1:1", "4:3", "3:4"] as const).map((ar) => (
                          <button key={ar} onClick={() => setImg((s) => ({ ...s, googleAspectRatio: ar }))}
                            style={{
                              fontSize: 11, padding: "4px 9px", borderRadius: 6, cursor: "pointer", fontFamily: FONT,
                              border: `1.5px solid ${img.googleAspectRatio === ar ? currentModelDef.color : "#e2e8f0"}`,
                              background: img.googleAspectRatio === ar ? `${currentModelDef.color}12` : "#fff",
                              color: img.googleAspectRatio === ar ? currentModelDef.color : "#64748b",
                              fontWeight: img.googleAspectRatio === ar ? 700 : 400,
                            }}
                          >{ar}</button>
                        ))}
                      </div>
                      <div style={{ marginTop: 5, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                        指定したアスペクト比がプロンプトに追加されます
                      </div>
                    </div>

                    <div style={FIELD}>
                      <label style={LBL}>品質ヒント</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {([
                          { value: "",           label: "なし" },
                          { value: "detail",     label: "高精細" },
                          { value: "cinematic",  label: "シネマティック" },
                          { value: "commercial", label: "商用向け" },
                        ] as const).map((q) => (
                          <button key={q.value} onClick={() => setImg((s) => ({ ...s, googleQualityHint: q.value }))}
                            style={{
                              fontSize: 11, padding: "4px 9px", borderRadius: 6, cursor: "pointer", fontFamily: FONT,
                              border: `1.5px solid ${img.googleQualityHint === q.value ? currentModelDef.color : "#e2e8f0"}`,
                              background: img.googleQualityHint === q.value ? `${currentModelDef.color}12` : "#fff",
                              color: img.googleQualityHint === q.value ? currentModelDef.color : "#64748b",
                              fontWeight: img.googleQualityHint === q.value ? 700 : 400,
                            }}
                          >{q.label}</button>
                        ))}
                      </div>
                    </div>

                  </>
                )}

                {/* ── Seedream 5.0 Pro 設定 ── */}
                {img.imageModel === "seedream-5-0-pro" && (
                  <>
                    <div style={SEC}>生成設定</div>

                    <div style={FIELD}>
                      <label style={LBL}>解像度</label>
                      <div style={{ display: "flex", gap: 6 }}>
                        {(["1K", "2K"] as const).map((r) => (
                          <button key={r} onClick={() => setImg((s) => ({ ...s, sdResolution: r }))}
                            style={{
                              flex: 1, padding: "6px", borderRadius: 8, cursor: "pointer", fontFamily: FONT,
                              border: `1.5px solid ${img.sdResolution === r ? currentModelDef.color : "#e2e8f0"}`,
                              background: img.sdResolution === r ? `${currentModelDef.color}12` : "#fff",
                              color: img.sdResolution === r ? currentModelDef.color : "#64748b",
                              fontWeight: img.sdResolution === r ? 700 : 400, fontSize: 13,
                            }}
                          >
                            {r}
                            <div style={{ fontSize: 9, color: img.sdResolution === r ? currentModelDef.color : "#94a3b8", fontWeight: 400, marginTop: 1 }}>
                              {r === "1K" ? "〜1024px" : "〜2048px"}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={FIELD}>
                      <label style={LBL}>アスペクト比</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {SD_ASPECT_RATIOS.map((ar) => (
                          <button key={ar} onClick={() => setImg((s) => ({ ...s, sdAspectRatio: ar }))}
                            style={{
                              fontSize: 11, padding: "4px 9px", borderRadius: 6, cursor: "pointer", fontFamily: FONT,
                              border: `1.5px solid ${img.sdAspectRatio === ar ? currentModelDef.color : "#e2e8f0"}`,
                              background: img.sdAspectRatio === ar ? `${currentModelDef.color}12` : "#fff",
                              color: img.sdAspectRatio === ar ? currentModelDef.color : "#64748b",
                              fontWeight: img.sdAspectRatio === ar ? 700 : 400,
                            }}
                          >{ar}</button>
                        ))}
                      </div>
                      {SD_SIZE_MAP[img.sdResolution]?.[img.sdAspectRatio] && (
                        <div style={{ marginTop: 6, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                          出力サイズ: <span style={{ fontWeight: 700, color: currentModelDef.color }}>{SD_SIZE_MAP[img.sdResolution][img.sdAspectRatio]}</span> px
                        </div>
                      )}
                    </div>

                    <div style={FIELD}>
                      <label style={LBL}>出力フォーマット</label>
                      <div style={{ display: "flex", gap: 6 }}>
                        {(["jpeg", "png"] as const).map((fmt) => (
                          <button key={fmt} onClick={() => setImg((s) => ({ ...s, sdOutputFormat: fmt }))}
                            style={{
                              flex: 1, padding: "6px", borderRadius: 8, cursor: "pointer", fontFamily: FONT, fontSize: 12,
                              border: `1.5px solid ${img.sdOutputFormat === fmt ? currentModelDef.color : "#e2e8f0"}`,
                              background: img.sdOutputFormat === fmt ? `${currentModelDef.color}12` : "#fff",
                              color: img.sdOutputFormat === fmt ? currentModelDef.color : "#64748b",
                              fontWeight: img.sdOutputFormat === fmt ? 700 : 400,
                            }}
                          >{fmt.toUpperCase()}</button>
                        ))}
                      </div>
                    </div>

                    <div style={SEC}>オプション</div>

                    <div style={FIELD}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#475569", fontFamily: FONT }}>
                          <input type="checkbox" checked={img.sdOptimizePrompt} onChange={(e) => setImg((s) => ({ ...s, sdOptimizePrompt: e.target.checked }))} style={{ accentColor: currentModelDef.color, width: 14, height: 14 }} />
                          プロンプト最適化（optimize_prompt）
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#475569", fontFamily: FONT }}>
                          <input type="checkbox" checked={img.sdWatermark} onChange={(e) => setImg((s) => ({ ...s, sdWatermark: e.target.checked }))} style={{ accentColor: currentModelDef.color, width: 14, height: 14 }} />
                          ウォーターマークを付与
                        </label>
                      </div>
                    </div>
                  </>
                )}


              {/* ── 参照スタイル ── */}
              <div style={SEC}>参照スタイル（デフォルト）</div>
              <div style={FIELD}>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {([ ["none", "なし"], ["template", "テンプレート"], ["upload", "画像をアップロード"] ] as const).map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => setImg((s) => ({ ...s, refStyle: val }))}
                      style={{
                        flex: 1, fontSize: 11, padding: "6px 4px", borderRadius: 8,
                        border: `1.5px solid ${img.refStyle === val ? currentModelDef.color : "#e2e8f0"}`,
                        background: img.refStyle === val ? `${currentModelDef.color}12` : "#fff",
                        color: img.refStyle === val ? currentModelDef.color : "#64748b",
                        cursor: "pointer", fontFamily: FONT,
                        fontWeight: img.refStyle === val ? 700 : 400,
                      }}
                    >{lbl}</button>
                  ))}
                </div>

                {img.refStyle === "template" && (
                  <div>
                    {img.refTemplateId ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: `${currentModelDef.color}10`, border: `1px solid ${currentModelDef.color}40` }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: currentModelDef.color, fontFamily: FONT }}>{getTemplateById(img.refTemplateId)?.name ?? "—"}</div>
                          <div style={{ fontSize: 10, color: "#64748b", fontFamily: FONT, marginTop: 1 }}>{getTemplateById(img.refTemplateId)?.description ?? ""}</div>
                        </div>
                        <button onClick={() => setWsTemplatePickerOpen(true)} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: `1px solid ${currentModelDef.color}`, background: "transparent", color: currentModelDef.color, cursor: "pointer", fontFamily: FONT, flexShrink: 0 }}>変更</button>
                        <button onClick={() => setImg((s) => ({ ...s, refTemplateId: "" }))} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "transparent", color: "#94a3b8", cursor: "pointer", fontFamily: FONT, flexShrink: 0 }}>×</button>
                      </div>
                    ) : (
                      <button onClick={() => setWsTemplatePickerOpen(true)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px dashed #e2e8f0", background: "transparent", color: "#94a3b8", fontSize: 12, cursor: "pointer", fontFamily: FONT, textAlign: "left" }}>
                        テンプレートを選択...
                      </button>
                    )}
                  </div>
                )}

                {img.refStyle === "upload" && (
                  <div>
                    {img.refImageUrl ? (
                      <>
                        <img src={img.refImageUrl} alt="" style={{ width: "100%", borderRadius: 8, maxHeight: 200, objectFit: "cover" }} />
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          <button onClick={() => wsRefUploadRef.current?.click()} style={{ flex: 1, fontSize: 11, padding: "5px 8px", borderRadius: 6, border: `1px solid ${currentModelDef.color}`, background: "transparent", color: currentModelDef.color, cursor: "pointer", fontFamily: FONT }}>変更</button>
                          <button onClick={() => setImg((s) => ({ ...s, refImageUrl: "" }))} style={{ fontSize: 11, padding: "5px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "transparent", color: "#94a3b8", cursor: "pointer", fontFamily: FONT }}>削除</button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => uploadingRefImg ? undefined : wsRefUploadRef.current?.click()}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px dashed #e2e8f0", background: "transparent", color: uploadingRefImg ? "#cbd5e1" : "#94a3b8", fontSize: 12, cursor: uploadingRefImg ? "not-allowed" : "pointer", fontFamily: FONT }}
                      >{uploadingRefImg ? "アップロード中..." : "画像をアップロード..."}</button>
                    )}
                    <input ref={wsRefUploadRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleWsRefUpload} />
                  </div>
                )}
              </div>

              {/* ── ①と② の区切りライン ── */}
              <div style={{ margin: "8px 0 4px", borderTop: "2px solid #e2e8f0", position: "relative" }}>
                <span style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", background: "#fff", padding: "0 10px", fontSize: 10, color: "#cbd5e1", fontFamily: FONT, letterSpacing: "0.1em" }}>
                  ──────────
                </span>
              </div>

              {/* ── ② 共通ルール（全モデル適用） ── */}
              <div style={{ ...SEC, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>共通ルール（全モデル適用）</span>
                <button type="button" onClick={() => setImg((s) => ({ ...s, imgCommonRules: DEFAULT_IMAGE_SETTINGS.imgCommonRules, imgNegativePrompt: DEFAULT_IMAGE_SETTINGS.imgNegativePrompt }))} style={{ fontSize: 10, fontWeight: 600, color: TEAL, background: "none", border: `1px solid ${TEAL}55`, borderRadius: 5, cursor: "pointer", padding: "1px 7px", textTransform: "none" as const, letterSpacing: 0, fontFamily: FONT }}>デフォルトに戻す</button>
              </div>
              <div style={FIELD}>
                <label style={LBL}>生成ルール</label>
                <textarea
                  value={img.imgCommonRules}
                  onChange={(e) => setImg((s) => ({ ...s, imgCommonRules: e.target.value }))}
                  rows={3}
                  style={{ ...INPUT, resize: "vertical", lineHeight: 1.6 }}
                />
                <div style={{ marginTop: 4, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                  すべてのモデルのプロンプトに追加されるルールです。空にすると追加されません。
                </div>
              </div>
              <div style={FIELD}>
                <label style={LBL}>ネガティブプロンプト（除外指示）</label>
                <textarea
                  value={img.imgNegativePrompt}
                  onChange={(e) => setImg((s) => ({ ...s, imgNegativePrompt: e.target.value }))}
                  placeholder="例: ウォーターマーク、ぼかし、低品質、歪み"
                  rows={2}
                  style={{ ...INPUT, resize: "none", lineHeight: 1.6 }}
                />
                <div style={{ marginTop: 4, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                  全モデル共通。「含めないでください: ...」としてプロンプトに追加されます。
                </div>
              </div>
              </>
            )}

            {/* ── AI動画生成 ── */}
            {activeTab === "video" && (() => {
              const currentVidModel = VIDEO_MODELS.find((m) => m.id === vid.videoModel) ?? VIDEO_MODELS[0];
              const isVeoLite = currentVidModel.veoLite;
              const isVeo     = currentVidModel.id === "veo-3" || currentVidModel.id === "veo-3-lite";
              const vidColor  = currentVidModel.color;

              const availableResolutions = ["720p", "1080p"] as const;
              const availableRatios      = isVeoLite ? (["16:9", "9:16"] as const) : (["16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "adaptive"] as const);
              const maxDuration          = isVeoLite ? 8 : 12;

              return (
              <>
                <div style={SEC}>使用モデル</div>
                <div style={FIELD}>
                  <ModelDropdown
                    models={VIDEO_MODELS}
                    value={vid.videoModel}
                    onChange={(id) => {
                      const m = VIDEO_MODELS.find((x) => x.id === id);
                      let nextVid = { ...vid, videoModel: id };
                      if (m?.veoLite) {
                        if (!["16:9", "9:16"].includes(nextVid.ratio)) nextVid.ratio = "16:9";
                        if (nextVid.duration > 8 || nextVid.duration === -1) nextVid.duration = 8;
                        // 1080p is valid for Veo Lite but requires exactly 8s
                        if (nextVid.resolution === "1080p") nextVid.duration = 8;
                      }
                      setVid(nextVid as VideoSettings);
                    }}
                    lockedIds={isFree ? ["veo-3", "seedance-1-5-pro"] : []}
                  />
                  {isVeoLite && (
                    <div style={{ marginTop: 6, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                      Veo 3.1 Lite：最大8秒・16:9 / 9:16のみ（1080p は8秒固定）
                    </div>
                  )}
                </div>

                <div style={SEC}>生成設定</div>

                <div style={FIELD}>
                  <label style={LBL}>解像度</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["720p", "1080p"] as const).map((r) => {
                      const isRes1080pLocked = isFree && r === "1080p";
                      const disabled = !availableResolutions.includes(r as any) || isRes1080pLocked;
                      const active   = vid.resolution === r && !disabled;
                      return (
                        <button key={r}
                          onClick={() => {
                            if (disabled) return;
                            setVid((s) => ({
                              ...s,
                              resolution: r,
                              // Veo Lite + 1080p must use 8s
                              ...(isVeoLite && r === "1080p" ? { duration: 8 } : {}),
                            }));
                          }}
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, fontFamily: FONT,
                            cursor: disabled ? "not-allowed" : "pointer",
                            border: `1.5px solid ${active ? vidColor : "#e2e8f0"}`,
                            background: active ? `${vidColor}18` : disabled ? "#f1f5f9" : "#fff",
                            color: active ? vidColor : disabled ? "#cbd5e1" : "#64748b",
                            fontWeight: active ? 700 : 400,
                            position: "relative",
                          }}
                        >
                          {r}
                          {isRes1080pLocked && (
                            <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 700, color: "#e67d30", background: "#fff3e8", padding: "1px 4px", borderRadius: 3, border: "1px solid #e67d3040" }}>有料</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={FIELD}>
                  <label style={LBL}>アスペクト比</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {(["16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "adaptive"] as const).map((r) => {
                      const disabled = !availableRatios.includes(r as any);
                      const active   = vid.ratio === r && !disabled;
                      return (
                        <button key={r}
                          onClick={() => !disabled && setVid((s) => ({ ...s, ratio: r }))}
                          style={{ fontSize: 11, padding: "4px 9px", borderRadius: 6, fontFamily: FONT,
                            cursor: disabled ? "not-allowed" : "pointer",
                            border: `1.5px solid ${active ? vidColor : "#e2e8f0"}`,
                            background: active ? `${vidColor}18` : disabled ? "#f1f5f9" : "#fff",
                            color: active ? vidColor : disabled ? "#cbd5e1" : "#64748b",
                            fontWeight: active ? 700 : 400,
                          }}
                        >{r}</button>
                      );
                    })}
                  </div>
                  {isVeoLite && <div style={{ marginTop: 5, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>Veo 3.1 Lite は 16:9 / 9:16 のみ対応</div>}
                </div>

                <div style={FIELD}>
                  <label style={LBL}>尺（秒）</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((d) => {
                      const disabled = d > maxDuration;
                      const active   = vid.duration === d && !disabled;
                      return (
                        <button key={d}
                          onClick={() => !disabled && setVid((s) => ({ ...s, duration: d }))}
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, fontFamily: FONT,
                            cursor: disabled ? "not-allowed" : "pointer",
                            border: `1.5px solid ${active ? vidColor : "#e2e8f0"}`,
                            background: active ? `${vidColor}18` : disabled ? "#f1f5f9" : "#fff",
                            color: active ? vidColor : disabled ? "#cbd5e1" : "#64748b",
                            fontWeight: active ? 700 : 400,
                          }}
                        >{d}s</button>
                      );
                    })}
                    {!isVeoLite && (
                      <button onClick={() => setVid((s) => ({ ...s, duration: -1 }))}
                        style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontFamily: FONT, border: `1.5px solid ${vid.duration === -1 ? vidColor : "#e2e8f0"}`, background: vid.duration === -1 ? `${vidColor}18` : "#fff", color: vid.duration === -1 ? vidColor : "#64748b", fontWeight: vid.duration === -1 ? 700 : 400 }}
                      >自動</button>
                    )}
                  </div>
                  {isVeoLite && <div style={{ marginTop: 5, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>Veo 3.1 Lite は最大 8 秒</div>}
                </div>

                <div style={FIELD}>
                  <label style={LBL}>オプション</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#475569", fontFamily: FONT }}>
                      <input type="checkbox" checked={vid.generateAudio} onChange={(e) => setVid((s) => ({ ...s, generateAudio: e.target.checked }))} style={{ accentColor: vidColor, width: 14, height: 14 }} />
                      音声を生成（デフォルトはオフ）
                    </label>
                    {isVeo && (
                      <div style={{ fontSize: 10, color: "#d97706", fontFamily: FONT, lineHeight: 1.6, padding: "4px 8px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6 }}>
                        ⚠ 日本語プロンプトで音声生成をオンにすると、Googleのコンテンツフィルタに引っかかり動画が生成されない場合があります。オフのまま使用することを推奨します。
                      </div>
                    )}
                    {!isVeo && (
                      <>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#475569", fontFamily: FONT }}>
                          <input type="checkbox" checked={vid.cameraFixed} onChange={(e) => setVid((s) => ({ ...s, cameraFixed: e.target.checked }))} style={{ accentColor: vidColor, width: 14, height: 14 }} />
                          カメラ固定
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#475569", fontFamily: FONT }}>
                          <input type="checkbox" checked={vid.watermark} onChange={(e) => setVid((s) => ({ ...s, watermark: e.target.checked }))} style={{ accentColor: vidColor, width: 14, height: 14 }} />
                          透かし（AI Generated を表示）
                        </label>
                      </>
                    )}
                    {isVeo && (
                      <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: FONT, lineHeight: 1.6 }}>
                        カメラ固定・透かしは Veo モデルでは未対応です
                      </div>
                    )}
                  </div>
                </div>

                {/* ── ①と② の区切りライン ── */}
                <div style={{ margin: "8px 0 4px", borderTop: "2px solid #e2e8f0", position: "relative" }}>
                  <span style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", background: "#fff", padding: "0 10px", fontSize: 10, color: "#cbd5e1", fontFamily: FONT, letterSpacing: "0.1em" }}>
                    ──────────
                  </span>
                </div>

                {/* ── ② 共通ルール（全モデル適用） ── */}
                <div style={{ ...SEC, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>共通ルール（全モデル適用）</span>
                  <button type="button" onClick={() => setVid((s) => ({ ...s, vidCommonRules: DEFAULT_VIDEO_SETTINGS.vidCommonRules, vidNegativePrompt: DEFAULT_VIDEO_SETTINGS.vidNegativePrompt }))} style={{ fontSize: 10, fontWeight: 600, color: TEAL, background: "none", border: `1px solid ${TEAL}55`, borderRadius: 5, cursor: "pointer", padding: "1px 7px", textTransform: "none" as const, letterSpacing: 0, fontFamily: FONT }}>デフォルトに戻す</button>
                </div>
                <div style={FIELD}>
                  <label style={LBL}>生成ルール</label>
                  <textarea
                    value={vid.vidCommonRules}
                    onChange={(e) => setVid((s) => ({ ...s, vidCommonRules: e.target.value }))}
                    rows={3}
                    style={{ ...INPUT, resize: "vertical", lineHeight: 1.6 }}
                  />
                  <div style={{ marginTop: 4, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                    すべてのモデルのプロンプトに追加されるルールです。空にすると追加されません。
                  </div>
                </div>
                <div style={FIELD}>
                  <label style={LBL}>ネガティブプロンプト（除外指示）</label>
                  <textarea
                    value={vid.vidNegativePrompt}
                    onChange={(e) => setVid((s) => ({ ...s, vidNegativePrompt: e.target.value }))}
                    placeholder="例: ウォーターマーク、ぼかし、低品質、歪み"
                    rows={2}
                    style={{ ...INPUT, resize: "none", lineHeight: 1.6 }}
                  />
                  <div style={{ marginTop: 4, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                    全モデル共通。「含めないでください: ...」としてプロンプトに追加されます。
                  </div>
                </div>
              </>
              );
            })()}

            {/* ── AIナレーション生成 ── */}
            {activeTab === "narration" && (() => {
              const isGoogle = tts.provider === "google-gemini";
              const currentTtsModel = TTS_MODELS.find((m) => m.id === (tts.provider === "elevenlabs" ? "elevenlabs" : tts.model)) ?? TTS_MODELS[0];
              const ttsColor = currentTtsModel.color;
              const currentModelDef2 = GEMINI_TTS_MODELS.find((m) => m.key === tts.model) ?? GEMINI_TTS_MODELS[0];
              return (
              <>
                {/* モデル選択 */}
                <div style={SEC}>使用モデル</div>
                <div style={FIELD}>
                  <ModelDropdown
                    models={TTS_MODELS}
                    value={tts.provider === "elevenlabs" ? "elevenlabs" : tts.model}
                    onChange={(id) => {
                      if (id === "elevenlabs") {
                        setTts((s) => ({ ...s, provider: "elevenlabs" }));
                      } else {
                        setTts((s) => ({ ...s, provider: "google-gemini", model: id as typeof tts.model }));
                      }
                    }}
                    lockedIds={isFree ? ["elevenlabs"] : []}
                  />
                  {tts.provider === "elevenlabs" && (
                    <div style={{ marginTop: 6, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                      APIキー設定後に利用可能です
                    </div>
                  )}
                  {isGoogle && (
                    <div style={{ marginTop: 6, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                      {currentModelDef2.description}
                      {currentModelDef2.supportsStreaming ? "・ストリーミング対応" : ""}
                    </div>
                  )}
                </div>

                {/* Google Gemini 設定 */}
                {isGoogle && (
                  <>

                    <div style={SEC}>デフォルト音声（ボイスサンプル）</div>
                    <div style={FIELD}>
                      <label style={LBL}>音声キャラクター（30種類から選択）</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, maxHeight: 300, overflowY: "auto", paddingRight: 2 }}>
                        {GEMINI_VOICE_META.map((v) => {
                          const isSelected = tts.voice === v.name;
                          const isPlaying  = playingVoice === v.name;
                          return (
                            <div
                              key={v.name}
                              onClick={() => setTts((s) => ({ ...s, voice: v.name }))}
                              style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "7px 9px", borderRadius: 8, cursor: "pointer",
                                border: `1.5px solid ${isSelected ? ttsColor : "#e2e8f0"}`,
                                background: isSelected ? `${ttsColor}0e` : "#fff",
                                transition: "border-color 0.12s, background 0.12s",
                              }}
                            >
                              {/* Play button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isPlaying) {
                                    audioRef.current?.pause();
                                    setPlayingVoice(null);
                                  } else {
                                    if (audioRef.current) { audioRef.current.pause(); }
                                    const audio = new Audio(v.sampleUrl);
                                    audioRef.current = audio;
                                    audio.play().catch(() => {});
                                    setPlayingVoice(v.name);
                                    audio.onended = () => setPlayingVoice(null);
                                  }
                                }}
                                style={{
                                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                                  border: "none", cursor: "pointer",
                                  background: isPlaying ? ttsColor : `${ttsColor}22`,
                                  color: isPlaying ? "#fff" : ttsColor,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  transition: "background 0.12s, color 0.12s",
                                }}
                              >
                                {isPlaying
                                  ? <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="3" height="8" rx="1"/><rect x="6" y="1" width="3" height="8" rx="1"/></svg>
                                  : <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1.5l7 3.5-7 3.5z"/></svg>
                                }
                              </button>
                              {/* Info */}
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? ttsColor : "#1e293b", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {v.name}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                                  <span style={{
                                    fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, fontFamily: FONT, flexShrink: 0,
                                    background: v.gender === "女性" ? "#fb71821a" : "#5184F01a",
                                    color:      v.gender === "女性" ? "#e05170"   : "#5184F0",
                                  }}>{v.gender}</span>
                                  <span style={{ fontSize: 10, color: "#64748b", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.trait}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={SEC}>読み上げスタイル</div>
                    <div style={FIELD}>
                      <label style={LBL}>スタイル（自由入力）</label>
                      <textarea
                        value={tts.style}
                        onChange={(e) => setTts((s) => ({ ...s, style: e.target.value }))}
                        placeholder="例: 落ち着いた企業VPのナレーション。聞き取りやすく、自然な間を取る。"
                        rows={2}
                        style={{ ...INPUT, resize: "none", lineHeight: 1.6 }}
                      />
                    </div>
                    <div style={FIELD}>
                      <label style={LBL}>読み上げ速度</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {TTS_PACING_OPTIONS.map((p) => {
                          const active = tts.pacing === p.value;
                          return (
                            <button key={p.value}
                              onClick={() => setTts((s) => ({ ...s, pacing: p.value }))}
                              style={{ fontSize: 11, padding: "4px 9px", borderRadius: 6, cursor: "pointer", fontFamily: FONT, border: `1.5px solid ${active ? ttsColor : "#e2e8f0"}`, background: active ? `${ttsColor}18` : "#fff", color: active ? ttsColor : "#64748b", fontWeight: active ? 700 : 400 }}
                            >{p.label}</button>
                          );
                        })}
                      </div>
                    </div>
                    <div style={FIELD}>
                      <label style={LBL}>トーン・感情</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {TTS_TONE_OPTIONS.map((t) => {
                          const active = tts.tone === t.value;
                          return (
                            <button key={t.value}
                              onClick={() => setTts((s) => ({ ...s, tone: t.value }))}
                              style={{ fontSize: 11, padding: "4px 9px", borderRadius: 6, cursor: "pointer", fontFamily: FONT, border: `1.5px solid ${active ? ttsColor : "#e2e8f0"}`, background: active ? `${ttsColor}18` : "#fff", color: active ? ttsColor : "#64748b", fontWeight: active ? 700 : 400 }}
                            >{t.label}</button>
                          );
                        })}
                      </div>
                    </div>
                    <div style={FIELD}>
                      <label style={LBL}>アクセント・話し方（自由入力）</label>
                      <input
                        value={tts.accent}
                        onChange={(e) => setTts((s) => ({ ...s, accent: e.target.value }))}
                        placeholder="例: 標準的な日本語、落ち着いたニュースキャスター"
                        style={INPUT}
                      />
                    </div>

                    <div style={SEC}>詳細設定</div>
                    <div style={FIELD}>
                      <label style={LBL}>長文自動分割</label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#475569", fontFamily: FONT }}>
                        <input type="checkbox" checked={tts.autoChunk} onChange={(e) => setTts((s) => ({ ...s, autoChunk: e.target.checked }))} style={{ accentColor: ttsColor, width: 14, height: 14 }} />
                        長文を自動分割して生成する
                      </label>
                      {tts.autoChunk && (
                        <div style={{ marginTop: 8 }}>
                          <label style={LBL}>1チャンクの最大文字数：<span style={{ color: ttsColor, fontWeight: 800 }}>{tts.maxChunkLength}</span> 文字</label>
                          <input
                            type="range" min={100} max={1000} step={50}
                            value={tts.maxChunkLength}
                            onChange={(e) => setTts((s) => ({ ...s, maxChunkLength: Number(e.target.value) }))}
                            style={{ display: "block", width: "100%", accentColor: ttsColor }}
                          />
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#cbd5e1", marginTop: 2, fontFamily: FONT }}>
                            <span>100</span><span>1000</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={FIELD}>
                      <label style={LBL}>リトライ回数：<span style={{ color: ttsColor, fontWeight: 800 }}>{tts.retryCount}</span> 回</label>
                      <input
                        type="range" min={0} max={5}
                        value={tts.retryCount}
                        onChange={(e) => setTts((s) => ({ ...s, retryCount: Number(e.target.value) }))}
                        style={{ display: "block", width: "100%", accentColor: ttsColor }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#cbd5e1", marginTop: 2, fontFamily: FONT }}>
                        <span>0</span><span>5</span>
                      </div>
                    </div>
                  </>
                )}

                {tts.provider === "elevenlabs" && (
                  <div style={{ padding: "20px 0", textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: FONT, lineHeight: 1.7 }}>ElevenLabs 設定は今後追加予定です</div>
                  </div>
                )}

                {/* ── ①と② の区切りライン ── */}
                <div style={{ margin: "8px 0 4px", borderTop: "2px solid #e2e8f0", position: "relative" }}>
                  <span style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", background: "#fff", padding: "0 10px", fontSize: 10, color: "#cbd5e1", fontFamily: FONT, letterSpacing: "0.1em" }}>
                    ──────────
                  </span>
                </div>

                {/* ── ② 共通ルール（全モデル適用） ── */}
                <div style={{ ...SEC, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>共通ルール（全モデル適用）</span>
                  <button type="button" onClick={() => setTts((s) => ({ ...s, ttsCommonRules: DEFAULT_TTS_SETTINGS.ttsCommonRules, ttsNegativePrompt: DEFAULT_TTS_SETTINGS.ttsNegativePrompt }))} style={{ fontSize: 10, fontWeight: 600, color: TEAL, background: "none", border: `1px solid ${TEAL}55`, borderRadius: 5, cursor: "pointer", padding: "1px 7px", textTransform: "none" as const, letterSpacing: 0, fontFamily: FONT }}>デフォルトに戻す</button>
                </div>
                <div style={FIELD}>
                  <label style={LBL}>生成ルール</label>
                  <textarea
                    value={tts.ttsCommonRules}
                    onChange={(e) => setTts((s) => ({ ...s, ttsCommonRules: e.target.value }))}
                    rows={3}
                    style={{ ...INPUT, resize: "vertical", lineHeight: 1.6 }}
                  />
                  <div style={{ marginTop: 4, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                    すべてのモデルに適用される読み上げルールです。空にすると追加されません。
                  </div>
                </div>
                <div style={FIELD}>
                  <label style={LBL}>ネガティブプロンプト（除外指示）</label>
                  <textarea
                    value={tts.ttsNegativePrompt}
                    onChange={(e) => setTts((s) => ({ ...s, ttsNegativePrompt: e.target.value }))}
                    placeholder="例: 機械的な読み上げ、過度な感情表現、早口"
                    rows={2}
                    style={{ ...INPUT, resize: "none", lineHeight: 1.6 }}
                  />
                  <div style={{ marginTop: 4, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                    全モデル共通。「避けてください: ...」として読み上げ指示に追加されます。
                  </div>
                </div>
              </>
              );
            })()}

            {/* ── AI BGM生成 ── */}
            {activeTab === "bgm" && (() => {
              const GENRES = ["Pop", "Jazz", "Classical", "Electronic", "Cinematic", "Ambient", "Lo-fi", "Rock"] as const;
              const MOODS  = ["Happy", "Calm", "Epic", "Melancholic", "Energetic", "Mysterious", "Romantic", "Tense"] as const;
              const GENRE_JA: Record<string, string> = {
                Pop: "ポップ", Jazz: "ジャズ", Classical: "クラシック", Electronic: "エレクトロニック",
                Cinematic: "シネマティック", Ambient: "アンビエント", "Lo-fi": "Lo-fi", Rock: "ロック",
              };
              const MOOD_JA: Record<string, string> = {
                Happy: "明るい", Calm: "穏やか", Epic: "壮大", Melancholic: "切ない",
                Energetic: "エネルギッシュ", Mysterious: "神秘的", Romantic: "ロマンチック", Tense: "緊張感",
              };
              const chipStyle = (active: boolean): React.CSSProperties => ({
                border: active ? "none" : "1.5px solid #e2e8f0",
                borderRadius: 20, padding: "4px 12px", fontSize: 12,
                fontWeight: active ? 700 : 400, fontFamily: FONT, cursor: "pointer",
                background: active ? "linear-gradient(45deg,#5184F0,#169385)" : "#f8fafc",
                color: active ? "#fff" : "#475569", transition: "all 0.15s",
              });
              return (
              <>
                <div style={SEC}>使用モデル</div>
                <div style={FIELD}>
                  <ModelDropdown
                    models={BGM_MODEL_ENTRIES}
                    value={bgm.model}
                    onChange={(id) => setBgm((s) => ({ ...s, model: id as BgmModel }))}
                    lockedIds={isFree ? ["lyria-3-pro-preview"] : []}
                  />
                </div>

                <div style={SEC}>ボーカル</div>
                <div style={{ ...FIELD, display: "flex", gap: 8 }}>
                  {(["no", "yes", ""] as BgmVocal[]).map((v) => {
                    const label = v === "no" ? "なし（インスト）" : v === "yes" ? "あり" : "指定なし";
                    return <button key={v} type="button" onClick={() => setBgm((s) => ({ ...s, defaultVocal: v }))} style={chipStyle(bgm.defaultVocal === v)}>{label}</button>;
                  })}
                </div>

                <div style={SEC}>デフォルトジャンル</div>
                <div style={{ ...FIELD, display: "flex", flexWrap: "wrap", gap: 7 }}>
                  <button type="button" onClick={() => setBgm((s) => ({ ...s, defaultGenre: "" }))} style={chipStyle(bgm.defaultGenre === "")}>指定なし</button>
                  {GENRES.map((g) => (
                    <button key={g} type="button" onClick={() => setBgm((s) => ({ ...s, defaultGenre: s.defaultGenre === g ? "" : g }))} style={chipStyle(bgm.defaultGenre === g)}>
                      {GENRE_JA[g] ?? g}
                    </button>
                  ))}
                </div>

                <div style={SEC}>デフォルトムード</div>
                <div style={{ ...FIELD, display: "flex", flexWrap: "wrap", gap: 7 }}>
                  <button type="button" onClick={() => setBgm((s) => ({ ...s, defaultMood: "" }))} style={chipStyle(bgm.defaultMood === "")}>指定なし</button>
                  {MOODS.map((m) => (
                    <button key={m} type="button" onClick={() => setBgm((s) => ({ ...s, defaultMood: s.defaultMood === m ? "" : m }))} style={chipStyle(bgm.defaultMood === m)}>
                      {MOOD_JA[m] ?? m}
                    </button>
                  ))}
                </div>

                <div style={SEC}>共通プロンプト</div>
                <div style={FIELD}>
                  <textarea
                    value={bgm.commonPrompt}
                    onChange={(e) => setBgm((s) => ({ ...s, commonPrompt: e.target.value }))}
                    placeholder="例：明るくテンポの速いポップス、ピアノメロディあり"
                    rows={3}
                    style={{ ...INPUT, resize: "none", lineHeight: 1.6 }}
                  />
                  <div style={{ marginTop: 4, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                    BGM生成モーダルを開くたびにプロンプト欄にプリセットされます。
                  </div>
                </div>

                <div style={SEC}>デフォルト音量 ({Math.round(bgm.defaultVolume * 100)}%)</div>
                <div style={FIELD}>
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={bgm.defaultVolume}
                    onChange={(e) => setBgm((s) => ({ ...s, defaultVolume: parseFloat(e.target.value) }))}
                    style={{ width: "100%", accentColor: "#5184F0" }}
                  />
                  <div style={{ marginTop: 4, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                    タイムラインに挿入する際のデフォルト音量です。
                  </div>
                </div>
              </>
              );
            })()}

            {/* ── 動画書き出し（ShotStack出力設定） ── */}
            {activeTab === "render" && (() => {
              const RC = "#5184F0";
              const SEQ_BADGE = (
                <span style={{ fontSize: 9, fontWeight: 700, color: "#5184F0", background: "#5184F018", border: "1px solid #5184F033", borderRadius: 4, padding: "1px 5px", letterSpacing: "0.02em" }}>
                  シーケンス連動
                </span>
              );
              const chip = (active: boolean): React.CSSProperties => ({
                fontSize: 11, padding: "4px 11px", borderRadius: 6, cursor: "pointer", fontFamily: FONT,
                border: `1.5px solid ${active ? RC : "#e2e8f0"}`,
                background: active ? `${RC}18` : "#fff",
                color: active ? RC : "#64748b", fontWeight: active ? 700 : 400,
              });

              const FORMAT_OPTIONS: { v: string; label: string; sub: string }[] = [
                { v: "mp4", label: "MP4", sub: "H.264 / 最も互換性が高い" },
                { v: "gif", label: "GIF", sub: "アニメーションGIF / ループ再生" },
              ];
              const QUALITY_OPTIONS: { v: string; label: string; sub: string }[] = [
                { v: "verylow",  label: "最低", sub: "verylow — 最小ファイルサイズ" },
                { v: "low",      label: "低",   sub: "low" },
                { v: "medium",   label: "標準", sub: "medium — デフォルト / Web推奨" },
                { v: "high",     label: "高",   sub: "high" },
                { v: "veryhigh", label: "最高", sub: "veryhigh — 高ビットレート / アーカイブ向け" },
              ];
              const RES_OPTIONS: { v: ExportResolution; label: string }[] = [
                { v: "720p",  label: "HD 720p (1280×720)" },
                { v: "1080p", label: "Full HD 1080p (1920×1080)" },
              ];
              const FPS_OPTIONS: { v: 24 | 25 | 30 | 60; label: string }[] = [
                { v: 24, label: "24 fps" },
                { v: 25, label: "25 fps" },
                { v: 30, label: "30 fps" },
                { v: 60, label: "60 fps" },
              ];

              const effectiveSandbox = isFree || render.sandboxMode;

              return (
              <>
                {/* 書き出しモード（透かし） */}
                <div style={SEC}>書き出しモード</div>
                <div style={{ ...FIELD, display: "flex", flexDirection: "column", gap: 4 }}>
                  {([
                    { sandbox: true,  label: "透かしあり（サンドボックス）", sub: "クレジット消費なし・透かし入り出力", freeBadge: "無料" },
                    { sandbox: false, label: "透かしなし（本番出力）",        sub: "クレジット消費あり・高品質出力",     freeBadge: null  },
                  ] as const).map(({ sandbox, label, sub, freeBadge }) => {
                    const active  = effectiveSandbox === sandbox;
                    const locked  = !sandbox && isFree;
                    return (
                      <button key={String(sandbox)} type="button"
                        onClick={() => { if (!locked) setRender((s) => ({ ...s, sandboxMode: sandbox })); }}
                        style={{
                          ...chip(active), display: "flex", alignItems: "center", justifyContent: "space-between",
                          textAlign: "left", padding: "8px 11px",
                          cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.55 : 1,
                        }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
                          <div style={{ fontSize: 10, color: active ? RC : "#94a3b8", marginTop: 2 }}>{sub}</div>
                        </div>
                        {locked && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#e67d30", background: "#fff3e8", border: "1px solid #e67d3040", padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                            有料プランのみ
                          </span>
                        )}
                        {freeBadge && !locked && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: active ? RC : "#94a3b8", background: active ? `${RC}18` : "#f1f5f9", padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                            {freeBadge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div style={{ ...SEC, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>出力設定</span>
                  <button type="button" onClick={() => setRender(resetVideoExportToSequence())}
                    style={{ fontSize: 10, fontWeight: 600, color: RC, background: "none", border: `1px solid ${RC}55`, borderRadius: 5, cursor: "pointer", padding: "1px 7px", fontFamily: FONT }}>
                    シーケンス設定に戻す
                  </button>
                </div>

                {/* 解像度（シーケンス連動） */}
                <div style={FIELD}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <label style={{ ...LBL, margin: 0 }}>解像度</label>
                    {SEQ_BADGE}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {RES_OPTIONS.map(({ v, label }) => {
                      const active = render.resolution === v;
                      return (
                        <button key={v} type="button" onClick={() => setRender((s) => ({ ...s, resolution: v }))}
                          style={{ ...chip(active), textAlign: "left", padding: "5px 10px" }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: FONT, marginTop: 4 }}>
                    デフォルトはコンテ変換タブの解像度と連動。変更すると書き出し時のみ適用されます。
                  </div>
                </div>

                {/* FPS（シーケンス連動） */}
                <div style={FIELD}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <label style={{ ...LBL, margin: 0 }}>フレームレート（fps）</label>
                    {SEQ_BADGE}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {FPS_OPTIONS.map(({ v, label }) => {
                      const active = render.fps === v;
                      return (
                        <button key={v} type="button" onClick={() => setRender((s) => ({ ...s, fps: v }))}
                          style={chip(active)}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: FONT, marginTop: 4 }}>
                    ShotStack対応: 12, 15, 23.976, 24, 25, 29.97, 30 fps
                  </div>
                </div>

                {/* 背景色（シーケンス連動） */}
                <div style={FIELD}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <label style={{ ...LBL, margin: 0 }}>背景色</label>
                    {SEQ_BADGE}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="color" value={render.backgroundColor}
                      onChange={(e) => setRender((s) => ({ ...s, backgroundColor: e.target.value }))}
                      style={{ width: 34, height: 34, border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", padding: 2, background: "#f8fafd" }}
                    />
                    <input value={render.backgroundColor}
                      onChange={(e) => setRender((s) => ({ ...s, backgroundColor: e.target.value }))}
                      style={{ ...INPUT, width: 110 }}
                    />
                    <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>映像・画像がないシーンの背景</span>
                  </div>
                </div>

                {/* フォーマット */}
                <div style={{ ...SEC }}>書き出しフォーマット</div>
                <div style={FIELD}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {FORMAT_OPTIONS.map(({ v, label, sub }) => {
                      const active = render.format === v;
                      return (
                        <button key={v} type="button" onClick={() => setRender((s) => ({ ...s, format: v as VideoExportSettings["format"] }))}
                          style={{ ...chip(active), display: "flex", alignItems: "center", gap: 8, textAlign: "left", padding: "7px 10px" }}>
                          <span style={{ fontWeight: 700, minWidth: 32 }}>{label}</span>
                          <span style={{ fontSize: 10, color: active ? RC : "#94a3b8" }}>{sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 品質 */}
                <div style={{ ...SEC }}>品質（ビットレート）</div>
                <div style={FIELD}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {QUALITY_OPTIONS.map(({ v, label, sub }) => {
                      const active = render.quality === v;
                      return (
                        <button key={v} type="button" onClick={() => setRender((s) => ({ ...s, quality: v as VideoExportSettings["quality"] }))}
                          style={{ ...chip(active), display: "flex", alignItems: "center", gap: 8, textAlign: "left", padding: "6px 10px" }}>
                          <span style={{ fontWeight: 700, minWidth: 30 }}>{label}</span>
                          <span style={{ fontSize: 10, color: active ? RC : "#94a3b8" }}>{sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ミュート */}
                <div style={FIELD}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#475569", fontFamily: FONT }}>
                    <input type="checkbox" checked={render.mute}
                      onChange={(e) => setRender((s) => ({ ...s, mute: e.target.checked }))}
                      style={{ accentColor: RC, width: 14, height: 14 }}
                    />
                    <div>
                      <span style={{ fontWeight: 600 }}>ミュート出力</span>
                      <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 6 }}>— ナレーション・BGMを含まず映像のみ書き出す</span>
                    </div>
                  </label>
                </div>

                {/* サムネイル */}
                <div style={{ ...SEC }}>サムネイル（thumbnail）</div>
                <div style={FIELD}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#475569", fontFamily: FONT, marginBottom: 8 }}>
                    <input type="checkbox" checked={render.thumbnailEnabled}
                      onChange={(e) => setRender((s) => ({ ...s, thumbnailEnabled: e.target.checked }))}
                      style={{ accentColor: RC, width: 14, height: 14 }}
                    />
                    <span style={{ fontWeight: 600 }}>サムネイルを生成する</span>
                  </label>
                  {render.thumbnailEnabled && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 22 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "#64748b", fontFamily: FONT, whiteSpace: "nowrap", width: 80 }}>キャプチャ位置</span>
                        <input type="number" min={0} step={0.5} value={render.thumbnailCapture}
                          onChange={(e) => setRender((s) => ({ ...s, thumbnailCapture: Math.max(0, parseFloat(e.target.value) || 0) }))}
                          style={{ ...INPUT, width: 70 }}
                        />
                        <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: FONT }}>秒</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "#64748b", fontFamily: FONT, whiteSpace: "nowrap", width: 80 }}>スケール</span>
                        <input type="range" min={0.1} max={1} step={0.05} value={render.thumbnailScale}
                          onChange={(e) => setRender((s) => ({ ...s, thumbnailScale: parseFloat(e.target.value) }))}
                          style={{ flex: 1, accentColor: RC }}
                        />
                        <span style={{ fontSize: 11, color: "#334155", fontFamily: FONT, width: 36, textAlign: "right" }}>{Math.round(render.thumbnailScale * 100)}%</span>
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: FONT, marginTop: 4 }}>
                    縮小JPEG（-thumbnail.jpg）を同時生成。スケールは出力解像度に対する倍率。
                  </div>
                </div>

              </>
              );
            })()}

            {/* ── コンテ変換 ── */}
            {activeTab === "export" && (() => {
              const expColor = "#5184F0";
              const pdfColor = "#e05c3a";
              const ssColor  = "#22a35a";
              return (
              <>
                {/* ════ コンテ → 動画プロジェクト ════ */}
                <div style={{ ...SEC, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>コンテ → 動画プロジェクト</span>
                  <button type="button" onClick={() => setExp({ ...DEFAULT_EXPORT_SETTINGS })} style={{ fontSize: 10, fontWeight: 600, color: TEAL, background: "none", border: `1px solid ${TEAL}55`, borderRadius: 5, cursor: "pointer", padding: "1px 7px", fontFamily: FONT }}>デフォルトに戻す</button>
                </div>

                <div style={FIELD}>
                  <label style={LBL}>解像度</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {(Object.entries(RESOLUTION_MAP) as [ExportResolution, { width: number; height: number; label: string }][]).map(([key, def]) => {
                      const active = exp.resolution === key;
                      return (
                        <button key={key} onClick={() => setExp((s) => ({ ...s, resolution: key }))}
                          style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontFamily: FONT, border: `1.5px solid ${active ? expColor : "#e2e8f0"}`, background: active ? `${expColor}18` : "#fff", color: active ? expColor : "#64748b", fontWeight: active ? 700 : 400, textAlign: "left" }}
                        >{def.label}</button>
                      );
                    })}
                  </div>
                </div>

                <div style={FIELD}>
                  <label style={LBL}>フレームレート</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    {([24, 30, 60] as const).map((f) => {
                      const active = exp.fps === f;
                      return (
                        <button key={f} onClick={() => setExp((s) => ({ ...s, fps: f }))}
                          style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontFamily: FONT, border: `1.5px solid ${active ? expColor : "#e2e8f0"}`, background: active ? `${expColor}18` : "#fff", color: active ? expColor : "#64748b", fontWeight: active ? 700 : 400 }}
                        >{f} fps</button>
                      );
                    })}
                  </div>
                </div>

                <div style={FIELD}>
                  <label style={LBL}>背景色</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="color" value={exp.backgroundColor} onChange={(e) => setExp((s) => ({ ...s, backgroundColor: e.target.value }))}
                      style={{ width: 34, height: 34, border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", padding: 2, background: "#f8fafd" }}
                    />
                    <input value={exp.backgroundColor} onChange={(e) => setExp((s) => ({ ...s, backgroundColor: e.target.value }))}
                      style={{ ...INPUT, width: 110 }}
                    />
                    <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>映像・画像がないシーンの背景</span>
                  </div>
                </div>

                <div style={FIELD}>
                  <label style={LBL}>シーンのデフォルト尺</label>
                  {/* モード切替 */}
                  <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                    {([["narration", "ナレーションに合わせる"], ["fixed", "尺を指定する"]] as const).map(([val, label]) => {
                      const active = (exp.durationMode ?? "fixed") === val;
                      return (
                        <button key={val} onClick={() => setExp((s) => ({ ...s, durationMode: val }))}
                          style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontFamily: FONT, border: `1.5px solid ${active ? expColor : "#e2e8f0"}`, background: active ? `${expColor}18` : "#fff", color: active ? expColor : "#64748b", fontWeight: active ? 700 : 400 }}
                        >{label}</button>
                      );
                    })}
                  </div>

                  {/* ナレーションに合わせる: 前後パディング */}
                  {(exp.durationMode ?? "fixed") === "narration" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "#64748b", fontFamily: FONT, whiteSpace: "nowrap" }}>前後パディング</span>
                        <input
                          type="range" min={0} max={3} step={0.1}
                          value={exp.narrationPadding ?? 0.5}
                          onChange={(e) => setExp((s) => ({ ...s, narrationPadding: parseFloat(e.target.value) }))}
                          style={{ flex: 1, accentColor: expColor }}
                        />
                        <span style={{ fontSize: 11, color: "#334155", fontFamily: FONT, width: 38, textAlign: "right" }}>{(exp.narrationPadding ?? 0.5).toFixed(1)}秒</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>ナレーション尺 + 前後それぞれ {(exp.narrationPadding ?? 0.5).toFixed(1)}秒（合計 +{((exp.narrationPadding ?? 0.5) * 2).toFixed(1)}秒）で変換します</div>
                    </div>
                  )}

                  {/* 尺を指定する: 固定値ボタン */}
                  {(exp.durationMode ?? "fixed") === "fixed" && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {[3, 4, 5, 6, 7, 8, 10, 15].map((d) => {
                        const active = exp.defaultDuration === d;
                        return (
                          <button key={d} onClick={() => setExp((s) => ({ ...s, defaultDuration: d }))}
                            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontFamily: FONT, border: `1.5px solid ${active ? expColor : "#e2e8f0"}`, background: active ? `${expColor}18` : "#fff", color: active ? expColor : "#64748b", fontWeight: active ? 700 : 400 }}
                          >{d}s</button>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ marginTop: 4, fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>
                    {(exp.durationMode ?? "fixed") === "narration"
                      ? "映像・ナレーションがないシーンはフォールバック値を使用します"
                      : "映像・ナレーションがないシーンに適用されます"}
                  </div>
                </div>

                <div style={{ ...SEC, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>テロップ設定</span>
                </div>

                <div style={FIELD}>
                  <label style={LBL}>フォントファミリー</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["Noto Sans JP", "Noto Serif JP"] as const).map((fam) => {
                      const active = (exp.telopFontFamily ?? "Noto Sans JP") === fam;
                      return (
                        <button key={fam} onClick={() => setExp((s) => ({ ...s, telopFontFamily: fam }))}
                          style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontFamily: FONT, border: `1.5px solid ${active ? expColor : "#e2e8f0"}`, background: active ? `${expColor}18` : "#fff", color: active ? expColor : "#64748b", fontWeight: active ? 700 : 400 }}
                        >{fam}</button>
                      );
                    })}
                  </div>
                </div>

                <div style={FIELD}>
                  <label style={LBL}>フォントウェイト</label>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {([{ v: 300, l: "Light" }, { v: 400, l: "Regular" }, { v: 500, l: "Medium" }, { v: 700, l: "Bold" }, { v: 900, l: "Black" }] as const).map(({ v, l }) => {
                      const active = (exp.telopFontWeight ?? 700) === v;
                      return (
                        <button key={v} onClick={() => setExp((s) => ({ ...s, telopFontWeight: v }))}
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontFamily: FONT, border: `1.5px solid ${active ? expColor : "#e2e8f0"}`, background: active ? `${expColor}18` : "#fff", color: active ? expColor : "#64748b", fontWeight: active ? 700 : 400 }}
                        >{l}</button>
                      );
                    })}
                  </div>
                </div>

                <div style={FIELD}>
                  <label style={LBL}>フォントサイズ（px）</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {[32, 40, 48, 52, 60, 72].map((s) => {
                      const active = exp.telopFontSize === s;
                      return (
                        <button key={s} onClick={() => setExp((prev) => ({ ...prev, telopFontSize: s }))}
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontFamily: FONT, border: `1.5px solid ${active ? expColor : "#e2e8f0"}`, background: active ? `${expColor}18` : "#fff", color: active ? expColor : "#64748b", fontWeight: active ? 700 : 400 }}
                        >{s}</button>
                      );
                    })}
                  </div>
                </div>

                <div style={FIELD}>
                  <label style={LBL}>文字色</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="color" value={exp.telopColor} onChange={(e) => setExp((s) => ({ ...s, telopColor: e.target.value }))}
                      style={{ width: 34, height: 34, border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", padding: 2, background: "#f8fafd" }}
                    />
                    <input value={exp.telopColor} onChange={(e) => setExp((s) => ({ ...s, telopColor: e.target.value }))}
                      style={{ ...INPUT, width: 110 }}
                    />
                  </div>
                </div>

                <div style={FIELD}>
                  <label style={LBL}>表示位置</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    {([["top", "上"], ["bottom", "下"]] as const).map(([val, label]) => {
                      const active = exp.telopPosition === val;
                      return (
                        <button key={val} onClick={() => setExp((s) => ({ ...s, telopPosition: val }))}
                          style={{ fontSize: 11, padding: "4px 16px", borderRadius: 6, cursor: "pointer", fontFamily: FONT, border: `1.5px solid ${active ? expColor : "#e2e8f0"}`, background: active ? `${expColor}18` : "#fff", color: active ? expColor : "#64748b", fontWeight: active ? 700 : 400 }}
                        >{label}</button>
                      );
                    })}
                  </div>
                </div>

                <div style={FIELD}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#475569", fontFamily: FONT }}>
                    <input type="checkbox" checked={exp.telopShadow} onChange={(e) => setExp((s) => ({ ...s, telopShadow: e.target.checked }))}
                      style={{ accentColor: expColor, width: 14, height: 14 }}
                    />
                    テキストシャドウ（文字に影を付ける）
                  </label>
                </div>

                <div style={{ ...SEC }}>ナレーション設定</div>

                <div style={FIELD}>
                  <label style={LBL}>ナレーション音量 ({Math.round(exp.narrationVolume * 100)}%)</label>
                  <input type="range" min={0} max={1} step={0.05} value={exp.narrationVolume}
                    onChange={(e) => setExp((s) => ({ ...s, narrationVolume: parseFloat(e.target.value) }))}
                    style={{ width: "100%", accentColor: expColor }}
                  />
                </div>

                {/* ════ コンテ → PDF変換 ════ */}
                <div style={{ ...SEC, display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
                  <span>コンテ → PDF変換</span>
                  <button type="button" onClick={() => setPdf({ ...DEFAULT_PDF_SETTINGS })} style={{ fontSize: 10, fontWeight: 600, color: pdfColor, background: "none", border: `1px solid ${pdfColor}55`, borderRadius: 5, cursor: "pointer", padding: "1px 7px", fontFamily: FONT }}>デフォルトに戻す</button>
                </div>

                <div style={FIELD}>
                  <label style={LBL}>用紙サイズ</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    {([["A4", "A4"], ["A3", "A3"], ["letter", "Letter"]] as const).map(([val, label]) => {
                      const active = pdf.paperSize === val;
                      return (
                        <button key={val} onClick={() => setPdf((s) => ({ ...s, paperSize: val }))}
                          style={{ fontSize: 11, padding: "4px 14px", borderRadius: 6, cursor: "pointer", fontFamily: FONT, border: `1.5px solid ${active ? pdfColor : "#e2e8f0"}`, background: active ? `${pdfColor}18` : "#fff", color: active ? pdfColor : "#64748b", fontWeight: active ? 700 : 400 }}
                        >{label}</button>
                      );
                    })}
                  </div>
                </div>

                <div style={FIELD}>
                  <label style={LBL}>向き</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    {([["landscape", "横"], ["portrait", "縦"]] as const).map(([val, label]) => {
                      const active = pdf.orientation === val;
                      return (
                        <button key={val} onClick={() => setPdf((s) => ({ ...s, orientation: val }))}
                          style={{ fontSize: 11, padding: "4px 16px", borderRadius: 6, cursor: "pointer", fontFamily: FONT, border: `1.5px solid ${active ? pdfColor : "#e2e8f0"}`, background: active ? `${pdfColor}18` : "#fff", color: active ? pdfColor : "#64748b", fontWeight: active ? 700 : 400 }}
                        >{label}</button>
                      );
                    })}
                  </div>
                </div>

                <div style={FIELD}>
                  <label style={LBL}>1ページあたりのシーン数</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    {([1, 2, 4, 6] as const).map((n) => {
                      const active = pdf.scenesPerPage === n;
                      return (
                        <button key={n} onClick={() => setPdf((s) => ({ ...s, scenesPerPage: n }))}
                          style={{ fontSize: 11, padding: "4px 14px", borderRadius: 6, cursor: "pointer", fontFamily: FONT, border: `1.5px solid ${active ? pdfColor : "#e2e8f0"}`, background: active ? `${pdfColor}18` : "#fff", color: active ? pdfColor : "#64748b", fontWeight: active ? 700 : 400 }}
                        >{n}コマ</button>
                      );
                    })}
                  </div>
                </div>

                <div style={FIELD}>
                  <label style={{ ...LBL, marginBottom: 8 }}>出力内容</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {([
                      ["showScript",    "台本テキスト"] as const,
                      ["showNarration", "ナレーションテキスト"] as const,
                    ]).map(([key, label]) => (
                      <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#475569", fontFamily: FONT }}>
                        <input type="checkbox" checked={pdf[key]} onChange={(e) => setPdf((s) => ({ ...s, [key]: e.target.checked }))}
                          style={{ accentColor: pdfColor, width: 14, height: 14 }}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* ════ コンテ → Excel / CSV ════ */}
                <div style={{ ...SEC, display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
                  <span>コンテ → Excel / CSV</span>
                  <button type="button" onClick={() => setSs({ ...DEFAULT_SPREADSHEET_SETTINGS })} style={{ fontSize: 10, fontWeight: 600, color: ssColor, background: "none", border: `1px solid ${ssColor}55`, borderRadius: 5, cursor: "pointer", padding: "1px 7px", fontFamily: FONT }}>デフォルトに戻す</button>
                </div>

                <div style={FIELD}>
                  <label style={LBL}>フォーマット</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    {([["xlsx", "Excel (.xlsx)"], ["csv", "CSV (.csv)"]] as const).map(([val, label]) => {
                      const active = ss.format === val;
                      return (
                        <button key={val} onClick={() => setSs((s) => ({ ...s, format: val }))}
                          style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontFamily: FONT, border: `1.5px solid ${active ? ssColor : "#e2e8f0"}`, background: active ? `${ssColor}18` : "#fff", color: active ? ssColor : "#64748b", fontWeight: active ? 700 : 400 }}
                        >{label}</button>
                      );
                    })}
                  </div>
                </div>

                {ss.format === "csv" && (
                  <div style={FIELD}>
                    <label style={LBL}>文字コード（CSV）</label>
                    <div style={{ display: "flex", gap: 4 }}>
                      {([["utf-8", "UTF-8"], ["shift-jis", "Shift-JIS"]] as const).map(([val, label]) => {
                        const active = ss.csvEncoding === val;
                        return (
                          <button key={val} onClick={() => setSs((s) => ({ ...s, csvEncoding: val }))}
                            style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontFamily: FONT, border: `1.5px solid ${active ? ssColor : "#e2e8f0"}`, background: active ? `${ssColor}18` : "#fff", color: active ? ssColor : "#64748b", fontWeight: active ? 700 : 400 }}
                          >{label}</button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4, fontFamily: FONT }}>Shift-JIS は Excel で直接開く場合に便利です</div>
                  </div>
                )}

                <div style={FIELD}>
                  <label style={{ ...LBL, marginBottom: 8 }}>出力列</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {([
                      ["includeScript",    "台本テキスト"] as const,
                      ["includeNarration", "ナレーションテキスト"] as const,
                      ["includeImageUrl",  "画像URL"] as const,
                      ["includeVideoUrl",  "動画URL"] as const,
                    ]).map(([key, label]) => (
                      <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#475569", fontFamily: FONT }}>
                        <input type="checkbox" checked={ss[key]} onChange={(e) => setSs((s) => ({ ...s, [key]: e.target.checked }))}
                          style={{ accentColor: ssColor, width: 14, height: 14 }}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </>
              );
            })()}

          </div>
        </div>

        {wsTemplatePickerOpen && (
          <WsTemplatePickerModal
            current={img.refTemplateId || null}
            onSelect={(id) => { setImg((s) => ({ ...s, refTemplateId: id })); setWsTemplatePickerOpen(false); }}
            onClose={() => setWsTemplatePickerOpen(false)}
          />
        )}

        {/* フッター */}
        <div style={{ borderTop: "1px solid #f1f5f9", flexShrink: 0 }}>
          {/* コスト目安（タブ別） */}
          {(() => {
            let items: { label: string; cost: string }[] | null = null;
            if (activeTab === "script") {
              items = [
                { label: "コンテ生成", cost: "50 cr" },
                { label: "シーン再生成", cost: "10 cr" },
              ];
            } else if (activeTab === "image") {
              const cost = img.imageModel === "google-image-lite" ? 100 : 400;
              items = [{ label: "1枚あたり", cost: `${cost} cr` }];
            } else if (activeTab === "video") {
              const cost = vid.videoModel === "veo-3-lite" ? 1_000 : (vid.generateAudio ? 5_000 : 2_500);
              items = [{ label: "1本あたり", cost: `${cost.toLocaleString()} cr` }];
            } else if (activeTab === "narration") {
              items = [{ label: "200文字あたり", cost: "10 cr" }];
            } else if (activeTab === "bgm") {
              const cost = bgm.model === "lyria-2" ? 50 : 150;
              items = [{ label: "1曲あたり", cost: `${cost} cr` }];
            } else if (activeTab === "render") {
              if (isFree || render.sandboxMode) {
                items = [{ label: "透かしあり", cost: "0 cr" }];
              } else {
                const cost = render.resolution === "720p" ? 100 : 300;
                items = [{ label: `${render.resolution} / 1分`, cost: `${cost} cr` }];
              }
            }
            if (!items) return null;
            return (
              <div style={{ padding: "10px 20px 0", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", whiteSpace: "nowrap", letterSpacing: "0.05em", textTransform: "uppercase" as const }}>生成コスト目安</span>
                {items.map(({ label, cost }) => (
                  <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, padding: "3px 7px", fontFamily: FONT }}>
                    <span style={{ color: "#64748b", fontWeight: 500 }}>{label}</span>
                    <span style={{ color: TEAL, fontWeight: 700 }}>{cost}</span>
                  </span>
                ))}
              </div>
            );
          })()}
          <div style={{ display: "flex", gap: 8, padding: "10px 20px 12px" }}>
            <button onClick={onClose} style={{ flex: 1, padding: "9px", fontSize: 13, fontWeight: 600, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontFamily: FONT }}>
              キャンセル
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 2, padding: "9px", fontSize: 13, fontWeight: 700, borderRadius: 10, border: "none", background: saving ? "#94a3b8" : `linear-gradient(135deg, ${TEAL}, #0d7a6e)`, color: "#fff", cursor: saving ? "default" : "pointer", fontFamily: FONT, boxShadow: saving ? "none" : `0 4px 14px ${TEAL}44` }}
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Template picker (for workspace image ref style) ─────────────────────────

function WsTemplatePickerModal({ current, onSelect, onClose }: {
  current: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const TEAL_COLOR = "#169385";
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 14, width: 560, maxWidth: "95vw", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,0.18)", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", fontFamily: FONT }}>スタイルテンプレートを選択</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94a3b8", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ overflowY: "auto", padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {IMAGE_STYLE_TEMPLATES.map((tpl) => {
            const isCurrent = tpl.id === current;
            return (
              <button
                key={tpl.id}
                onClick={() => onSelect(tpl.id)}
                style={{
                  textAlign: "left", padding: 0, borderRadius: 10,
                  border: `1.5px solid ${isCurrent ? TEAL_COLOR : "#e2e8f0"}`,
                  background: isCurrent ? `${TEAL_COLOR}10` : "#fff",
                  cursor: "pointer", fontFamily: FONT, overflow: "hidden",
                  transition: "border-color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => { if (!isCurrent) { (e.currentTarget as HTMLButtonElement).style.borderColor = "#cbd5e1"; (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; }}}
                onMouseLeave={(e) => { if (!isCurrent) { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLButtonElement).style.background = isCurrent ? `${TEAL_COLOR}10` : "#fff"; }}}
              >
                <div style={{ width: "100%", aspectRatio: "16/9", overflow: "hidden", position: "relative" }}>
                  <img src={tpl.sampleImageUrl} alt={tpl.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  {isCurrent && (
                    <div style={{ position: "absolute", top: 5, right: 5, width: 18, height: 18, borderRadius: "50%", background: TEAL_COLOR, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M1.5 5l3 3 4-4"/></svg>
                    </div>
                  )}
                </div>
                <div style={{ padding: "7px 10px 8px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? TEAL_COLOR : "#1e293b", marginBottom: 2 }}>{tpl.name}</div>
                  <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.4 }}>{tpl.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
