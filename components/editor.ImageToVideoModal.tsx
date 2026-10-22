"use client";

import { useEffect, useRef, useState } from "react";
import { loadVideoSettings } from "@/lib/videoSettings";
import { videoTimeEstimate } from "@/lib/genTimeEstimate";
import { saveGenMeta } from "@/lib/gen.meta";

const GRAD = "linear-gradient(45deg, #5184F0, #169385)";
const FONT = "'Noto Sans JP', sans-serif";

type Props = {
  open: boolean;
  imageUrl: string;
  ratio: string;            // 元画像に近い比率（Veo は 16:9 / 9:16 に寄せる）
  workspaceId?: string | null;
  onClose: () => void;
  onReplace: (videoUrl: string) => void;
  onOpenSettings?: () => void;
};

export default function EditorImageToVideoModal({ open, imageUrl, ratio, workspaceId, onClose, onReplace, onOpenSettings }: Props) {
  const [prompt,   setPrompt]   = useState("");
  const [status,   setStatus]   = useState<"idle" | "polling" | "done" | "error">("idle");
  const [pollMsg,  setPollMsg]  = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState(() => loadVideoSettings());
  const aborted = useRef(false);

  useEffect(() => {
    if (!open) return;
    setPrompt(""); setStatus("idle"); setErrorMsg(""); setVideoUrl(null);
    setSettings(loadVideoSettings());
  }, [open]);

  if (!open) return null;

  const model = settings.videoModel;
  const isVeo = model === "veo-3" || model === "veo-3-lite";
  const sendRatio = isVeo ? (ratio === "9:16" || ratio === "3:4" ? "9:16" : "16:9") : model === "seedance-1-5-pro" ? "adaptive" : ratio;

  const handleGenerate = async () => {
    if (!prompt.trim()) { setErrorMsg("どう動かすかを入力してください"); return; }
    setStatus("polling"); setErrorMsg(""); setPollMsg("動画生成タスクを送信中...");
    aborted.current = false;
    try {
      const res = await fetch("/api/editor/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt, videoModel: model, ratio: sendRatio, duration: settings.duration, resolution: settings.resolution,
          generateAudio: settings.generateAudio, cameraFixed: settings.cameraFixed,
          vidCommonRules: settings.vidCommonRules, vidNegativePrompt: settings.vidNegativePrompt,
          firstFrameUrl: imageUrl, workspaceId: workspaceId ?? undefined,
        }),
      });
      const data = await res.json() as { ok: boolean; taskId?: string; provider?: string; message?: string };
      if (!data.ok || !data.taskId) throw new Error(data.message ?? "タスク送信に失敗しました");
      setPollMsg(`生成中（完了まで${videoTimeEstimate(model)}かかる場合があります）...`);

      for (let i = 0; i < 180; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        if (aborted.current) return;
        const sr = await fetch(`/api/editor/generate-video/status?taskId=${encodeURIComponent(data.taskId)}&provider=${encodeURIComponent(data.provider ?? "seedance")}${workspaceId ? `&workspaceId=${encodeURIComponent(workspaceId)}` : ""}`);
        const sd = await sr.json() as { ok: boolean; status?: string; videoUrl?: string; message?: string };
        if (sd.status === "succeeded" && sd.videoUrl) {
          saveGenMeta(sd.videoUrl, { type: "ai-video", prompt, model, ratio: sendRatio, duration: settings.duration, refImageUrl: imageUrl });
          setVideoUrl(sd.videoUrl); setStatus("done");
          return;
        }
        if (!sd.ok || sd.status === "failed" || sd.status === "expired") throw new Error(sd.message ?? "動画生成に失敗しました");
        setPollMsg(`生成中（${(i + 1) * 5}秒経過）...`);
      }
      throw new Error("タイムアウト（15分以上経過）。再試行してください");
    } catch (e) {
      if (!aborted.current) { setErrorMsg(e instanceof Error ? e.message : "生成に失敗しました"); setStatus("error"); }
    }
  };

  const handleClose = () => { if (status === "polling") aborted.current = true; onClose(); };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.52)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }} onClick={handleClose}>
      <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: 540, maxHeight: "92vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 12px 48px rgba(0,0,0,0.22)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 17, fontWeight: 700, backgroundImage: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>画像から動画を生成</span>
          <button onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#bbb", lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ position: "relative" }}>
          <img src={imageUrl} alt="最初のフレーム" style={{ width: "100%", borderRadius: 12, border: "1px solid #e2e8f0", display: "block" }} />
          <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(15,23,42,0.7)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>最初のフレーム</div>
        </div>

        {videoUrl && (
          <div style={{ position: "relative", background: "#000", borderRadius: 12, overflow: "hidden" }}>
            <video src={videoUrl} controls style={{ width: "100%", display: "block", maxHeight: 240 }} />
            <div style={{ position: "absolute", top: 8, left: 8, background: GRAD, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>生成した動画</div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Badge label="モデル" value={model} />
          <Badge label="尺" value={settings.duration === -1 ? "自動" : `${settings.duration}秒`} />
          <Badge label="解像度" value={settings.resolution} />
          {onOpenSettings && (
            <button onClick={onOpenSettings} style={{ fontSize: 11, fontWeight: 600, color: "#5184F0", background: "none", border: "1px solid #5184F055", borderRadius: 6, cursor: "pointer", padding: "3px 8px", fontFamily: FONT }}>
              動画の設定を変更
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>どう動かすか</span>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} placeholder="例：カメラがゆっくり寄っていき、背景の雲が流れる"
            style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "9px 12px", fontSize: 13, fontFamily: FONT, resize: "vertical", outline: "none", color: "#334155", lineHeight: 1.6 }} />
        </div>

        {errorMsg && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#b91c1c" }}>{errorMsg}</div>}
        {status === "polling" && (
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#0369a1" }}>⏳ {pollMsg}</div>
        )}

        {status === "done" && videoUrl ? (
          <button onClick={() => { onReplace(videoUrl); onClose(); }}
            style={{ background: GRAD, color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: FONT }}>
            この動画に差し替え
          </button>
        ) : (
          <button onClick={handleGenerate} disabled={status === "polling"}
            style={{ background: status === "polling" ? "#cbd5e1" : GRAD, color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontWeight: 700, fontSize: 14, cursor: status === "polling" ? "not-allowed" : "pointer", fontFamily: FONT }}>
            {status === "polling" ? "生成中…" : "動画を生成する"}
          </button>
        )}
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
