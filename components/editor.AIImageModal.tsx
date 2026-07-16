"use client";

import { useEffect, useState } from "react";
import { loadImageSettings } from "@/lib/imageSettings";
import { saveGenMeta } from "@/lib/gen.meta";
import type { GenMetaImage } from "@/lib/gen.meta";

const GRAD = "linear-gradient(45deg, #5184F0, #169385)";
const FONT = "'Noto Sans JP', sans-serif";

const IMAGE_MODELS = [
  { value: "google-image-lite", label: "Google Image Lite（推奨）" },
  { value: "google-image-pro",  label: "Google Image Pro" },
  { value: "seedream-5-0-pro",  label: "Seedream 5.0 Pro" },
  { value: "reve-1",            label: "Reve AI" },
] as const;

const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4"] as const;

type Props = {
  open: boolean;
  workspaceId?: string | null;
  playbackTime: number;
  onClose: () => void;
  onInsert: (asset: { type: "image"; src: string }, start: number) => void;
  onOpenSettings?: () => void;
  initialData?: GenMetaImage;
  onGenerated?: (fileUrl: string, meta: GenMetaImage) => void;
};

export default function EditorAIImageModal({ open, workspaceId, playbackTime, onClose, onInsert, onOpenSettings, initialData, onGenerated }: Props) {
  const [prompt,            setPrompt]            = useState("");
  const [model,             setModel]             = useState<string>("google-image-lite");
  const [aspectRatio,       setAspectRatio]       = useState("16:9");
  const [imgCommonRules,    setImgCommonRules]    = useState("");
  const [imgNegativePrompt, setImgNegativePrompt] = useState("");
  const [status,            setStatus]            = useState<"idle" | "generating" | "done" | "error">("idle");
  const [errorMsg,          setErrorMsg]          = useState("");
  const [imageUrl,          setImageUrl]          = useState<string | null>(null);

  const [imgSettings, setImgSettings] = useState(() => loadImageSettings());

  useEffect(() => {
    if (!open) return;
    const s = loadImageSettings();
    setImgSettings(s);
    setImgCommonRules(s.imgCommonRules);
    setImgNegativePrompt(s.imgNegativePrompt);
    if (initialData) {
      setPrompt(initialData.prompt);
      setModel(initialData.model);
      setAspectRatio(initialData.aspectRatio);
    } else {
      setModel(s.imageModel);
      setAspectRatio(
        s.imageModel === "reve-1"          ? s.aspectRatio
        : s.imageModel === "seedream-5-0-pro" ? s.sdAspectRatio
        : s.googleAspectRatio
      );
    }
  }, [open]);

  if (!open) return null;

  const hasWsRules = !!(imgCommonRules.trim() || imgNegativePrompt.trim());

  const handleGenerate = async () => {
    if (!prompt.trim()) { setErrorMsg("プロンプトを入力してください"); return; }
    setStatus("generating");
    setErrorMsg("");
    setImageUrl(null);
    try {
      const res = await fetch("/api/editor/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          imageModel: model,
          aspectRatio,
          googleAspectRatio: aspectRatio,
          sdAspectRatio: aspectRatio,
          googleImageSize: imgSettings.googleImageSize,
          googleThinkingLevel: imgSettings.googleThinkingLevel,
          gptSize: imgSettings.gptSize,
          gptQuality: imgSettings.gptQuality,
          gptBackground: imgSettings.gptBackground,
          gptCompression: imgSettings.gptCompression,
          gptModeration: imgSettings.gptModeration,
          gptOutputFormat: imgSettings.gptOutputFormat,
          imgCommonRules,
          imgNegativePrompt,
          workspaceId: workspaceId ?? undefined,
        }),
      });
      const data = await res.json() as { ok: boolean; url?: string; message?: string };
      if (!data.ok) throw new Error(data.message ?? "生成に失敗しました");
      setImageUrl(data.url ?? null);
      setStatus("done");
      if (data.url) {
        const meta: GenMetaImage = { type: "ai-image", prompt, model, aspectRatio };
        saveGenMeta(data.url, meta);
        onGenerated?.(data.url, meta);
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "生成に失敗しました");
      setStatus("error");
    }
  };

  const handleInsert = () => {
    if (imageUrl) { onInsert({ type: "image", src: imageUrl }, playbackTime); onClose(); }
  };

  const handleClose = () => {
    if (status === "generating") return;
    setStatus("idle"); setErrorMsg(""); setImageUrl(null); onClose();
  };

  const handleRetry = () => { setStatus("idle"); setErrorMsg(""); setImageUrl(null); };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.52)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}
      onClick={handleClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 18, padding: 28, width: 500, maxHeight: "88vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18, boxShadow: "0 12px 48px rgba(0,0,0,0.22)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 18, fontWeight: 700, backgroundImage: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI画像を生成</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                title="ワークスペース設定（画像）を開く"
                style={{ background: "none", border: "1.5px solid #e2e8f0", borderRadius: 8, cursor: "pointer", padding: "4px 8px", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#64748b", fontFamily: FONT }}
              >
                <GearIcon /> 設定
              </button>
            )}
            <button onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#bbb", lineHeight: 1, padding: 0 }}>×</button>
          </div>
        </div>

        {/* ワークスペース設定バッジ */}
        {hasWsRules && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "#15803d" }}>
            <span>✓</span>
            <span>ワークスペース設定（共通ルール・NG）を適用中</span>
            {onOpenSettings && (
              <button onClick={onOpenSettings} style={{ marginLeft: "auto", fontSize: 11, color: "#15803d", fontWeight: 600, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>変更</button>
            )}
          </div>
        )}

        {/* Aspect ratio */}
        <Section label="アスペクト比">
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {ASPECT_RATIOS.map((ar) => (
              <ToggleChip key={ar} label={ar} active={aspectRatio === ar} onClick={() => setAspectRatio(ar)} />
            ))}
          </div>
        </Section>

        {/* Prompt */}
        <Section label="プロンプト" sub="生成したい画像を日本語または英語で説明してください">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例：東京のビル群を背景に、スーツを着たビジネスマンが颯爽と歩いているシーン"
            rows={4}
            style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "9px 12px", fontSize: 13, fontFamily: FONT, resize: "vertical", outline: "none", color: "#334155", lineHeight: 1.6 }}
          />
        </Section>

        {/* Error */}
        {errorMsg && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#b91c1c" }}>
            {errorMsg}
          </div>
        )}

        {/* Preview */}
        {status === "done" && imageUrl && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <img src={imageUrl} alt="Generated" style={{ width: "100%", borderRadius: 10, border: "1px solid #e2e8f0", display: "block" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleRetry}
                style={{ flex: 1, padding: "11px 0", fontSize: 13, fontWeight: 600, border: "1.5px solid #e2e8f0", borderRadius: 10, background: "#f8fafc", color: "#475569", cursor: "pointer", fontFamily: FONT }}
              >
                再生成
              </button>
              <button
                onClick={handleInsert}
                style={{ flex: 2, padding: "11px 0", fontSize: 14, fontWeight: 700, border: "none", borderRadius: 10, background: GRAD, color: "#fff", cursor: "pointer", fontFamily: FONT }}
              >
                タイムラインに追加
              </button>
            </div>
          </div>
        )}

        {/* Generate button */}
        {status !== "done" && (
          <button
            onClick={handleGenerate}
            disabled={status === "generating"}
            style={{ background: status === "generating" ? "#cbd5e1" : GRAD, color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontWeight: 700, fontSize: 14, cursor: status === "generating" ? "not-allowed" : "pointer", fontFamily: FONT, transition: "background 0.2s" }}
          >
            {status === "generating" ? "生成中…（30秒〜数分かかります）" : "AI画像を生成"}
          </button>
        )}
      </div>
    </div>
  );
}

function GearIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.34.07-.68.07-1.08s-.03-.74-.07-1.08l2.32-1.84c.21-.16.27-.47.12-.7l-2.2-3.82c-.14-.23-.44-.3-.67-.23l-2.73 1.1c-.57-.44-1.18-.81-1.85-1.08L14.09 2H9.91L9.5 4.83C8.83 5.1 8.22 5.47 7.65 5.91L4.92 4.81c-.23-.07-.53 0-.67.23L2.05 8.86c-.14.23-.08.54.12.7l2.32 1.84C4.03 11.26 4 11.6 4 12s.03.74.07 1.08l-2.32 1.84c-.21.16-.27.47-.12.7l2.2 3.82c.14.23.44.3.67.23l2.73-1.1c.57.44 1.18.81 1.85 1.08L9.91 22h4.18l.41-2.83c.67-.27 1.28-.64 1.85-1.08l2.73 1.1c.23.07.53 0 .67-.23l2.2-3.82c.14-.23.08-.54-.12-.7l-2.32-1.84Z"/>
    </svg>
  );
}

function Section({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{label}</span>
        {sub && <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}>{sub}</span>}
      </div>
      {children}
    </div>
  );
}

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ border: active ? "none" : "1.5px solid #e2e8f0", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: active ? 700 : 400, fontFamily: FONT, cursor: "pointer", background: active ? GRAD : "#f8fafc", color: active ? "#fff" : "#475569", transition: "all 0.15s" }}
    >
      {label}
    </button>
  );
}
