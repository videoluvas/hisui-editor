"use client";

import { useEffect, useRef, useState } from "react";
import { getPresignedUrl, getMyFiles } from "@/lib/fileupload.front";
import { TEAL } from "@/components/icons";
import { loadGenMeta } from "@/lib/gen.meta";
import type { GenMeta } from "@/lib/gen.meta";

type FileItem = {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string | null;
  sizeBytes: string | null;
  createdAt: string;
};

type Folder = { id: string; name: string; collapsed: boolean };
type FileCtxMenu   = { x: number; y: number; fileId: string };
type FolderCtxMenu = { x: number; y: number; folderId: string };
type ViewMode = "list" | "small" | "medium";

type SidePanelFilesProps = {
  selectedProjectId?: string | null;
  workspaceId?: string | null;
  onFileDoubleClick?: (fileUrl: string, meta: GenMeta | null) => void;
};

const FONT = "'Noto Sans JP', sans-serif";

// ── デフォルトフォルダ定義（安定IDで管理） ───────────────────────────────────
const DEFAULT_FOLDERS: { id: string; name: string; match: (f: FileItem) => boolean }[] = [
  { id: "sys_ai_image",     name: "AI 画像",         match: (f) => !!f.fileUrl?.includes("/editor/images/") || f.fileName.startsWith("image-") },
  { id: "sys_ai_video",     name: "AI 動画",         match: (f) => !!f.fileUrl?.includes("/editor/videos/") || f.fileName.startsWith("video-") },
  { id: "sys_ai_narration", name: "AI ナレーション", match: (f) => !!f.fileUrl?.includes("/editor/narration/") || f.fileName.startsWith("narration_") },
  { id: "sys_deco_telop",   name: "装飾テロップ",    match: (f) => f.fileName.startsWith("deco-telop-") },
];

