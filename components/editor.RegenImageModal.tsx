"use client";

import { useEffect, useState } from "react";
import { loadImageSettings } from "@/lib/imageSettings";
import { saveGenMeta } from "@/lib/gen.meta";
import type { GenMetaImage } from "@/lib/gen.meta";

const GRAD = "linear-gradient(45deg, #5184F0, #169385)";
const FONT = "'Noto Sans JP', sans-serif";

const MODEL_LABELS: Record<string, string> = {
  "google-image-lite": "Google Image Lite",
  "google-image-pro":  "Google Image Pro",
  "seedream-5-0-pro":  "Seedream 5.0 Pro",
  "reve-1":            "Reve AI",
};

type Props = {
  open: boolean;
  fileUrl: string;
  meta: GenMetaImage;
  workspaceId?: string | null;
  playbackTime: number;
  fromTimeline?: boolean;
  onClose: () => void;
  onInsert: (asset: { type: "image"; src: string }, start: number) => void;
  onReplace?: (newUrl: string) => void;
};

export default function EditorRegenImageModal({ open, fileUrl, meta, workspaceId, playbackTime, fromTimeline, onClose, onInsert, onReplace }: Props) {
  const [prompt,      setPrompt]      = useState(meta.prompt);
  const [useRefImage, setUseRefImage] = useState(true);
  const [status,      setStatus]      = useState<"idle" | "generating" | "done" | "error">("idle");
  const [errorMsg,    setErrorMsg]    = useState("");
  const [newUrl,      setNewUrl]      = useState<string | null>(null);
  const [wsRules,     setWsRules]     = useState("");
  const [wsNeg,       setWsNeg]       = useState("");

  const [imgSettings, setImgSettings] = useState(() => loadImageSettings());

  useEffect(() => {
    if (!open) return;
    setPrompt(meta.prompt);
    setUseRefImage(true);
    setStatus("idle");
    setErrorMsg("");
    setNewUrl(null);
    const s = loadImageSettings();
    setImgSettings(s);
    setWsRules(s.imgCommonRules);
    setWsNeg(s.imgNegativePrompt);
  }, [open]);

  if (!open) return null;

  const handleRegen = async () => {
    if (!prompt.trim()) { setErrorMsg("プロンプトを入力してください"); return; }
    setStatus("generating");
    setErrorMsg("");
    try {
      const res = await fetch("/api/editor/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          imageModel: meta.model,
          aspectRatio: meta.aspectRatio,
          googleAspectRatio: meta.aspectRatio,
          sdAspectRatio: meta.aspectRatio,
          gptSize: imgSettings.gptSize,
          gptQuality: imgSettings.gptQuality,
          gptBackground: imgSettings.gptBackground,
          gptCompression: imgSettings.gptCompression,
          gptModeration: imgSettings.gptModeration,
          gptOutputFormat: imgSettings.gptOutputFormat,
          imgUrl: useRefImage ? fileUrl : undefined,
          imgCommonRules: wsRules,
          imgNegativePrompt: wsNeg,
          workspaceId: workspaceId ?? undefined,
        }),
      });
      const data = await res.json() as { ok: boolean; url?: string; message?: string };
      if (!data.ok) throw new Error(data.message ?? "生成に失敗しました");
      if (data.url) {
        saveGenMeta(data.url, { type: "ai-image", prompt, model: meta.model, aspectRatio: meta.aspectRatio });
        setNewUrl(data.url);
      }
      setStatus("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "生成に失敗しました");
      setStatus("error");
    }
  };

  const handleInsert = (url: string) => { onInsert({ type: "image", src: url }, playbackTime); onClose(); };
  const handleClose = () => {
    if (status === "generating") return;
    setStatus("idle"); setErrorMsg(""); setNewUrl(null); onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.52)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }} onClick={handleClose}>
      <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: 540, maxHeight: "92vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 12px 48px rgba(0,0,0,0.22)" }} onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 17, fontWeight: 700, backgroundImage: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI 画像を再生成</span>
          <button onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#bbb", lineHeight: 1, padding: 0 }}>×</button>
        </div>

        {/* 参照画像（元画像）+ 再生成結果 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* 元画像：参照画像として使用 */}
          <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: useRefImage ? "2px solid #5184F0" : "1.5px solid #e2e8f0" }}>
            <img src={fileUrl} alt="元画像" style={{ width: "100%", display: "block" }} />
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>
                {useRefImage ? "参照画像として使用中" : "元画像（参照オフ）"}
              </span>
              <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={useRefImage}
                  onChange={e => setUseRefImage(e.target.checked)}
                  style={{ accentColor: "#5184F0", width: 14, height: 14, cursor: "pointer" }}
                />
                <span style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>参照して生成</span>
              </label>
            </div>
            {useRefImage && (
              <div style={{ position: "absolute", bottom: 8, left: 8, width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 0 2px rgba(74,222,128,0.4)" }} />
            )}
          </div>

          {/* 再生成後の新しい画像 */}
          {newUrl && (
            <div style={{ position: "relative" }}>
              <img src={newUrl} alt="新しく生成" style={{ width: "100%", borderRadius: 12, border: "1.5px solid #e2e8f0", display: "block" }} />
              <div style={{ position: "absolute", top: 8, left: 8, background: GRAD, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>新しく生成</div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => handleInsert(newUrl ?? fileUrl)} style={{ padding: "9px 0", fontSize: 13, fontWeight: 600, border: "1.5px solid #e2e8f0", borderRadius: 10, background: "#f8fafc", color: "#475569", cursor: "pointer", fontFamily: FONT }}>
            {newUrl ? "新しい画像をタイムラインに追加" : "この画像をタイムラインに追加"}
          </button>
          {fromTimeline && newUrl && (
            <button onClick={() => { onReplace?.(newUrl); onClose(); }} style={{ padding: "9px 0", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 10, background: GRAD, color: "#fff", cursor: "pointer", fontFamily: FONT }}>
              生成して差し替え
            </button>
          )}
        </div>

        <div style={{ height: 1, background: "#f1f5f9" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em" }}>生成時の設定</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge label="モデル"       value={MODEL_LABELS[meta.model] ?? meta.model} />
            <Badge label="アスペクト比" value={meta.aspectRatio} />
          </div>
          {wsRules && <InfoBlock label="共通ルール（WS設定）" value={wsRules} />}
          {wsNeg   && <InfoBlock label="NGワード（WS設定）"   value={wsNeg} />}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>プロンプト</span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>編集して再生成できます</span>
          </div>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
            style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "9px 12px", fontSize: 13, fontFamily: FONT, resize: "vertical", outline: "none", color: "#334155", lineHeight: 1.6 }} />
        </div>

        {errorMsg && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#b91c1c" }}>{errorMsg}</div>}

        <button onClick={handleRegen} disabled={status === "generating"}
          style={{ background: status === "generating" ? "#cbd5e1" : GRAD, color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontWeight: 700, fontSize: 14, cursor: status === "generating" ? "not-allowed" : "pointer", fontFamily: FONT }}>
          {status === "generating" ? "生成中…（30秒〜数分かかります）" : "再生成する"}
        </button>
      </div>
    </div>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#f1f5f9", borderRadius: 20, padding: "4px 12px" }}>
      <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, color: "#334155", fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px" }}>
      <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{value}</div>
    </div>
  );
}
