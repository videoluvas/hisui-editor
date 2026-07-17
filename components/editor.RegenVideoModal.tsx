"use client";

import { useEffect, useRef, useState } from "react";
import { loadVideoSettings } from "@/lib/videoSettings";
import { videoTimeEstimate } from "@/lib/genTimeEstimate";
import { saveGenMeta } from "@/lib/gen.meta";
import type { GenMetaVideo } from "@/lib/gen.meta";

const GRAD = "linear-gradient(45deg, #5184F0, #169385)";
const FONT = "'Noto Sans JP', sans-serif";

const MODEL_LABELS: Record<string, string> = {
  "seedance-1-5-pro": "Seedance 1.5 Pro",
  "veo-3-lite":       "Google Veo 3 Lite",
  "veo-3":            "Google Veo 3",
};

type Props = {
  open: boolean;
  fileUrl: string;
  meta: GenMetaVideo;
  workspaceId?: string | null;
  playbackTime: number;
  fromTimeline?: boolean;
  onClose: () => void;
  onInsert: (asset: { type: "video"; src: string }, start: number) => void;
  onReplace?: (newUrl: string) => void;
};

export default function EditorRegenVideoModal({ open, fileUrl, meta, workspaceId, playbackTime, fromTimeline, onClose, onInsert, onReplace }: Props) {
  const [prompt,   setPrompt]   = useState(meta.prompt);
  const [status,   setStatus]   = useState<"idle" | "generating" | "polling" | "done" | "error">("idle");
  const [pollMsg,  setPollMsg]  = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [newUrl,   setNewUrl]   = useState<string | null>(null);
  const [wsRules,  setWsRules]  = useState("");
  const [wsNeg,    setWsNeg]    = useState("");
  const aborted = useRef(false);

  useEffect(() => {
    if (!open) return;
    setPrompt(meta.prompt);
    setStatus("idle");
    setErrorMsg("");
    setNewUrl(null);
    const s = loadVideoSettings();
    setWsRules(s.vidCommonRules);
    setWsNeg(s.vidNegativePrompt);
  }, [open]);

  if (!open) return null;

  const displayUrl = newUrl ?? fileUrl;

  const handleRegen = async () => {
    if (!prompt.trim()) { setErrorMsg("プロンプトを入力してください"); return; }
    setStatus("generating");
    setErrorMsg("");
    setPollMsg("動画生成タスクを送信中...");
    aborted.current = false;
    try {
      const res = await fetch("/api/editor/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt, videoModel: meta.model, ratio: meta.ratio,
          duration: meta.duration, resolution: "720p",
          vidCommonRules: wsRules, vidNegativePrompt: wsNeg,
          workspaceId: workspaceId ?? undefined,
        }),
      });
      const data = await res.json() as { ok: boolean; taskId?: string; provider?: string; message?: string };
      if (!data.ok) throw new Error(data.message ?? "タスク送信に失敗しました");
      const { taskId, provider } = data;
      if (!taskId) throw new Error("タスクIDが返されませんでした");

      setStatus("polling");
      setPollMsg(`生成中（完了まで${videoTimeEstimate(meta.model)}かかる場合があります）...`);

      for (let i = 0; i < 180; i++) {
        await new Promise(r => setTimeout(r, 5000));
        if (aborted.current) return;
        const sr = await fetch(
          `/api/editor/generate-video/status?taskId=${encodeURIComponent(taskId)}&provider=${encodeURIComponent(provider ?? "seedance")}${workspaceId ? `&workspaceId=${encodeURIComponent(workspaceId)}` : ""}`
        );
        const sd = await sr.json() as { ok: boolean; status?: string; videoUrl?: string; message?: string };
        if (sd.status === "succeeded" && sd.videoUrl) {
          saveGenMeta(sd.videoUrl, { type: "ai-video", prompt, model: meta.model, ratio: meta.ratio, duration: meta.duration, refImageUrl: meta.refImageUrl });
          setNewUrl(sd.videoUrl);
          setStatus("done");
          return;
        }
        if (!sd.ok || sd.status === "failed" || sd.status === "expired")
          throw new Error(sd.message ?? "動画生成に失敗しました");
        const totalSec = (i + 1) * 5;
        const elapsed  = Math.round(totalSec / 60);
        setPollMsg(`生成中（${totalSec}秒経過${elapsed >= 1 ? `・約${elapsed}分` : ""}）...`);
      }
      throw new Error("タイムアウト（15分以上経過）。再試行してください");
    } catch (e) {
      if (!aborted.current) { setErrorMsg(e instanceof Error ? e.message : "生成に失敗しました"); setStatus("error"); }
    }
  };

  const handleInsert = (url: string) => { onInsert({ type: "video", src: url }, playbackTime); onClose(); };
  const handleClose = () => {
    if (status === "generating" || status === "polling") aborted.current = true;
    setStatus("idle"); setErrorMsg(""); setNewUrl(null); setPollMsg(""); onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.52)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }} onClick={handleClose}>
      <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: 540, maxHeight: "92vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 12px 48px rgba(0,0,0,0.22)" }} onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 17, fontWeight: 700, backgroundImage: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI 動画を再生成</span>
          <button onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#bbb", lineHeight: 1, padding: 0 }}>×</button>
        </div>

        {meta.refImageUrl ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <img src={meta.refImageUrl} alt="参照画像" style={{ width: "100%", borderRadius: 12, border: "1px solid #e2e8f0", display: "block" }} />
              <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(15,23,42,0.7)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>参照画像</div>
            </div>
            <div style={{ position: "relative", background: "#000", borderRadius: 10, overflow: "hidden" }}>
              <video src={displayUrl} controls style={{ width: "100%", display: "block", maxHeight: 160 }} />
              {newUrl && <div style={{ position: "absolute", top: 6, left: 6, background: GRAD, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>新しく生成</div>}
            </div>
          </div>
        ) : (
          <div style={{ position: "relative", background: "#000", borderRadius: 12, overflow: "hidden" }}>
            <video src={displayUrl} controls style={{ width: "100%", display: "block", maxHeight: 240 }} />
            {newUrl && <div style={{ position: "absolute", top: 8, left: 8, background: GRAD, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>新しく生成</div>}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => handleInsert(displayUrl)} style={{ padding: "9px 0", fontSize: 13, fontWeight: 600, border: "1.5px solid #e2e8f0", borderRadius: 10, background: "#f8fafc", color: "#475569", cursor: "pointer", fontFamily: FONT }}>
            {newUrl ? "新しい動画をタイムラインに追加" : "この動画をタイムラインに追加"}
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
            <Badge label="モデル"    value={MODEL_LABELS[meta.model] ?? meta.model} />
            <Badge label="比率"      value={meta.ratio} />
            <Badge label="尺"        value={`${meta.duration}秒`} />
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

        {(status === "generating" || status === "polling") && (
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>⏳</span>
            <span style={{ fontSize: 13, color: "#0369a1" }}>{pollMsg}</span>
          </div>
        )}

        {status !== "done" && status !== "polling" && status !== "generating" && (
          <button onClick={handleRegen}
            style={{ background: GRAD, color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: FONT }}>
            再生成する
          </button>
        )}

        {(status === "generating" || status === "polling") && (
          <button onClick={handleClose}
            style={{ background: "#f8fafc", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "11px 0", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
            キャンセル
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

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px" }}>
      <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{value}</div>
    </div>
  );
}
