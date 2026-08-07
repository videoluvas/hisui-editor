"use client";

import { useEffect, useRef, useState } from "react";
import { loadVideoSettings } from "@/lib/videoSettings";
import { videoTimeEstimate } from "@/lib/genTimeEstimate";
import { saveGenMeta } from "@/lib/gen.meta";
import type { GenMetaVideo } from "@/lib/gen.meta";

const GRAD = "linear-gradient(45deg, #5184F0, #169385)";
const FONT = "'Noto Sans JP', sans-serif";

const VIDEO_MODELS = [
  { value: "seedance-1-5-pro", label: "Seedance 1.5 Pro" },
  { value: "veo-3-lite",       label: "Google Veo 3 Lite" },
  { value: "veo-3",            label: "Google Veo 3" },
  { value: "kling-v2",         label: "Kling 2.0" },
  { value: "kling-v2-master",  label: "Kling 2.0 Master" },
  { value: "kling-v3",         label: "Kling 3.0" },
  { value: "kling-v3-turbo",   label: "Kling 3.0 Turbo" },
] as const;

const RATIOS              = ["16:9", "9:16"] as const;
const SEEDANCE_DURATIONS  = [4, 5, 6, 8, 10, 12] as const;
const VEO_DURATIONS       = [4, 6, 8] as const;
const KLING_DURATIONS     = [5, 10] as const;

type Props = {
  open: boolean;
  workspaceId?: string | null;
  playbackTime: number;
  onClose: () => void;
  onInsert: (asset: { type: "video"; src: string }, start: number) => void;
  onOpenSettings?: () => void;
  initialData?: GenMetaVideo;
  onGenerated?: (fileUrl: string, meta: GenMetaVideo) => void;
};

