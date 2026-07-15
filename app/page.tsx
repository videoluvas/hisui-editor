"use client";

import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/lib/useIsMobile";
import SidePanel from "@/components/SidePanel";
import { handleEditorAuthFromUrl } from "@/lib/auth.front";
import { DEFAULT_FONT, getShotstackFontId } from "@/lib/fonts";
import { getPresignedUrl, getMyFiles } from "@/lib/fileupload.front";
import { TEAL } from "@/components/icons";
import type { Project } from "@/lib/project.api";
import type { EditConfig } from "@shotstack/shotstack-studio";
import { clampClipSize } from "@/lib/editor.utils";
import { useEditorAutosave } from "@/hooks/editor.Autosave";
import { useProjectLoader } from "@/hooks/project.Loader";
import EditorFileInsertModal from "@/components/editor.FileInsertModal";
import EditorProjectLoadingOverlay from "@/components/editor.ProjectLoadingOverlay";
import EditorSavePanel from "@/components/editor.SavePanel";
import EditorAIPanel from "@/components/editor.AIPanel";
import EditorDecoTelopModal from "@/components/editor.DecoTelopModal";
import EditorAIImageModal from "@/components/editor.AIImageModal";
import EditorAIVideoModal from "@/components/editor.AIVideoModal";
import EditorAINarrationModal from "@/components/editor.AINarrationModal";
import EditorRegenImageModal from "@/components/editor.RegenImageModal";
import EditorRegenVideoModal from "@/components/editor.RegenVideoModal";
import EditorRegenNarrationModal from "@/components/editor.RegenNarrationModal";
import { saveProjectEditJson } from "@/lib/project.api";
import type { AutoSaveMode, AutoSaveInterval, SaveLog } from "@/components/editor.SavePanel";
import { loadGenMeta } from "@/lib/gen.meta";
import type { GenMeta, GenMetaImage, GenMetaVideo, GenMetaNarration } from "@/lib/gen.meta";
import type { DecoSettings } from "@/components/editor.DecoTelopModal";
import ConteTool from "@/components/ConteTool";
import type { AppMode } from "@/components/SidePanel";
import type { ExportProgressInfo } from "@/components/SidePanelExport";

type FileItem = {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string | null;
};

type FileModalState = {
  open: boolean;
  position: number;
  view: "choice" | "list";
  files: FileItem[];
  uploading: boolean;
  uploadProgress: number | null;
  mode: "insert" | "replace";
};

type EditorHandle = {
  addTrack: (idx: number, config: unknown) => void;
  playbackTime: number;
  setOutputSize: (width: number, height: number) => Promise<void>;
  setOutputFps: (fps: number) => Promise<void>;
  setOutputFormat?: (format: string) => Promise<void>;
  setTimelineBackground: (color: string) => Promise<void>;
  getEdit: () => EditConfig;
  loadEdit: (edit: EditConfig) => Promise<void>;
  events: { on: (event: string, handler: (data: unknown) => void) => void };
};

type UiOn = (event: string, handler: (payload: { position: number }) => void) => void;