export default function SidePanelFiles({ selectedProjectId, workspaceId, onFileDoubleClick }: SidePanelFilesProps) {
  const [files, setFiles]               = useState<FileItem[]>([]);
  const [uploading, setUploading]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [viewMode, setViewMode]         = useState<ViewMode>("small");
  const [folders, setFolders]           = useState<Folder[]>([]);
  const [fileFolder, setFileFolder]     = useState<Record<string, string>>({});
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder]   = useState(false);
  const [newFolderName, setNewFolderName]     = useState("");
  const [draggingOverFolder, setDraggingOverFolder] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId]     = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [fileCtx,   setFileCtx]   = useState<FileCtxMenu   | null>(null);
  const [folderCtx, setFolderCtx] = useState<FolderCtxMenu | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  const inputRef          = useRef<HTMLInputElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const listRef           = useRef<HTMLDivElement>(null);
  const scrollTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSelectedIdRef = useRef<string | null>(null);

  const wsKey           = workspaceId ?? "default";
  const lsFolderKey     = `hisui_folders_${wsKey}`;
  const lsFileFolderKey = `hisui_file_folder_${wsKey}`;

  // localStorage からフォルダ読み込み
  useEffect(() => {
    try {
      const f  = localStorage.getItem(lsFolderKey);
      if (f)  setFolders(JSON.parse(f));
      const ff = localStorage.getItem(lsFileFolderKey);
      if (ff) setFileFolder(JSON.parse(ff));
    } catch {}
  }, [wsKey]);

  // アンマウント時にオートスクロール停止
  useEffect(() => () => stopAutoScroll(), []);

  const saveFolders = (f: Folder[]) => {
    setFolders(f);
    try { localStorage.setItem(lsFolderKey, JSON.stringify(f)); } catch {}
  };

  const saveFileFolder = (ff: Record<string, string>) => {
    setFileFolder(ff);
    try { localStorage.setItem(lsFileFolderKey, JSON.stringify(ff)); } catch {}
  };

  // ファイル取得 + デフォルトフォルダへ自動振り分け
  const fetchFiles = async () => {
    const res = await getMyFiles(selectedProjectId ?? undefined, workspaceId);
    if (!res.ok) return;
    setFiles(res.files);

    // localStorage から最新値を直接読んで stale closure を回避
    let curFolders: Folder[] = [];
    let curFileFolder: Record<string, string> = {};
    try { curFolders    = JSON.parse(localStorage.getItem(lsFolderKey)     ?? "[]"); } catch {}
    try { curFileFolder = JSON.parse(localStorage.getItem(lsFileFolderKey) ?? "{}"); } catch {}

    let nextFolders    = [...curFolders];
    let nextFileFolder = { ...curFileFolder };
    let foldersDirty    = false;
    let fileFolderDirty = false;

    for (const file of res.files) {
      if (nextFileFolder[file.id]) continue; // 既に振り分け済み
      const cfg = DEFAULT_FOLDERS.find((d) => d.match(file));
      if (!cfg) continue;
      if (!nextFolders.find((f) => f.id === cfg.id)) {
        nextFolders = [...nextFolders, { id: cfg.id, name: cfg.name, collapsed: false }];
        foldersDirty = true;
      }
      nextFileFolder[file.id] = cfg.id;
      fileFolderDirty = true;
    }

    if (foldersDirty)    saveFolders(nextFolders);
    if (fileFolderDirty) saveFileFolder(nextFileFolder);
  };
  useEffect(() => { fetchFiles(); }, [selectedProjectId, workspaceId]);

  // コンテキストメニューをクリックで閉じる・選択解除
  useEffect(() => {
    const close = () => { setFileCtx(null); setFolderCtx(null); };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // ── 表示するアイテム（ハンドラより先に確定させる）──────────────────────────
  const filesInFolder  = (fid: string) => files.filter((f) => fileFolder[f.id] === fid);
  const ungrouped      = files.filter((f) => !fileFolder[f.id]);
  const currentFolder  = currentFolderId ? folders.find((f) => f.id === currentFolderId) ?? null : null;
  const displayFiles   = currentFolderId ? filesInFolder(currentFolderId) : ungrouped;
  const displayFolders = currentFolderId ? [] : folders;

  // ── オートスクロール ──────────────────────────────────────────────────────
  const stopAutoScroll = () => {
    if (scrollTimerRef.current != null) {
      clearInterval(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }
  };

  const handleListDragOver = (e: React.DragEvent) => {
    const el = listRef.current;
    if (!el) return;
    const { top, bottom } = el.getBoundingClientRect();
    const ZONE = 52;
    const speed = 7;
    if (e.clientY < top + ZONE) {
      if (scrollTimerRef.current == null)
        scrollTimerRef.current = setInterval(() => { listRef.current && (listRef.current.scrollTop -= speed); }, 16);
    } else if (e.clientY > bottom - ZONE) {
      if (scrollTimerRef.current == null)
        scrollTimerRef.current = setInterval(() => { listRef.current && (listRef.current.scrollTop += speed); }, 16);
    } else {
      stopAutoScroll();
    }
  };

  // ── アップロード ──────────────────────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadProgress(0);
    try {
      const data = await getPresignedUrl(file, selectedProjectId ?? undefined, workspaceId);
      if (!data.ok || !data.presignedUrl) { alert(data.message ?? "アップロードURLの取得に失敗しました"); return; }
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100)); };
        xhr.onload  = () => xhr.status < 400 ? resolve() : reject();
        xhr.onerror = reject;
        xhr.open("PUT", data.presignedUrl!);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
      await fetchFiles();
    } catch { alert("アップロードに失敗しました"); }
    finally { setUploading(false); setUploadProgress(null); e.target.value = ""; }
  };

  // ── フォルダ操作 ──────────────────────────────────────────────────────────
  const confirmCreateFolder = () => {
    const name = newFolderName.trim();
    setCreatingFolder(false); setNewFolderName("");
    if (!name) return;
    saveFolders([...folders, { id: `f_${Date.now()}`, name, collapsed: false }]);
  };

  const confirmRenameFolder = (folderId: string) => {
    const name = editingFolderName.trim();
    setEditingFolderId(null); setEditingFolderName("");
    if (!name) return;
    saveFolders(folders.map((f) => f.id === folderId ? { ...f, name } : f));
  };

  const handleDeleteFolder = (folderId: string) => {
    const next = { ...fileFolder };
    for (const [fid, fld] of Object.entries(next)) { if (fld === folderId) delete next[fid]; }
    saveFileFolder(next);
    saveFolders(folders.filter((f) => f.id !== folderId));
    if (currentFolderId === folderId) setCurrentFolderId(null);
    setFolderCtx(null);
  };

  // ── ファイル移動（単体 or 複数選択） ──────────────────────────────────────
  const handleMoveToFolder = (targetFileId: string, folderId: string | null) => {
    const isBulk = selectedFileIds.has(targetFileId) && selectedFileIds.size > 1;
    const ids = isBulk ? Array.from(selectedFileIds) : [targetFileId];
    const next = { ...fileFolder };
    ids.forEach((id) => { if (folderId === null) delete next[id]; else next[id] = folderId; });
    saveFileFolder(next);
    if (isBulk) setSelectedFileIds(new Set());
    setFileCtx(null);
  };

  // ── ファイル削除（単体 or 複数選択） ──────────────────────────────────────
  const handleDeleteFile = async () => {
    if (!fileCtx) return;
    const isBulk = selectedFileIds.has(fileCtx.fileId) && selectedFileIds.size > 1;
    const ids = isBulk ? Array.from(selectedFileIds) : [fileCtx.fileId];
    await Promise.all(ids.map((id) =>
      fetch("/api/fileupload/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: id }),
      })
    ));
    await fetchFiles();
    const next = { ...fileFolder };
    ids.forEach((id) => delete next[id]);
    saveFileFolder(next);
    if (isBulk) setSelectedFileIds(new Set());
    setFileCtx(null);
  };

  // ── ドラッグ ──────────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, file: FileItem) => {
    e.dataTransfer.effectAllowed = "all";
    const ids = selectedFileIds.has(file.id) && selectedFileIds.size > 1
      ? Array.from(selectedFileIds) : [file.id];
    e.dataTransfer.setData("application/x-hisui-file-ids", JSON.stringify(ids));
    e.dataTransfer.setData("application/x-hisui-file-id", file.id);
    e.dataTransfer.setData("application/x-hisui-file",
      JSON.stringify({ id: file.id, fileName: file.fileName, fileType: file.fileType, fileUrl: file.fileUrl }));
  };

  const handleDragOverFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDraggingOverFolder(folderId);
  };

  const handleDropOnFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    stopAutoScroll();
    setDraggingOverFolder(null);
    try {
      const ids = JSON.parse(e.dataTransfer.getData("application/x-hisui-file-ids")) as string[];
      if (ids.length > 0) {
        const next = { ...fileFolder };
        ids.forEach((id) => { next[id] = folderId; });
        saveFileFolder(next);
        setSelectedFileIds(new Set());
        return;
      }
    } catch {}
    const fileId = e.dataTransfer.getData("application/x-hisui-file-id");
    if (fileId) { const next = { ...fileFolder }; next[fileId] = folderId; saveFileFolder(next); }
  };

  // ── ファイル選択クリック ──────────────────────────────────────────────────
  const handleFileClick = (e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation();
    const allIds = displayFiles.map((f) => f.id);
    if (e.metaKey || e.ctrlKey) {
      const next = new Set(selectedFileIds);
      if (next.has(file.id)) next.delete(file.id); else next.add(file.id);
      setSelectedFileIds(next);
      lastSelectedIdRef.current = file.id;
    } else if (e.shiftKey && lastSelectedIdRef.current) {
      const li = allIds.indexOf(lastSelectedIdRef.current);
      const ci = allIds.indexOf(file.id);
      if (li !== -1 && ci !== -1) {
        const [from, to] = li <= ci ? [li, ci] : [ci, li];
        setSelectedFileIds(new Set(allIds.slice(from, to + 1)));
      }
    } else {
      if (selectedFileIds.size === 1 && selectedFileIds.has(file.id)) {
        setSelectedFileIds(new Set());
        lastSelectedIdRef.current = null;
      } else {
        setSelectedFileIds(new Set([file.id]));
        lastSelectedIdRef.current = file.id;
      }
    }
  };

  useEffect(() => {
    if (creatingFolder) setTimeout(() => newFolderInputRef.current?.focus(), 30);
  }, [creatingFolder]);

  // ─── レンダリング ───────────────────────────────────────────────────────────

  const FolderIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ pointerEvents: "none", flexShrink: 0 }}>
      <path d="M2 6.5C2 5.67 2.67 5 3.5 5H9l2 2.5H20.5c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5h-17C2.67 19.5 2 18.83 2 18V6.5z" fill="#5184F0" opacity="0.18"/>
      <path d="M2 6.5C2 5.67 2.67 5 3.5 5H9l2 2.5H20.5c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5h-17C2.67 19.5 2 18.83 2 18V6.5z" stroke="#5184F0" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );

  const renderFolderCard = (folder: Folder) => {
    const count  = filesInFolder(folder.id).length;
    const isOver = draggingOverFolder === folder.id;
    const style: React.CSSProperties = {
      borderRadius: 8, background: "#f5f5f5", overflow: "hidden", cursor: "pointer",
      border: `1.5px solid ${isOver ? TEAL : "transparent"}`,
      outline: isOver ? `3px solid ${TEAL}22` : "none",
      userSelect: "none", transition: "border-color 0.1s",
    };
    const dnd = {
      onDragOver:    (e: React.DragEvent) => { handleListDragOver(e); handleDragOverFolder(e, folder.id); },
      onDragLeave:   (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDraggingOverFolder(null); },
      onDrop:        (e: React.DragEvent) => handleDropOnFolder(e, folder.id),
      onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setFileCtx(null); setFolderCtx({ x: e.clientX, y: e.clientY, folderId: folder.id }); },
      onClick:       () => { setSelectedFileIds(new Set()); setCurrentFolderId(folder.id); },
    };
    if (viewMode === "list") {
      return (
        <div key={folder.id} {...dnd} style={{ ...style, display: "flex", alignItems: "center", gap: 8, padding: "6px 8px" }}>
          <FolderIcon size={16} />
          <span style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600, color: "#334155", fontFamily: FONT, pointerEvents: "none" }}>{folder.name}</span>
          <span style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0, pointerEvents: "none" }}>{count}</span>
        </div>
      );
    }
    return (
      <div key={folder.id} {...dnd} style={style}>
        <div style={{ width: "100%", aspectRatio: "16/9", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <FolderIcon size={viewMode === "medium" ? 40 : 28} />
        </div>
        <div style={{ padding: "4px 6px 1px", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#334155", fontWeight: 600, fontFamily: FONT, pointerEvents: "none" }}>{folder.name}</div>
        <div style={{ padding: "0 6px 5px", fontSize: 10, color: "#94a3b8", fontFamily: FONT, pointerEvents: "none" }}>{count}件</div>
      </div>
    );
  };

  const AudioIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ pointerEvents: "none" }}>
      <rect x="3" y="10" width="4" height="8" rx="1.5" fill="#5184F0" opacity="0.7"/>
      <rect x="10" y="5" width="4" height="13" rx="1.5" fill="#169385" opacity="0.85"/>
      <rect x="17" y="7" width="4" height="11" rx="1.5" fill="#5184F0" opacity="0.55"/>
    </svg>
  );

  const VideoThumbIcon = () => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ pointerEvents: "none" }}>
      <rect x="2" y="5" width="14" height="14" rx="2" fill="#169385" opacity="0.2"/>
      <rect x="2" y="5" width="14" height="14" rx="2" stroke="#169385" strokeWidth="1.5"/>
      <path d="M16 9.5l5-3v11l-5-3V9.5z" fill="#169385" opacity="0.7"/>
      <path d="M8 9.5l3 2.5-3 2.5V9.5z" fill="#169385"/>
    </svg>
  );

  const ImageThumbIcon = () => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ pointerEvents: "none" }}>
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#5184F0" opacity="0.12"/>
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="#5184F0" strokeWidth="1.5"/>
      <circle cx="8" cy="9" r="2" fill="#5184F0" opacity="0.6"/>
      <path d="M2 17l5-5 4 4 3-3 6 4H2z" fill="#5184F0" opacity="0.35"/>
    </svg>
  );

  const renderFileCard = (file: FileItem) => {
    const isSelected = selectedFileIds.has(file.id);
    const thumbnail =
      file.fileType === "video" && file.fileUrl ? (
        <video src={file.fileUrl} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block", background: "#000" }}
          preload="metadata" muted
          onMouseMove={(e) => { const v = e.currentTarget; if (!v.duration) return; const r = v.getBoundingClientRect(); v.currentTime = ((e.clientX - r.left) / r.width) * v.duration; }}
          onMouseLeave={(e) => { e.currentTarget.currentTime = 0; }} />
      ) : file.fileType === "image" && file.fileUrl ? (
        <img src={file.fileUrl} alt={file.fileName} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ width: "100%", aspectRatio: "16/9", background: "linear-gradient(135deg, #eef3ff 0%, #e8f6f4 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AudioIcon size={viewMode === "medium" ? 32 : 22} />
        </div>
      );

    const commonProps = {
      draggable: true,
      onDragStart:   (e: React.DragEvent) => handleDragStart(e, file),
      onDragEnd:     () => stopAutoScroll(),
      onClick:       (e: React.MouseEvent) => handleFileClick(e, file),
      onDoubleClick: (e: React.MouseEvent) => { e.stopPropagation(); if (file.fileUrl) { const m = loadGenMeta(file.fileUrl); onFileDoubleClick?.(file.fileUrl, m); } },
      onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setFolderCtx(null); setFileCtx({ x: e.clientX, y: e.clientY, fileId: file.id }); },
    };

    if (viewMode === "list") {
      return (
        <div key={file.id} {...commonProps}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: isSelected ? "#f0fdfc" : "#f5f5f5", border: `1.5px solid ${isSelected ? TEAL : "transparent"}`, cursor: "grab" }}
        >
          <span style={{ pointerEvents: "none", display: "flex", alignItems: "center", flexShrink: 0 }}>
            {file.fileType === "video" ? <VideoThumbIcon /> : file.fileType === "image" ? <ImageThumbIcon /> : <AudioIcon size={16} />}
          </span>
          <span style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: FONT, pointerEvents: "none" }}>{file.fileName}</span>
        </div>
      );
    }
    return (
      <div key={file.id} {...commonProps}
        style={{ borderRadius: 8, background: isSelected ? "#f0fdfc" : "#f5f5f5", border: `1.5px solid ${isSelected ? TEAL : "transparent"}`, overflow: "hidden", cursor: "grab", position: "relative" }}
      >
        {thumbnail}
        <div style={{ padding: "4px 6px", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#333", fontFamily: FONT, pointerEvents: "none" }}>{file.fileName}</div>
      </div>
    );
  };

  const renderGrid = (folderItems: Folder[], fileItems: FileItem[]) => (
    <div style={{ display: viewMode === "list" ? "flex" : "grid", gridTemplateColumns: viewMode === "small" ? "1fr 1fr" : undefined, flexDirection: viewMode === "list" ? "column" : undefined, gap: 6 }}>
      {folderItems.map(renderFolderCard)}
      {fileItems.map(renderFileCard)}
    </div>
  );

  const isEmpty = displayFolders.length === 0 && displayFiles.length === 0 && !creatingFolder;
  const selCount = selectedFileIds.size;
  const isBulkCtx = fileCtx !== null && selectedFileIds.has(fileCtx.fileId) && selCount > 1;

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 8 }}
      onClick={() => setSelectedFileIds(new Set())}
    >
      {/* アップロードボタン */}
      <button onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }} disabled={uploading}
        style={{ width: "100%", padding: "8px 0", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "1px solid #e2e8f0",
          background: uploading ? `linear-gradient(to right, #e2e8f033 ${uploadProgress ?? 0}%, #f8fafd ${uploadProgress ?? 0}%)` : "#f8fafd",
          color: uploading ? "#94a3b8" : "#334155", cursor: uploading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: FONT, transition: "background 0.1s ease", flexShrink: 0 }}
      >
        {uploading ? `アップロード中... ${uploadProgress ?? 0}%` : (
          <><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>ファイルを追加</>
        )}
      </button>
      <input ref={inputRef} type="file" accept="video/*,image/*,audio/*" style={{ display: "none" }} onChange={handleUpload} />

      {/* フォルダ内パンくず */}
      {currentFolder && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, padding: "2px 0" }}>
          <button onClick={(e) => { e.stopPropagation(); setCurrentFolderId(null); setSelectedFileIds(new Set()); }}
            style={{ border: "none", background: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 6, color: TEAL, fontSize: 20, lineHeight: 1 }} title="戻る">‹</button>
          <FolderIcon size={16} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{currentFolder.name}</span>
        </div>
      )}

      {/* 複数選択バー */}
      {selCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: "#f0fdfc", borderRadius: 8, border: `1px solid ${TEAL}44`, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <span style={{ fontSize: 11, color: TEAL, fontFamily: FONT, flex: 1 }}>{selCount}件選択中</span>
          <button onClick={() => setSelectedFileIds(new Set())}
            style={{ border: "none", background: "none", cursor: "pointer", fontSize: 11, color: "#94a3b8", fontFamily: FONT }}>解除</button>
        </div>
      )}

      {/* ファイル・フォルダ一覧 */}
      <div
        ref={listRef}
        onDragOver={handleListDragOver}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) stopAutoScroll(); }}
        onDrop={() => stopAutoScroll()}
        style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 新規フォルダ入力 */}
        {creatingFolder && !currentFolderId && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 6px", border: `1.5px solid ${TEAL}`, borderRadius: 8, background: "#f0fdfc" }}>
            <FolderIcon size={16} />
            <input ref={newFolderInputRef} value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmCreateFolder(); if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName(""); } }}
              placeholder="フォルダ名を入力..."
              style={{ flex: 1, border: "none", outline: "none", fontSize: 12, background: "transparent", fontFamily: FONT, color: "#334155" }} />
            <button onClick={confirmCreateFolder} style={{ border: "none", background: "none", cursor: "pointer", color: TEAL, fontSize: 14, padding: 2 }}>✓</button>
            <button onClick={() => { setCreatingFolder(false); setNewFolderName(""); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, padding: 2 }}>✕</button>
          </div>
        )}

        {isEmpty ? (
          <div style={{ fontSize: 12, color: "#aaa", textAlign: "center", marginTop: 24, fontFamily: FONT }}>
            {currentFolder ? "このフォルダにはファイルがありません" : "ファイルがありません"}
          </div>
        ) : renderGrid(displayFolders, displayFiles)}
      </div>

      {/* 表示切り替え ＋ 新規フォルダ */}
      <div style={{ display: "flex", alignItems: "center", padding: "6px 0 2px", borderTop: "1px solid #f1f5f9", flexShrink: 0, gap: 4 }} onClick={(e) => e.stopPropagation()}>
        {(["list", "small", "medium"] as ViewMode[]).map((m) => (
          <button key={m} onClick={() => setViewMode(m)} title={m === "list" ? "リスト" : m === "small" ? "小サムネイル" : "中サムネイル"}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: viewMode === m ? TEAL : "#aaa" }}>
            {m === "list" ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="4" y1="4" x2="14" y2="4"/><line x1="4" y1="8" x2="14" y2="8"/><line x1="4" y1="12" x2="14" y2="12"/>
                <rect x="1" y="3" width="2" height="2" rx="0.5" fill="currentColor" stroke="none"/>
                <rect x="1" y="7" width="2" height="2" rx="0.5" fill="currentColor" stroke="none"/>
                <rect x="1" y="11" width="2" height="2" rx="0.5" fill="currentColor" stroke="none"/>
              </svg>
            ) : m === "small" ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
                <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="1" y="1" width="14" height="6" rx="1"/><rect x="1" y="9" width="14" height="6" rx="1"/>
              </svg>
            )}
          </button>
        ))}
        {!currentFolderId && (
          <button onClick={() => setCreatingFolder(true)} title="新規フォルダを作成"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: creatingFolder ? TEAL : "#aaa" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = TEAL; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = creatingFolder ? TEAL : "#aaa"; }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4.5C1 3.67 1.67 3 2.5 3H6l1.5 2H13.5C14.33 5 15 5.67 15 6.5v6c0 .83-.67 1.5-1.5 1.5h-11C1.67 14 1 13.33 1 12.5V4.5z"/>
              <line x1="8" y1="8" x2="8" y2="12"/><line x1="6" y1="10" x2="10" y2="10"/>
            </svg>
          </button>
        )}
      </div>

      {/* ファイル右クリックメニュー */}
      {fileCtx && (
        <div style={{ position: "fixed", top: fileCtx.y, left: fileCtx.x, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 1000, overflow: "hidden", minWidth: 160 }}
          onClick={(e) => e.stopPropagation()}>
          {folders.length > 0 && (
            <>
              <div style={{ padding: "6px 12px 2px", fontSize: 10, color: "#94a3b8", fontFamily: FONT, letterSpacing: "0.05em" }}>
                {isBulkCtx ? `${selCount}件をフォルダに移動` : "フォルダに移動"}
              </div>
              {folders.map((folder) => (
                <button key={folder.id} onClick={() => handleMoveToFolder(fileCtx.fileId, folder.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "7px 12px", fontSize: 12, border: "none", background: !isBulkCtx && fileFolder[fileCtx.fileId] === folder.id ? "#f0fdfc" : "none", color: !isBulkCtx && fileFolder[fileCtx.fileId] === folder.id ? TEAL : "#334155", cursor: "pointer", textAlign: "left", fontFamily: FONT }}
                  onMouseEnter={(e) => { if (isBulkCtx || fileFolder[fileCtx.fileId] !== folder.id) (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = !isBulkCtx && fileFolder[fileCtx.fileId] === folder.id ? "#f0fdfc" : "none"; }}>
                  <FolderIcon size={14} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{folder.name}</span>
                  {!isBulkCtx && fileFolder[fileCtx.fileId] === folder.id && <span style={{ fontSize: 11 }}>✓</span>}
                </button>
              ))}
              {!isBulkCtx && fileFolder[fileCtx.fileId] && (
                <button onClick={() => handleMoveToFolder(fileCtx.fileId, null)}
                  style={{ display: "block", width: "100%", padding: "7px 12px", fontSize: 12, border: "none", background: "none", color: "#64748b", cursor: "pointer", textAlign: "left", fontFamily: FONT }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}>フォルダから外す</button>
              )}
              <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0" }} />
            </>
          )}
          <button onClick={handleDeleteFile}
            style={{ display: "block", width: "100%", padding: "8px 12px", fontSize: 12, border: "none", background: "none", color: "#e53935", cursor: "pointer", textAlign: "left", fontFamily: FONT }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fff5f5"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}>
            {isBulkCtx ? `${selCount}件を削除` : "削除"}
          </button>
        </div>
      )}

      {/* フォルダ右クリックメニュー */}
      {folderCtx && (
        <div style={{ position: "fixed", top: folderCtx.y, left: folderCtx.x, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 1000, overflow: "hidden", minWidth: 140 }}
          onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { const f = folders.find((x) => x.id === folderCtx.folderId); if (f) { setEditingFolderId(f.id); setEditingFolderName(f.name); } setFolderCtx(null); }}
            style={{ display: "block", width: "100%", padding: "8px 12px", fontSize: 12, border: "none", background: "none", color: "#334155", cursor: "pointer", textAlign: "left", fontFamily: FONT }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}>名前を変更</button>
          <div style={{ height: 1, background: "#f1f5f9" }} />
          <button onClick={() => { const f = folders.find((x) => x.id === folderCtx.folderId); if (f && confirm(`フォルダ「${f.name}」を削除しますか？\n（中のファイルはフォルダから外れますが、削除はされません）`)) handleDeleteFolder(folderCtx.folderId); else setFolderCtx(null); }}
            style={{ display: "block", width: "100%", padding: "8px 12px", fontSize: 12, border: "none", background: "none", color: "#e53935", cursor: "pointer", textAlign: "left", fontFamily: FONT }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fff5f5"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}>削除</button>
        </div>
      )}

      {/* フォルダ名変更ダイアログ */}
      {editingFolderId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setEditingFolderId(null)}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, minWidth: 260, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#334155", fontFamily: FONT, marginBottom: 12 }}>フォルダ名を変更</div>
            <input autoFocus value={editingFolderName}
              onChange={(e) => setEditingFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmRenameFolder(editingFolderId); if (e.key === "Escape") setEditingFolderId(null); }}
              style={{ width: "100%", padding: "8px 10px", border: `1.5px solid ${TEAL}`, borderRadius: 8, fontSize: 13, fontFamily: FONT, outline: "none", boxSizing: "border-box", color: "#334155" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setEditingFolderId(null)}
                style={{ padding: "6px 14px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafd", cursor: "pointer", fontFamily: FONT, color: "#64748b" }}>キャンセル</button>
              <button onClick={() => confirmRenameFolder(editingFolderId)}
                style={{ padding: "6px 14px", fontSize: 12, border: "none", borderRadius: 8, background: TEAL, cursor: "pointer", fontFamily: FONT, color: "#fff" }}>変更</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
