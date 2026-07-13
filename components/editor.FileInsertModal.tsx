"use client";

import { TEAL } from "@/components/icons";

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
};

type Props = {
  fileModal: FileModalState & { mode?: "insert" | "replace" };
  onClose: () => void;
  onBack: () => void;
  onSelectFromUploaded: () => void;
  onUploadClick: () => void;
  onInsertFile: (file: FileItem, position: number) => void;
  onReplaceFile?: (file: FileItem) => void;
};

export default function EditorFileInsertModal({
  fileModal,
  onClose,
  onBack,
  onSelectFromUploaded,
  onUploadClick,
  onInsertFile,
  onReplaceFile,
}: Props) {
  const isReplace = fileModal.mode === "replace";
  if (!fileModal.open) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 16, padding: 24, width: 400, maxHeight: 540, display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {fileModal.view === "list" && !fileModal.uploading && (
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#666", padding: "2px 0", marginRight: 8 }}>
              ← 戻る
            </button>
          )}
          <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{isReplace ? "ファイルを差し替え" : "ファイルを挿入"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#bbb", lineHeight: 1, padding: 0 }}>×</button>
        </div>

        {fileModal.view === "choice" && !fileModal.uploading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={onSelectFromUploaded}
              style={{ padding: "16px 18px", fontSize: 14, border: `1.5px solid ${TEAL}`, borderRadius: 10, background: `${TEAL}11`, color: TEAL, cursor: "pointer", fontWeight: 600, textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3H6l1.5 2H13A1.5 1.5 0 0 1 14.5 6.5v5A1.5 1.5 0 0 1 13 13H3.5A1.5 1.5 0 0 1 2 11.5V4.5z"/>
              </svg>
              アップロード済みのファイルから選択
            </button>
            <button
              onClick={onUploadClick}
              style={{ padding: "16px 18px", fontSize: 14, border: "1.5px solid #e0e0e0", borderRadius: 10, background: "#fafafa", color: "#333", cursor: "pointer", fontWeight: 600, textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2v8M5 5l3-3 3 3"/>
                <path d="M2 11v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1"/>
              </svg>
              ファイルをアップロード
            </button>
          </div>
        )}

        {fileModal.uploading && (
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>アップロード中... {fileModal.uploadProgress ?? 0}%</div>
            <div style={{ background: "#f0f0f0", borderRadius: 99, height: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${fileModal.uploadProgress ?? 0}%`, background: TEAL, borderRadius: 99, transition: "width 0.1s ease" }} />
            </div>
          </div>
        )}

        {fileModal.view === "list" && !fileModal.uploading && (
          <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 380 }}>
            {fileModal.files.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "#aaa", padding: "32px 0", fontSize: 13 }}>ファイルがありません</div>
            ) : (
              fileModal.files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => isReplace ? onReplaceFile?.(file) : onInsertFile(file, fileModal.position)}
                  style={{ borderRadius: 8, background: "#f5f5f5", overflow: "hidden", cursor: "pointer", border: "2px solid transparent", transition: "border-color 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = TEAL)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
                >
                  {file.fileType === "video" && file.fileUrl ? (
                    <video src={file.fileUrl} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block", background: "#000" }} preload="metadata" muted />
                  ) : file.fileType === "image" && file.fileUrl ? (
                    <img src={file.fileUrl} alt={file.fileName} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ width: "100%", aspectRatio: "16/9", background: "#e0e0e0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>♪</div>
                  )}
                  <div style={{ padding: "4px 6px", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#333" }}>{file.fileName}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}