export default function Home() {
  const isMobile = useIsMobile();
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [autoSaveMode, setAutoSaveMode] = useState<AutoSaveMode>("onChange");
  const [autoSaveInterval, setAutoSaveInterval] = useState<AutoSaveInterval>(10);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveLogs, setSaveLogs] = useState<SaveLog[]>([]);
  const [appMode, setAppMode] = useState<AppMode>("video");
  const [selectedStoryboardId, setSelectedStoryboardId] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedWorkspaceName, setSelectedWorkspaceName] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [fileModal, setFileModal] = useState<FileModalState>({
    open: false, position: 0, view: "choice", files: [], uploading: false, uploadProgress: null, mode: "insert",
  });
  const [timelineDragOver, setTimelineDragOver] = useState(false);
  const [decoTelopOpen, setDecoTelopOpen] = useState(false);
  const [decoTelopPosition, setDecoTelopPosition] = useState(0);
  const [decoInitialData, setDecoInitialData] = useState<DecoSettings | undefined>(undefined);
  const [decoExistingFileUrl, setDecoExistingFileUrl] = useState<string | undefined>(undefined);
  const [regenMeta,    setRegenMeta]    = useState<GenMeta | null>(null);
  const [regenFileUrl, setRegenFileUrl] = useState<string | null>(null);
  const [regenSource,  setRegenSource]  = useState<"timeline" | "files" | null>(null);
  const [selectedClipType, setSelectedClipType] = useState<string | null>(null);
  const [selectedClipSrc,  setSelectedClipSrc]  = useState<string | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bgmOpen, setBgmOpen] = useState(false);

  const editRef = useRef<EditorHandle | null>(null);
  const canvasRef = useRef<unknown>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedProjectRef = useRef<Project | null>(null);
  const isLoadingRef = useRef(false);
  const editorInitializedRef = useRef(false);
  const selectedClipSrcRef = useRef<string | null>(null);

  const { isProjectLoading, isProjectLoadingRef } = useProjectLoader(editRef, editorReady, selectedProject, isLoadingRef);

  useEditorAutosave(editRef, selectedProjectRef, isLoadingRef, isProjectLoadingRef, editorReady, () => {
    setLastSavedAt(new Date());
    setSaveLogs((prev) => [...prev, { type: "auto", savedAt: new Date() }]);
  });

  const captureCurrentFrame = async (): Promise<string | null> => {
    const studioEl = document.querySelector(".c-shotstack-studio");
    if (!studioEl) return null;

    const outputSize = (editRef.current?.getEdit() as any)?.output?.size as { width?: number; height?: number } | undefined;
    const outW = outputSize?.width  || 1920;
    const outH = outputSize?.height || 1080;

    const canvasEl = studioEl.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvasEl) return null;

    const ssCanvas = canvasRef.current as any;
    const prevZoom = ssCanvas?.getZoom?.() ?? null;
    ssCanvas?.zoomToFit?.();
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    const bufW = canvasEl.width  || outW;
    const bufH = canvasEl.height || outH;
    const bufAspect = bufW / bufH;
    const outAspect = outW / outH;

    let sx = 0, sy = 0, sw = bufW, sh = bufH;
    if (Math.abs(bufAspect - outAspect) > 0.005) {
      if (bufAspect > outAspect) {
        sw = Math.round(bufH * outAspect);
        sx = Math.round((bufW - sw) / 2);
      } else {
        sh = Math.round(bufW / outAspect);
        sy = Math.round((bufH - sh) / 2);
      }
    }
    const bleedX = Math.round(sw * 0.05);
    const bleedY = Math.round(sh * 0.05);
    sx += bleedX; sy += bleedY;
    sw -= bleedX * 2; sh -= bleedY * 2;

    try {
      if (typeof canvasEl.captureStream === "function") {
        const stream = canvasEl.captureStream(0);
        const [track] = stream.getVideoTracks();
        if (track && typeof ImageCapture !== "undefined") {
          const capture = new ImageCapture(track);
          const bitmap = await capture.grabFrame();
          track.stop();
          const tmp = document.createElement("canvas");
          tmp.width = outW; tmp.height = outH;
          tmp.getContext("2d")!.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH);
          return tmp.toDataURL("image/jpeg", 0.92);
        }
        stream.getTracks().forEach(t => t.stop());
      }
      const videoEl = studioEl.querySelector("video") as HTMLVideoElement | null;
      if (videoEl && videoEl.readyState >= 2) {
        const tmp = document.createElement("canvas");
        tmp.width = outW; tmp.height = outH;
        tmp.getContext("2d")!.drawImage(videoEl, 0, 0, outW, outH);
        return tmp.toDataURL("image/jpeg", 0.92);
      }
      return null;
    } finally {
      if (prevZoom !== null) ssCanvas?.setZoom?.(prevZoom);
    }
  };

  const selectProject = (project: Project | null) => {
    selectedProjectRef.current = project;
    setSelectedProject(project);
    if (project) {
      const url = new URL(window.location.href);
      url.searchParams.set("project", project.id);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const handleSave = async () => {
    const project = selectedProjectRef.current;
    if (!project) return;
    setSaveStatus("saving");
    try {
      const rawEditJson = editRef.current?.getEdit();
      if (!rawEditJson) return;
      await saveProjectEditJson(project.id, structuredClone(rawEditJson));
      setSaveStatus("saved");
      setLastSavedAt(new Date());
      setSaveLogs((prev) => [...prev, { type: "manual", savedAt: new Date() }]);
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (e) {
      console.error("保存エラー=", e);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleBeforeAIApply = (snapshot: unknown) => {
    setSaveLogs((prev) => [...prev, { type: "ai-before", savedAt: new Date(), snapshot }]);
  };

  const handleRestoreFromLog = async (snapshot: unknown) => {
    const project = selectedProjectRef.current;
    if (!editRef.current || !project) return;
    setSaveStatus("saving");
    try {
      await editRef.current.loadEdit(snapshot as Parameters<typeof editRef.current.loadEdit>[0]);
      await saveProjectEditJson(project.id, snapshot);
      setSaveStatus("saved");
      setSaveLogs((prev) => [...prev, { type: "manual", savedAt: new Date() }]);
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (e) {
      console.error("復元エラー=", e);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleExportLocal = async () => {
    const project = selectedProjectRef.current;
    const edit = editRef.current;
    const canvas = canvasRef.current;
    if (!project || !edit || !canvas) { setExportError("書き出し対象のプロジェクトが見つかりません"); return; }
    if (isProjectLoading || !editorReady) { setExportError("プロジェクトの読み込み完了後に書き出してください"); return; }

    // 音声・動画チェック
    const editJson = edit.getEdit() as any;
    const hasMedia = editJson?.timeline?.tracks?.some((track: any) =>
      track.clips?.some((clip: any) => clip?.asset?.type === "video" || clip?.asset?.type === "audio")
    );
    if (hasMedia) {
      setExportError("音声・動画クリップが含まれています。「音声・動画を含むプロジェクト」の書き出しを使用してください。");
      return;
    }

    setIsExporting(true);
    setExportError(null);
    try {
      if (project.width && project.height) await edit.setOutputSize(project.width, project.height);
      if (project.fps) await edit.setOutputFps(project.fps);
      if (project.backgroundColor) await edit.setTimelineBackground(project.backgroundColor);
      if (edit.setOutputFormat) await edit.setOutputFormat("mp4");
      const { VideoExporter } = await import("@shotstack/shotstack-studio");
      const exporter = new (VideoExporter as any)(edit, canvas);
      await exporter.export("export.mp4", 25);
    } catch (error) {
      console.error("書き出しエラー:", error);
      setExportError("書き出しに失敗しました");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportApi = async (onProgress: (info: ExportProgressInfo) => void): Promise<void> => {
    const project = selectedProjectRef.current;
    if (!project)                         throw new Error("プロジェクトを選択してください");
    if (isProjectLoading || !editorReady) throw new Error("プロジェクトの読み込み完了後に書き出してください");

    onProgress({ phase: "saving" });
    await handleSave();

    onProgress({ phase: "submitting" });
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.message ?? "書き出し開始に失敗しました");

    const { renderId } = data;
    onProgress({ phase: "queued" });

    // ポーリング（最大5分 / 5秒間隔 / 60回）
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const statusRes  = await fetch(`/api/export/status?renderId=${renderId}`);
      const statusData = await statusRes.json() as { status: string; url?: string };
      const { status, url } = statusData;

      if (status === "queued")    { onProgress({ phase: "queued" });        continue; }
      if (status === "fetching")  { onProgress({ phase: "fetching" });      continue; }
      if (status === "rendering") { onProgress({ phase: "rendering" });     continue; }
      if (status === "saving")    { onProgress({ phase: "saving_render" }); continue; }
      if (status === "done")      { onProgress({ phase: "done", url });     return;   }
      if (status === "failed")    throw new Error("レンダリングに失敗しました");
    }
    throw new Error("タイムアウトしました（5分以上経過）");
  };

  const insertFileToTimeline = (file: FileItem, position: number) => {
    if (!editRef.current || !file.fileUrl) return;
    let asset: Record<string, unknown>;
    if (file.fileType === "video") asset = { type: "video", src: file.fileUrl };
    else if (file.fileType === "image") asset = { type: "image", src: file.fileUrl };
    else if (file.fileType === "audio") asset = { type: "audio", src: file.fileUrl, volume: 1 };
    else return;
    editRef.current.addTrack(0, { clips: [clampClipSize({ asset, start: position, length: 10 })] });
    setFileModal((m) => ({ ...m, open: false }));
  };

  const replaceClipSrc = async (newSrc: string, oldSrc: string) => {
    if (!editRef.current) return;
    const updated = structuredClone(editRef.current.getEdit() as any);
    for (const track of updated.timeline?.tracks ?? []) {
      for (const clip of track.clips ?? []) {
        if (clip?.asset?.src === oldSrc) { clip.asset = { ...clip.asset, src: newSrc }; break; }
      }
    }
    await editRef.current.loadEdit(updated);
  };

  const replaceFileInTimeline = async (file: FileItem) => {
    if (!editRef.current || !file.fileUrl || !selectedClipSrcRef.current) return;
    const oldSrc = selectedClipSrcRef.current;
    let newAsset: Record<string, unknown>;
    if (file.fileType === "video") newAsset = { type: "video", src: file.fileUrl };
    else if (file.fileType === "image") newAsset = { type: "image", src: file.fileUrl };
    else if (file.fileType === "audio") newAsset = { type: "audio", src: file.fileUrl, volume: 1 };
    else return;
    const updated = structuredClone(editRef.current.getEdit() as any);
    for (const track of updated.timeline?.tracks ?? []) {
      for (const clip of track.clips ?? []) {
        if (clip?.asset?.src === oldSrc) {
          clip.asset = newAsset;
          break;
        }
      }
    }
    await editRef.current.loadEdit(updated);
    setFileModal((m) => ({ ...m, open: false }));
  };

  const handleSelectFromUploaded = async () => {
    const res = await getMyFiles();
    setFileModal((m) => ({ ...m, view: "list", files: res.ok ? res.files : [] }));
  };

  const handleFileUploadAndInsert = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileModal((m) => ({ ...m, uploading: true, uploadProgress: 0 }));
    try {
       const data = await getPresignedUrl(file, selectedProjectRef.current?.id);
      if (!data.ok || !data.presignedUrl) { alert(data.message ?? "アップロードURLの取得に失敗しました"); return; }
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setFileModal((m) => ({ ...m, uploadProgress: Math.round((ev.loaded / ev.total) * 100) }));
        };
        xhr.onload = () => (xhr.status < 400 ? resolve() : reject());
        xhr.onerror = reject;
        xhr.open("PUT", data.presignedUrl!);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
      const uploadedFile = { id: data.fileId ?? "", fileName: file.name, fileType: file.type.split("/")[0], fileUrl: data.fileUrl ?? null };
      if (fileModal.mode === "replace") {
        await replaceFileInTimeline(uploadedFile);
      } else {
        insertFileToTimeline(uploadedFile, fileModal.position);
      }
    } catch {
      alert("アップロードに失敗しました");
    } finally {
      setFileModal((m) => ({ ...m, uploading: false, uploadProgress: null }));
      e.target.value = "";
    }
  };

  useEffect(() => {
    const initPage = async () => {
      try {
        const authResult = await handleEditorAuthFromUrl();
        if (authResult && !authResult.ok) alert(authResult.message || "認証に失敗しました");
      } catch (error) {
        console.error("認証エラー:", error);
      }
      setAuthReady(true);

      try {
        const { Edit, Canvas, Controls, Timeline, UIController } = await import("@shotstack/shotstack-studio");

        const initialTemplate = {
          timeline: {
            background: "#000000",
            tracks: [{ clips: [{ asset: { type: "svg", src: '<svg viewBox="0 0 1 1" xmlns="http://www.w3.org/2000/svg"/>' } as any, start: 0, length: 1 }] }],
          },
          output: { format: "mp4", size: { width: 1920, height: 1080 }, fps: 30 },
        };

        const edit = new (Edit as any)(initialTemplate);
        editRef.current = edit as unknown as EditorHandle;
        const canvas = new Canvas(edit);
        canvasRef.current = canvas;

        const ui = UIController.create(edit, canvas);
        await canvas.load();
        await edit.load();

        ui.registerButton({
          id: "text",
          icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3H13"/><path d="M8 3V13"/><path d="M5 13H11"/></svg>`,
          tooltip: "字幕を追加",
        });
        ui.registerButton({
          id: "shape",
          icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="12" height="12" rx="1.5"/></svg>`,
          tooltip: "図形を追加",
        });
        ui.registerButton({
          id: "insertfile",
          icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2"><path stroke-linejoin="round" d="M16 20h2.4c.56 0 .84 0 1.054-.109a1 1 0 0 0 .437-.437C20 19.24 20 18.96 20 18.4V9.6c0-.56 0-.84-.109-1.054a1 1 0 0 0-.437-.437C19.24 8 18.96 8 18.4 8h-4.737c-.245 0-.367 0-.482-.028a1 1 0 0 1-.29-.12c-.1-.061-.187-.148-.36-.32L10.47 5.468c-.173-.173-.26-.26-.36-.322a1 1 0 0 0-.29-.12C9.704 5 9.582 5 9.337 5H5.6c-.56 0-.84 0-1.054.109a1 1 0 0 0-.437.437C4 5.76 4 6.04 4 6.6v11.8c0 .56 0 .84.109 1.054a1 1 0 0 0 .437.437C4.76 20 5.04 20 5.6 20H8"/><path d="m12 12l-3 3m3-3l3 3m-3-3v7"/></g></svg>`,
          tooltip: "ファイルを挿入",
        });
        (ui.on as UiOn)("button:text", ({ position }) => {
          edit.addTrack(0, {
            clips: [clampClipSize({
              asset: {
                type: "rich-text",
                text: "タイトル",
                font: { family: getShotstackFontId(DEFAULT_FONT?.family ?? "Noto Sans JP"), size: 72, weight: DEFAULT_FONT?.weight ?? 400, color: "#ffffff", opacity: 1 },
                align: { horizontal: "center", vertical: "middle" },
              },
              start: position, length: 5, width: 500, height: 200,
            })],
          });
        });

        (ui.on as UiOn)("button:shape", ({ position }) => {
          edit.addTrack(0, {
            clips: [clampClipSize({
              asset: { type: "svg", src: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="100" height="100" rx="10" ry="10" fill="#00FFFF"/></svg>' },
              opacity: 1, start: position, length: 10, width: 300, height: 300,
            })],
          });
        });

        ui.registerButton({
          id: "replacefile",
          icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v5h5"/><path d="M20 20v-5h-5"/><path d="M4 9a9 9 0 0 1 14.9-3.4L20 9"/><path d="M20 15a9 9 0 0 1-14.9 3.4L4 15"/></svg>`,
          tooltip: "ファイルを差し替え",
        });
        (ui.on as UiOn)("button:insertfile", ({ position }) => {
          setFileModal({ open: true, position, view: "choice", files: [], uploading: false, uploadProgress: null, mode: "insert" });
        });
        (ui.on as UiOn)("button:replacefile", ({ position }) => {
          if (!selectedClipSrcRef.current) return;
          setFileModal({ open: true, position, view: "choice", files: [], uploading: false, uploadProgress: null, mode: "replace" });
        });


        const timelineContainer = document.querySelector<HTMLElement>("[data-shotstack-timeline]");
        if (!timelineContainer) throw new Error("タイムラインコンテナが見つかりません");

        const timeline = new Timeline(edit, timelineContainer, { resizable: true });
        await timeline.load();
        const controls = new Controls(edit);
        await controls.load();

        edit.events.on("clip:loadFailed", (data: unknown) => console.error("clip:loadFailed", data));
        edit.events.on("clip:unresolved", (data: unknown) => console.error("clip:unresolved", data));

        // Shotstack SDK のクリップ選択イベント（対応している場合に src を取得）
        try {
          (edit.events as any).on("clip:select", (data: unknown) => {
            const d = data as any;
            const src = d?.asset?.src ?? d?.clip?.asset?.src ?? d?.src ?? null;
            if (src) setSelectedClipSrc(src);
            console.debug("[clip:select]", data);
          });
          (edit.events as any).on("clip:deselect", () => setSelectedClipSrc(null));
        } catch {}

        // edit JSON をスキャンしてクリップの src を探す
        // clipLabel（.ss-clip-label のテキスト）があればファイル名で確実に一致させる
        const resolveClipSrc = (assetType: string, clipLabel?: string | null): string | null => {
          const editJson = editRef.current?.getEdit() as any;
          const tracks = editJson?.timeline?.tracks ?? [];

          // ファイル名一致（最優先・genMeta 不要）
          if (clipLabel) {
            for (const track of tracks) {
              for (const clip of track.clips ?? []) {
                if (clip?.asset?.src && (clip.asset.src as string).includes(clipLabel)) {
                  return clip.asset.src as string;
                }
              }
            }
          }

          // フォールバック：再生位置 + genMeta で絞り込み
          const t = editRef.current?.playbackTime ?? 0;
          for (const track of tracks) {
            for (const clip of track.clips ?? []) {
              if (clip?.asset?.type === assetType && clip?.asset?.src) {
                const s = clip.start ?? 0;
                if (t >= s && t <= s + (clip.length ?? 0)) {
                  if (loadGenMeta(clip.asset.src as string)) return clip.asset.src as string;
                }
              }
            }
          }
          let bestSrc: string | null = null;
          let bestDist = Infinity;
          for (const track of tracks) {
            for (const clip of track.clips ?? []) {
              if (clip?.asset?.type === assetType && clip?.asset?.src) {
                if (!loadGenMeta(clip.asset.src as string)) continue;
                const s = clip.start ?? 0;
                const e = s + (clip.length ?? 0);
                const dist = t < s ? s - t : t > e ? t - e : 0;
                if (dist < bestDist) { bestDist = dist; bestSrc = clip.asset.src as string; }
              }
            }
          }
          return bestSrc;
        };

        // DOM監視：クリップ種別の検出 + .ss-clip-label でファイル名を取得して src を解決
        const selectionObserver = new MutationObserver(() => {
          const el = document.querySelector(".ss-clip.selected");
          if (!el) {
            setSelectedClipType(null);
            setSelectedClipSrc(null);
            selectedClipSrcRef.current = null;
            console.debug("[clip:deselect]");
            return;
          }
          const assetType = el.getAttribute("data-asset-type") ?? "unknown";
          const clipLabel = el.querySelector(".ss-clip-label")?.textContent ?? null;
          setSelectedClipType(assetType);
          const domSrc: string | null =
            el.getAttribute("data-asset-src") ??
            el.getAttribute("data-src") ??
            el.getAttribute("data-clip-src") ??
            (el.querySelector("img[src]") as HTMLImageElement | null)?.src ??
            (() => {
              for (const child of Array.from(el.querySelectorAll("[style]"))) {
                const bg = (child as HTMLElement).style.backgroundImage;
                if (bg) { const m = bg.match(/url\(["']?([^"')]+)["']?\)/); if (m?.[1] && !m[1].startsWith("data:")) return m[1]; }
              }
              return null;
            })() ?? null;
          const resolvedSrc = domSrc ?? resolveClipSrc(assetType, clipLabel);
          setSelectedClipSrc(resolvedSrc);
          selectedClipSrcRef.current = resolvedSrc;
          console.debug("[clip:select via observer]", { clipLabel, assetType, domSrc, resolvedSrc });
        });
        selectionObserver.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });

        setEditorReady(true);
      } catch (error) {
        setEditorReady(false);
        console.error("エディタの読み込みに失敗しました:", error);
      }
    };

    if (editorInitializedRef.current) return;
    editorInitializedRef.current = true;
    initPage();
  }, []);

  if (isMobile) {
    return (
      <div style={{
        minHeight: "100dvh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 20,
        background: "#f8fafc", padding: "32px 24px", textAlign: "center",
        fontFamily: "'Noto Sans JP', sans-serif",
      }}>
        <img
          src="https://assets.hisui-ai.com/system/img/hisui_video_%E3%83%AD%E3%82%B4_01.png"
          alt="ヒスイAI" style={{ height: 36, objectFit: "contain" }}
        />
        <div style={{ fontSize: 32 }}>💻</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>
            PCブラウザでご利用ください
          </div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.8 }}>
            ヒスイAIの動画編集機能は<br />
            PCブラウザ向けに最適化されています。
          </div>
        </div>
        <a
          href="/manual"
          style={{
            marginTop: 8, display: "inline-block",
            fontSize: 13, color: "#169385", textDecoration: "underline",
          }}
        >
          マニュアルを見る
        </a>
      </div>
    );
  }

  return (
    <>
      {isMobile && (
        <button
          onClick={() => setSidePanelOpen(true)}
          style={{
            position: "fixed", top: 12, left: 12, zIndex: 200,
            width: 40, height: 40, border: "none", borderRadius: 10,
            background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
            cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 4,
          }}
        >
          {[0,1,2].map((i) => (
            <span key={i} style={{ display: "block", width: 16, height: 2, borderRadius: 1, background: "#334155" }} />
          ))}
        </button>
      )}
      <div className="editor-shell">
        <div className="editor-top">
          {authReady && (
            <SidePanel
              selectedProjectId={selectedProject?.id ?? null}
              selectedProject={selectedProject}
              onSelectProject={selectProject}
              onExportLocal={handleExportLocal}
              onExportApi={handleExportApi}
              isExporting={isExporting}
              isProjectLoading={isProjectLoading}
              exportError={exportError}
              appMode={appMode}
              onAppModeChange={setAppMode}
              selectedStoryboardId={selectedStoryboardId}
              onSelectStoryboard={setSelectedStoryboardId}
              selectedWorkspaceId={selectedWorkspaceId}
              onSelectWorkspace={(id, name) => { setSelectedWorkspaceId(id); setSelectedWorkspaceName(name); }}
              onFileDoubleClick={(fileUrl, meta) => {
                if (!meta) return;
                if (meta.type === "deco-telop") {
                  setDecoInitialData(meta.settings as unknown as DecoSettings);
                  setDecoExistingFileUrl(fileUrl);
                  setDecoTelopPosition(editRef.current?.playbackTime ?? 0);
                  setDecoTelopOpen(true);
                } else {
                  setRegenFileUrl(fileUrl);
                  setRegenMeta(meta);
                  setRegenSource("files");
                }
              }}
              isOpen={sidePanelOpen}
              onClose={() => setSidePanelOpen(false)}
            />
          )}
          <div style={{ display: appMode === "conte" ? "flex" : "none", flex: 1, minWidth: 0, overflow: "hidden" }}>
            <ConteTool
              storyboardId={selectedStoryboardId}
              workspaceId={selectedWorkspaceId}
              workspaceName={selectedWorkspaceName}
            />
          </div>
          <main className="studio-area" style={{ display: appMode === "video" ? undefined : "none" }}>
            <div data-shotstack-studio className="c-shotstack-studio" />
          </main>
        </div>

        <div
          style={{ position: "relative", display: appMode === "video" ? undefined : "none" }}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setTimelineDragOver(true); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setTimelineDragOver(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setTimelineDragOver(false);
            const raw = e.dataTransfer.getData("application/x-hisui-file");
            if (!raw) return;
            try { insertFileToTimeline(JSON.parse(raw), editRef.current?.playbackTime ?? 0); } catch { }
          }}
        >
          <div data-shotstack-timeline className="c-shotstack-timeline" />
          {timelineDragOver && (
            <div style={{ position: "absolute", inset: 0, border: `2px solid ${TEAL}`, borderRadius: 4, background: `${TEAL}18`, pointerEvents: "none", zIndex: 100 }} />
          )}
        </div>
      </div>

      <EditorFileInsertModal
        fileModal={fileModal}
        onClose={() => setFileModal((m) => ({ ...m, open: false }))}
        onBack={() => setFileModal((m) => ({ ...m, view: "choice" }))}
        onSelectFromUploaded={handleSelectFromUploaded}
        onUploadClick={() => fileInputRef.current?.click()}
        onInsertFile={insertFileToTimeline}
        onReplaceFile={replaceFileInTimeline}
      />
      <EditorProjectLoadingOverlay isLoading={isProjectLoading && appMode === "video"} />
      {appMode === "video" && (
        <EditorSavePanel
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          autoSaveMode={autoSaveMode}
          autoSaveInterval={autoSaveInterval}
          saveLogs={saveLogs}
          onSave={handleSave}
          onAutoSaveModeChange={setAutoSaveMode}
          onAutoSaveIntervalChange={setAutoSaveInterval}
          onRestore={handleRestoreFromLog}
        />
      )}
      {appMode === "video" && (
        <EditorAIPanel
          workspaceId={selectedWorkspaceId}
          workspaceName={selectedWorkspaceName}
          playbackTime={editRef.current?.playbackTime ?? 0}
          selectedClipType={selectedClipType}
          selectedClipSrc={selectedClipSrc}
          editRef={editRef as any}
          projectId={selectedProject?.id ?? null}
          onBulkEditApplied={() => {
            setLastSavedAt(new Date());
            setSaveLogs((prev) => [...prev, { type: "auto", savedAt: new Date() }]);
          }}
          onBeforeAIApply={handleBeforeAIApply}
          onInsert={(asset, start) => {
            if (!editRef.current) return;
            editRef.current.addTrack(0, {
              clips: [clampClipSize({ asset, start, length: asset.type === "audio" ? 10 : 10 })],
            });
          }}
          getTimelineDuration={() => {
            const edit = editRef.current?.getEdit() as any;
            if (!edit) return 0;
            let maxEnd = 0;
            for (const track of edit.timeline?.tracks ?? []) {
              for (const clip of track.clips ?? []) {
                const end = (clip.start ?? 0) + (clip.length ?? 0);
                if (end > maxEnd) maxEnd = end;
              }
            }
            return maxEnd;
          }}
          bulkEditOpen={bulkEditOpen}
          onBulkEditClose={() => setBulkEditOpen(false)}
          bgmOpen={bgmOpen}
          onBgmClose={() => setBgmOpen(false)}
          onBulkEditOpen={() => setBulkEditOpen(true)}
          onBgmOpen={() => setBgmOpen(true)}
          onDecoTelopOpen={() => { setDecoTelopPosition(editRef.current?.playbackTime ?? 0); setDecoTelopOpen(true); }}
          onRegenDeco={(fileUrl) => {
            if (fileUrl) {
              const meta = loadGenMeta(fileUrl);
              if (meta?.type === "deco-telop") {
                setDecoInitialData(meta.settings as unknown as DecoSettings);
                setDecoExistingFileUrl(fileUrl);
              }
            }
            setDecoTelopPosition(editRef.current?.playbackTime ?? 0);
            setDecoTelopOpen(true);
          }}
          onRegenFile={(fileUrl) => {
            const meta = loadGenMeta(fileUrl);
            if (!meta || meta.type === "deco-telop") return;
            setRegenFileUrl(fileUrl);
            setRegenMeta(meta);
            setRegenSource("timeline");
          }}
          onImageGenerated={(_url, _meta) => {}}
          onVideoGenerated={(_url, _meta) => {}}
          onNarrationGenerated={(_url, _meta) => {}}
        />
      )}
      <EditorDecoTelopModal
        open={decoTelopOpen}
        position={decoTelopPosition}
        workspaceId={selectedWorkspaceId}
        onCaptureFrame={captureCurrentFrame}
        onClose={() => { setDecoTelopOpen(false); setDecoInitialData(undefined); setDecoExistingFileUrl(undefined); }}
        initialData={decoInitialData}
        existingFileUrl={decoExistingFileUrl}
        onInsert={(asset, start) => {
          if (!editRef.current) return;
          editRef.current.addTrack(0, {
            clips: [clampClipSize({ asset, start, length: 10 })],
          });
        }}
        onUpdate={async (asset, oldSrc) => {
          if (!editRef.current) return;
          const updated = structuredClone(editRef.current.getEdit() as any);
          let changed = false;
          for (const track of updated.timeline?.tracks ?? []) {
            for (const clip of track.clips ?? []) {
              if (clip?.asset?.src === oldSrc) {
                clip.asset.src = asset.src;
                changed = true;
              }
            }
          }
          if (changed) await editRef.current.loadEdit(updated);
        }}
      />
      {regenMeta?.type === "ai-image" && regenFileUrl && (
        <EditorRegenImageModal
          open={true}
          fileUrl={regenFileUrl}
          meta={regenMeta as GenMetaImage}
          workspaceId={selectedWorkspaceId}
          playbackTime={editRef.current?.playbackTime ?? 0}
          fromTimeline={regenSource === "timeline"}
          onClose={() => { setRegenMeta(null); setRegenFileUrl(null); setRegenSource(null); }}
          onInsert={(asset, start) => { if (!editRef.current) return; editRef.current.addTrack(0, { clips: [clampClipSize({ asset, start, length: 10 })] }); }}
          onReplace={async (newUrl) => { if (regenFileUrl) await replaceClipSrc(newUrl, regenFileUrl); setRegenMeta(null); setRegenFileUrl(null); setRegenSource(null); }}
        />
      )}
      {regenMeta?.type === "ai-video" && regenFileUrl && (
        <EditorRegenVideoModal
          open={true}
          fileUrl={regenFileUrl}
          meta={regenMeta as GenMetaVideo}
          workspaceId={selectedWorkspaceId}
          playbackTime={editRef.current?.playbackTime ?? 0}
          fromTimeline={regenSource === "timeline"}
          onClose={() => { setRegenMeta(null); setRegenFileUrl(null); setRegenSource(null); }}
          onInsert={(asset, start) => { if (!editRef.current) return; editRef.current.addTrack(0, { clips: [clampClipSize({ asset, start, length: 10 })] }); }}
          onReplace={async (newUrl) => { if (regenFileUrl) await replaceClipSrc(newUrl, regenFileUrl); setRegenMeta(null); setRegenFileUrl(null); setRegenSource(null); }}
        />
      )}
      {regenMeta?.type === "ai-narration" && regenFileUrl && (
        <EditorRegenNarrationModal
          open={true}
          fileUrl={regenFileUrl}
          meta={regenMeta as GenMetaNarration}
          workspaceId={selectedWorkspaceId}
          playbackTime={editRef.current?.playbackTime ?? 0}
          fromTimeline={regenSource === "timeline"}
          onClose={() => { setRegenMeta(null); setRegenFileUrl(null); setRegenSource(null); }}
          onInsert={(asset, start) => { if (!editRef.current) return; editRef.current.addTrack(0, { clips: [clampClipSize({ asset, start, length: 10 })] }); }}
          onReplace={async (newUrl) => { if (regenFileUrl) await replaceClipSrc(newUrl, regenFileUrl); setRegenMeta(null); setRegenFileUrl(null); setRegenSource(null); }}
        />
      )}
      <input ref={fileInputRef} type="file" accept="video/*,image/*,audio/*" style={{ display: "none" }} onChange={handleFileUploadAndInsert} />

    </>
  );
}