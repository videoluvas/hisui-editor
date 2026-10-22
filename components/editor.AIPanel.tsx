"use client";

import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import EditorBGMModal         from "@/components/editor.BGMModal";
import EditorBulkEditModal    from "@/components/editor.BulkEditModal";
import EditorAIImageModal     from "@/components/editor.AIImageModal";
import EditorAIVideoModal     from "@/components/editor.AIVideoModal";
import EditorAINarrationModal from "@/components/editor.AINarrationModal";
import WorkspaceSettingsModal from "@/components/WorkspaceSettingsModal";
import type { WsSettingsTab } from "@/components/WorkspaceSettingsModal";
import type { ToolType } from "@/lib/workspace.api";
import { CLIP_MENU, CLIP_KIND_LABEL } from "@/lib/clip.kind";
import type { ClipKind } from "@/lib/clip.kind";
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

function DecoTelopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="white" stroke="none">
      <path d="M1.5 2.5h13v2H9.5v9h-3v-9H1.5z" opacity="0.9"/>
      <path d="M11.5 9.5 12 8l.5 1.5L14 10l-1.5.5L12 12l-.5-1.5L10 10z"/>
      <path d="M13.5 7 13.8 6l.3 1 1 .3-1 .3-.3 1-.3-1-1-.3z"/>
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

function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l8-8"/>
      <path d="M13 3l.8 2.2L16 6l-2.2.8L13 9l-.8-2.2L10 6l2.2-.8z"/>
      <path d="M16.5 11l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z"/>
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h11l-3-3"/>
      <path d="M16 13H5l3 3"/>
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
  toolType?:           ToolType;
  playbackTime:        number;
  onInsert: (asset: { type: "image" | "video" | "audio"; src: string; volume?: number }, start: number) => void;
  getTimelineDuration?: () => number;
  editRef?:            MutableRefObject<MinEdit | null>;
  projectId?:          string | null;
  onBulkEditApplied?:  () => void;
  onBeforeAIApply?:    (snapshot: unknown) => void;
  // ②新規作成パネルから開く生成画面
  bulkEditOpen?:       boolean;
  onBulkEditClose?:    () => void;
  bgmOpen?:            boolean;
  onBgmClose?:         () => void;
  imageOpen?:          boolean;
  onImageClose?:       () => void;
  videoOpen?:          boolean;
  onVideoClose?:       () => void;
  narrationOpen?:      boolean;
  onNarrationClose?:   () => void;
  // ①クリップ操作パネル（選択中のクリップの種類でボタンを出し分ける）
  selectedKind?:       ClipKind | null;
  canToVideo?:         boolean;   // 透過のある画像は動画化しない
  busy?:               boolean;
  onDecorate?:         () => void;
  onRegenImage?:       () => void;
  onImageToVideo?:     () => void;
  onReplaceFile?:      () => void;
  onRegenDeco?:        () => void;
  onRegenNarration?:   () => void;
  onImageGenerated?:    (fileUrl: string, meta: GenMetaImage) => void;
  onVideoGenerated?:    (fileUrl: string, meta: GenMetaVideo) => void;
  onNarrationGenerated?: (fileUrl: string, meta: GenMetaNarration) => void;
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EditorAIPanel({
  workspaceId, workspaceName, toolType, playbackTime, onInsert,
  getTimelineDuration, editRef, projectId, onBulkEditApplied, onBeforeAIApply,
  bulkEditOpen, onBulkEditClose, bgmOpen, onBgmClose,
  imageOpen, onImageClose, videoOpen, onVideoClose, narrationOpen, onNarrationClose,
  selectedKind, canToVideo, busy,
  onDecorate, onRegenImage, onImageToVideo, onReplaceFile, onRegenDeco, onRegenNarration,
  onImageGenerated, onVideoGenerated, onNarrationGenerated,
}: Props) {
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 360, y: 250 });
  useEffect(() => {
    setPos({
      x: Math.round(window.innerWidth  * 0.28),
      y: Math.round(window.innerHeight * 0.31),
    });
  }, []);
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

  const menu = selectedKind ? CLIP_MENU[selectedKind] : null;
  const noop = () => {};

  return (
    <>
      {menu && (
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
            opacity: busy ? 0.6 : 1,
            pointerEvents: busy ? "none" : "auto",
          }}
        >
          {/* ── ドラッグハンドル ── */}
          <div
            onMouseDown={onMouseDown}
            title={`選択中：${CLIP_KIND_LABEL[selectedKind!]}（ドラッグして移動）`}
            style={{ width: 36, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab" }}
          >
            <DragDotsIcon />
          </div>

          <Sep />

          {menu === "decorate" && (
            <GradBtn icon={<SparkleIcon />} tooltip="AI で装飾" onClick={onDecorate ?? noop} />
          )}
          {menu === "picture" && (
            <>
              <GradBtn icon={<RegenIcon />} tooltip="画像を再生成" onClick={onRegenImage ?? noop} />
              <GradBtn
                icon={<VideoIcon />}
                tooltip={canToVideo ? "画像から動画を生成" : "透過のある画像は動画にできません"}
                disabled={!canToVideo}
                onClick={onImageToVideo ?? noop}
              />
            </>
          )}
          {menu === "deco-telop" && (
            <GradBtn icon={<DecoTelopIcon />} tooltip="装飾テロップを再編集" onClick={onRegenDeco ?? noop} />
          )}
          {menu === "narration" && (
            <GradBtn icon={<MicIcon />} tooltip="ナレーションを再生成" onClick={onRegenNarration ?? noop} />
          )}
          {(menu === "decorate" || menu === "picture" || menu === "video" || menu === "audio") && (
            <GradBtn icon={<SwapIcon />} tooltip="ファイルを置き換え" onClick={onReplaceFile ?? noop} />
          )}
        </div>
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
        open={imageOpen ?? false}
        workspaceId={workspaceId}
        playbackTime={playbackTime}
        onClose={() => onImageClose?.()}
        onInsert={(asset, start) => onInsert(asset, start)}
        onOpenSettings={() => openWsSettings("image", onImageClose)}
        onGenerated={onImageGenerated}
      />

      <EditorAIVideoModal
        open={videoOpen ?? false}
        workspaceId={workspaceId}
        playbackTime={playbackTime}
        onClose={() => onVideoClose?.()}
        onInsert={(asset, start) => onInsert(asset, start)}
        onOpenSettings={() => openWsSettings("video", onVideoClose)}
        onGenerated={onVideoGenerated}
      />

      <EditorAINarrationModal
        open={narrationOpen ?? false}
        workspaceId={workspaceId}
        playbackTime={playbackTime}
        onClose={() => onNarrationClose?.()}
        onInsert={(asset, start) => onInsert(asset, start)}
        onOpenSettings={() => openWsSettings("narration", onNarrationClose)}
        onGenerated={onNarrationGenerated}
      />

      {wsSettingsOpen && workspaceId && (
        <WorkspaceSettingsModal
          defaultTab={wsSettingsTab}
          workspaceId={workspaceId}
          workspaceName={workspaceName ?? ""}
          toolType={toolType}
          onClose={() => setWsSettingsOpen(false)}
          onNameChanged={() => {}}
        />
      )}
    </>
  );
}

// ─── Gradient Button ─────────────────────────────────────────────────────────

function GradBtn({ icon, tooltip, onClick, disabled }: {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <button
        onClick={disabled ? undefined : onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 36, height: 36, borderRadius: 8, border: "none",
          background: hovered && !disabled ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.14)",
          color: "#fff", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
          display: "flex", alignItems: "center", justifyContent: "center",
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
