"use client";

import { useRef, useState } from "react";
import type { MutableRefObject } from "react";
import EditorBGMModal         from "@/components/editor.BGMModal";
import EditorBulkEditModal    from "@/components/editor.BulkEditModal";
import EditorAIImageModal     from "@/components/editor.AIImageModal";
import EditorAIVideoModal     from "@/components/editor.AIVideoModal";
import EditorAINarrationModal from "@/components/editor.AINarrationModal";
import WorkspaceSettingsModal from "@/components/WorkspaceSettingsModal";
import type { WsSettingsTab } from "@/components/WorkspaceSettingsModal";
import { loadGenMeta } from "@/lib/gen.meta";
import type { GenMetaImage, GenMetaVideo, GenMetaNarration } from "@/lib/gen.meta";

const GRAD = "linear-gradient(45deg, #5184F0, #169385)";
const FONT = "'Noto Sans JP', sans-serif";

// ─── Icons ────────────────────────────────────────────────────────────────────

function DragDotsIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="rgba(255,255,255,0.55)">
      <circle cx="3.5" cy="3.5" r="1.2"/>
      <circle cx="8.5" cy="3.5" r="1.2"/>
      <circle cx="3.5" cy="8.5" r="1.2"/>
      <circle cx="8.5" cy="8.5" r="1.2"/>
    </svg>
  );
}

function EditPromptIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5l4 4L6 17H3v-3L12 3.5z"/>
      <path d="M9 6.5l4 4"/>
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V5l10-2.5v11"/>
      <circle cx="5" cy="16" r="2.5"/>
      <circle cx="15" cy="13.5" r="2.5"/>
    </svg>
  );
}

function DecoTelopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="white" stroke="none">
      <path d="M1.5 2.5h13v2H9.5v9h-3v-9H1.5z" opacity="0.9"/>
      <path d="M11.5 9.5 12 8l.5 1.5L14 10l-1.5.5L12 12l-.5-1.5L10 10z"/>
      <path d="M13.5 7 13.8 6l.3 1 1 .3-1 .3-.3 1-.3-1-1-.3z"/>
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="16" height="12" rx="2"/>
      <circle cx="7" cy="8.5" r="1.5"/>
      <path d="M2 14l4-4 3 3 3-3 4 4"/>
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="12" height="10" rx="2"/>
      <path d="M14 8l4-2v8l-4-2V8z"/>
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="2" width="6" height="9" rx="3"/>
      <path d="M3 10c0 3.866 3.134 7 7 7s7-3.134 7-7"/>
      <line x1="10" y1="17" x2="10" y2="20"/>
      <line x1="7" y1="20" x2="13" y2="20"/>
    </svg>
  );
}

function RegenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 10A6.5 6.5 0 0 1 14.6 5.6"/>
      <path d="M16.5 4v4h-4"/>
      <path d="M16.5 10A6.5 6.5 0 0 1 5.4 14.4"/>
      <path d="M3.5 16v-4h4"/>
    </svg>
  );
}