export default function EditorAIVideoModal({ open, workspaceId, playbackTime, onClose, onInsert, onOpenSettings, initialData, onGenerated }: Props) {
  const [prompt,            setPrompt]            = useState("");
  const [model,             setModel]             = useState<string>("seedance-1-5-pro");
  const [ratio,             setRatio]             = useState("16:9");
  const [duration,          setDuration]          = useState(5);
  const [vidCommonRules,    setVidCommonRules]    = useState("");
  const [vidNegativePrompt, setVidNegativePrompt] = useState("");
  const [status,            setStatus]            = useState<"idle" | "generating" | "polling" | "done" | "error">("idle");
  const [errorMsg,          setErrorMsg]          = useState("");
  const [videoUrl,          setVideoUrl]          = useState<string | null>(null);
  const [pollMsg,           setPollMsg]           = useState("");
  const aborted = useRef(false);

  useEffect(() => {
    if (!open) return;
    const s = loadVideoSettings();
    setVidCommonRules(s.vidCommonRules);
    setVidNegativePrompt(s.vidNegativePrompt);
    if (initialData) {
      setPrompt(initialData.prompt);
      setModel(initialData.model);
      setRatio(["16:9", "9:16"].includes(initialData.ratio) ? initialData.ratio : "16:9");
      setDuration(initialData.duration > 0 ? initialData.duration : 5);
    } else {
      setModel(s.videoModel);
      setRatio(["16:9", "9:16"].includes(s.ratio) ? s.ratio : "16:9");
      setDuration(s.duration > 0 ? s.duration : 5);
    }
  }, [open]);

  if (!open) return null;

  const isVeo   = model === "veo-3" || model === "veo-3-lite";
  const isKling = model.startsWith("kling-");
  const durations = isVeo ? VEO_DURATIONS : isKling ? KLING_DURATIONS : SEEDANCE_DURATIONS;
  const clampedDuration = isVeo
    ? ([4, 6, 8] as number[]).includes(duration) ? duration : 8
    : isKling
    ? ([5, 10] as number[]).includes(duration) ? duration : 5
    : duration;
  const hasWsRules = !!(vidCommonRules.trim() || vidNegativePrompt.trim());

  const handleGenerate = async () => {
    if (!prompt.trim()) { setErrorMsg("プロンプトを入力してください"); return; }
    setStatus("generating");
    setErrorMsg("");
    setVideoUrl(null);
    setPollMsg("動画生成タスクを送信中...");
    aborted.current = false;

    try {
      const res = await fetch("/api/editor/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          videoModel: model,
          ratio,
          duration: clampedDuration,
          resolution: "720p",
          vidCommonRules,
          vidNegativePrompt,
          workspaceId: workspaceId ?? undefined,
        }),
      });
      const data = await res.json() as { ok: boolean; taskId?: string; provider?: string; message?: string };
      if (!data.ok) throw new Error(data.message ?? "タスク送信に失敗しました");

      const { taskId, provider } = data;
      if (!taskId) throw new Error("タスクIDが返されませんでした");

      setStatus("polling");
      setPollMsg(`生成中（完了まで${videoTimeEstimate(model)}かかる場合があります）...`);

      for (let i = 0; i < 180; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        if (aborted.current) return;

        const statusRes = await fetch(
          `/api/editor/generate-video/status?taskId=${encodeURIComponent(taskId)}&provider=${encodeURIComponent(provider ?? "seedance")}${workspaceId ? `&workspaceId=${encodeURIComponent(workspaceId)}` : ""}`,
        );
        const statusData = await statusRes.json() as { ok: boolean; status?: string; videoUrl?: string; message?: string };

        if (statusData.status === "succeeded" && statusData.videoUrl) {
          setVideoUrl(statusData.videoUrl);
          setStatus("done");
          const meta: GenMetaVideo = { type: "ai-video", prompt, model, ratio, duration: clampedDuration };
          saveGenMeta(statusData.videoUrl, meta);
          onGenerated?.(statusData.videoUrl, meta);
          return;
        }
        if (!statusData.ok || statusData.status === "failed" || statusData.status === "expired") {
          throw new Error(statusData.message ?? "動画生成に失敗しました");
        }

        const totalSec = (i + 1) * 5;
        const elapsed  = Math.round(totalSec / 60);
        setPollMsg(`生成中（${totalSec}秒経過${elapsed >= 1 ? `・約${elapsed}分` : ""}）...`);
      }
      throw new Error("タイムアウト（15分以上経過）。再試行してください");
    } catch (e) {
      if (!aborted.current) {
        setErrorMsg(e instanceof Error ? e.message : "生成に失敗しました");
        setStatus("error");
      }
    }
  };

  const handleInsert = () => {
    if (videoUrl) { onInsert({ type: "video", src: videoUrl }, playbackTime); onClose(); }
  };

  const handleClose = () => {
    if (status === "generating" || status === "polling") { aborted.current = true; }
    setStatus("idle"); setErrorMsg(""); setVideoUrl(null); setPollMsg(""); onClose();
  };

  const handleRetry = () => { setStatus("idle"); setErrorMsg(""); setVideoUrl(null); setPollMsg(""); };

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
          <span style={{ fontSize: 18, fontWeight: 700, backgroundImage: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI動画を生成</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                title="ワークスペース設定（動画）を開く"
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

        {/* Ratio */}
        <Section label="アスペクト比">
          <div style={{ display: "flex", gap: 7 }}>
            {RATIOS.map((r) => (
              <ToggleChip key={r} label={r} active={ratio === r} onClick={() => setRatio(r)} />
            ))}
          </div>
        </Section>

        {/* Duration */}
        <Section label="尺（秒）">
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {durations.map((d) => (
              <ToggleChip key={d} label={`${d}秒`} active={clampedDuration === d} onClick={() => setDuration(d)} />
            ))}
          </div>
        </Section>

        {/* Prompt */}
        <Section label="プロンプト" sub="生成したい動画の内容を説明してください">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例：桜の木の下でゆっくりと風が吹いている。花びらがひらひらと舞い落ちる。穏やかな春の昼下がり。"
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

        {/* Polling status */}
        {(status === "generating" || status === "polling") && (
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>⏳</span>
            <span style={{ fontSize: 13, color: "#0369a1" }}>{pollMsg}</span>
          </div>
        )}

        {/* Preview */}
        {status === "done" && videoUrl && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#000", borderRadius: 10, overflow: "hidden" }}>
              <video src={videoUrl} controls style={{ width: "100%", display: "block", maxHeight: 240 }} />
            </div>
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
        {status !== "done" && status !== "polling" && status !== "generating" && (
          <button
            onClick={handleGenerate}
            style={{ background: GRAD, color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: FONT }}
          >
            AI動画を生成
          </button>
        )}

        {/* Cancel while polling */}
        {(status === "generating" || status === "polling") && (
          <button
            onClick={handleClose}
            style={{ background: "#f8fafc", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "11px 0", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: FONT }}
          >
            キャンセル
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