function Sep() {
  return <div style={{ width: 24, height: 1, background: "rgba(255,255,255,0.3)", margin: "2px auto" }} />;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type MinEdit = {
  getEdit:  () => unknown;
  loadEdit: (e: unknown) => Promise<void>;
};

type Props = {
  workspaceId?:        string | null;
  workspaceName?:      string | null;
  playbackTime:        number;
  selectedClipType?:   string | null;
  selectedClipSrc?:    string | null;
  onInsert: (asset: { type: "image" | "video" | "audio"; src: string; volume?: number }, start: number) => void;
  getTimelineDuration?: () => number;
  editRef?:            MutableRefObject<MinEdit | null>;
  projectId?:          string | null;
  onBulkEditApplied?:  () => void;
  onBeforeAIApply?:    (snapshot: unknown) => void;
  bulkEditOpen?:       boolean;
  onBulkEditClose?:    () => void;
  bgmOpen?:            boolean;
  onBgmClose?:         () => void;
  onBulkEditOpen?:     () => void;
  onBgmOpen?:          () => void;
  onDecoTelopOpen?:    () => void;
  onRegenDeco?:        (fileUrl?: string) => void;
  onRegenFile?:        (fileUrl: string) => void;
  onImageGenerated?:    (fileUrl: string, meta: GenMetaImage) => void;
  onVideoGenerated?:    (fileUrl: string, meta: GenMetaVideo) => void;
  onNarrationGenerated?: (fileUrl: string, meta: GenMetaNarration) => void;
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EditorAIPanel({
  workspaceId, workspaceName, playbackTime, selectedClipType, selectedClipSrc, onInsert,
  getTimelineDuration, editRef, projectId, onBulkEditApplied, onBeforeAIApply,
  bulkEditOpen, onBulkEditClose, bgmOpen, onBgmClose,
  onBulkEditOpen, onBgmOpen, onDecoTelopOpen, onRegenDeco, onRegenFile,
  onImageGenerated, onVideoGenerated, onNarrationGenerated,
}: Props) {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === "undefined") return { x: 360, y: 250 };
    return {
      x: Math.round(window.innerWidth  * 0.28),
      y: Math.round(window.innerHeight * 0.31),
    };
  });
  const [imageOpen,     setImageOpen]     = useState(false);
  const [videoOpen,     setVideoOpen]     = useState(false);
  const [narrationOpen, setNarrationOpen] = useState(false);
  const [wsSettingsOpen, setWsSettingsOpen] = useState(false);
  const [wsSettingsTab,  setWsSettingsTab]  = useState<WsSettingsTab>("image");

  const dragging   = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };
  const onMouseMove = (e: MouseEvent) => {
    if (!dragging.current) return;
    setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  };
  const onMouseUp = () => {
    dragging.current = false;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  const openWsSettings = (tab: WsSettingsTab, closeModal?: () => void) => {
    closeModal?.();
    setWsSettingsTab(tab);
    setWsSettingsOpen(true);
  };

  const regenInfo = (() => {
    if (!selectedClipSrc) return null;
    const meta = loadGenMeta(selectedClipSrc);
    if (!meta) return null;
    if (meta.type === "ai-image")     return { label: "AI 画像を再生成",         action: () => onRegenFile?.(selectedClipSrc) };
    if (meta.type === "ai-video")     return { label: "AI 動画を再生成",          action: () => onRegenFile?.(selectedClipSrc) };
    if (meta.type === "ai-narration") return { label: "AI ナレーションを再生成",  action: () => onRegenFile?.(selectedClipSrc) };
    if (meta.type === "deco-telop")   return { label: "装飾テロップを再加工",     action: () => onRegenDeco?.(selectedClipSrc) };
    return null;
  })();

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 500,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: 6,
        borderRadius: 14,
        background: GRAD,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1), 0 8px 24px rgba(81,132,240,0.28)",
        fontFamily: FONT,
        userSelect: "none",
        overflow: "visible",
      }}
    >
      {/* ── ドラッグハンドル ── */}
      <div
        onMouseDown={onMouseDown}
        title="ドラッグして移動"
        style={{ width: 36, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab" }}
      >
        <DragDotsIcon />
      </div>

      <Sep />

      {/* ── プロンプトで全体編集 ── */}
      <GradBtn icon={<EditPromptIcon />} tooltip="プロンプトで全体編集" onClick={() => onBulkEditOpen?.()} />

      <Sep />

      {/* ── 装飾テロップを追加 ── */}
      <GradBtn icon={<DecoTelopIcon />} tooltip="装飾テロップを追加" onClick={() => onDecoTelopOpen?.()} />

      {/* ── BGMを生成 ── */}
      <GradBtn icon={<MusicIcon />} tooltip="BGMを生成" onClick={() => onBgmOpen?.()} />

      <Sep />

      {/* ── AI画像を生成 ── */}
      <GradBtn icon={<ImageIcon />} tooltip="AI 画像を生成" onClick={() => setImageOpen(true)} />

      {/* ── AI動画を生成 ── */}
      <GradBtn icon={<VideoIcon />} tooltip="AI 動画を生成" onClick={() => setVideoOpen(true)} />

      {/* ── AIナレーションを生成 ── */}
      <GradBtn icon={<MicIcon />} tooltip="AI ナレーションを生成" onClick={() => setNarrationOpen(true)} />

      {/* ── 再生成（選択クリップ種別に応じて表示） ── */}
      {regenInfo && (
        <>
          <Sep />
          <GradBtn icon={<RegenIcon />} tooltip={regenInfo.label} onClick={regenInfo.action} />
        </>
      )}

      {/* ── Modals ── */}
      <EditorBGMModal
        open={bgmOpen ?? false}
        timelineDuration={getTimelineDuration?.() ?? 0}
        workspaceId={workspaceId}
        onClose={() => onBgmClose?.()}
        onInsert={(asset, start) => onInsert(asset, start)}
      />

      {editRef && projectId && (
        <EditorBulkEditModal
          open={bulkEditOpen ?? false}
          projectId={projectId}
          editRef={editRef}
          onClose={() => onBulkEditClose?.()}
          onApplied={() => { onBulkEditClose?.(); onBulkEditApplied?.(); }}
          onBeforeApply={onBeforeAIApply}
        />
      )}

      <EditorAIImageModal
        open={imageOpen}
        workspaceId={workspaceId}
        playbackTime={playbackTime}
        onClose={() => setImageOpen(false)}
        onInsert={(asset, start) => onInsert(asset, start)}
        onOpenSettings={() => openWsSettings("image", () => setImageOpen(false))}
        onGenerated={onImageGenerated}
      />

      <EditorAIVideoModal
        open={videoOpen}
        workspaceId={workspaceId}
        playbackTime={playbackTime}
        onClose={() => setVideoOpen(false)}
        onInsert={(asset, start) => onInsert(asset, start)}
        onOpenSettings={() => openWsSettings("video", () => setVideoOpen(false))}
        onGenerated={onVideoGenerated}
      />

      <EditorAINarrationModal
        open={narrationOpen}
        workspaceId={workspaceId}
        playbackTime={playbackTime}
        onClose={() => setNarrationOpen(false)}
        onInsert={(asset, start) => onInsert(asset, start)}
        onOpenSettings={() => openWsSettings("narration", () => setNarrationOpen(false))}
        onGenerated={onNarrationGenerated}
      />

      {wsSettingsOpen && workspaceId && (
        <WorkspaceSettingsModal
          defaultTab={wsSettingsTab}
          workspaceId={workspaceId}
          workspaceName={workspaceName ?? ""}
          onClose={() => setWsSettingsOpen(false)}
          onNameChanged={() => {}}
        />
      )}
    </div>
  );
}

// ─── Gradient Button ─────────────────────────────────────────────────────────

function GradBtn({ icon, tooltip, onClick }: {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 36, height: 36, borderRadius: 8, border: "none",
          background: hovered ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.14)",
          color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.15s", padding: 0, flexShrink: 0,
        }}
      >
        {icon}
      </button>

      {hovered && (
        <div
          style={{
            position: "absolute", left: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)",
            background: "rgba(15,23,42,0.82)", color: "#fff", fontSize: 11, fontWeight: 600,
            padding: "5px 10px", borderRadius: 7, whiteSpace: "nowrap", pointerEvents: "none",
            fontFamily: FONT, boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
          }}
        >
          {tooltip}
          <span style={{
            position: "absolute", right: "100%", top: "50%", transform: "translateY(-50%)",
            width: 0, height: 0,
            borderTop: "5px solid transparent", borderBottom: "5px solid transparent",
            borderRight: "6px solid rgba(15,23,42,0.82)",
          }} />
        </div>
      )}
    </div>
  );
}
