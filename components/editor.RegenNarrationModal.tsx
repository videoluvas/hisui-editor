"use client";

import { useEffect, useState } from "react";
import { loadTtsSettings, GEMINI_VOICE_META, TTS_PACING_OPTIONS, TTS_TONE_OPTIONS } from "@/lib/ttsSettings";
import { saveGenMeta } from "@/lib/gen.meta";
import type { GenMetaNarration } from "@/lib/gen.meta";

const GRAD = "linear-gradient(45deg, #5184F0, #169385)";
const FONT = "'Noto Sans JP', sans-serif";

type Props = {
  open: boolean;
  fileUrl: string;
  meta: GenMetaNarration;
  workspaceId?: string | null;
  playbackTime: number;
  fromTimeline?: boolean;
  onClose: () => void;
  onInsert: (asset: { type: "audio"; src: string; volume?: number }, start: number) => void;
  onReplace?: (newUrl: string) => void;
};

export default function EditorRegenNarrationModal({ open, fileUrl, meta, workspaceId, playbackTime, fromTimeline, onClose, onInsert, onReplace }: Props) {
  const [transcript, setTranscript] = useState(meta.transcript);
  const [status,     setStatus]     = useState<"idle" | "generating" | "done" | "error">("idle");
  const [errorMsg,   setErrorMsg]   = useState("");
  const [newUrl,     setNewUrl]     = useState<string | null>(null);
  const [wsRules,    setWsRules]    = useState("");
  const [wsNeg,      setWsNeg]      = useState("");

  useEffect(() => {
    if (!open) return;
    setTranscript(meta.transcript);
    setStatus("idle");
    setErrorMsg("");
    setNewUrl(null);
    const s = loadTtsSettings();
    setWsRules(s.ttsCommonRules);
    setWsNeg(s.ttsNegativePrompt);
  }, [open]);

  if (!open) return null;

  const displayUrl  = newUrl ?? fileUrl;
  const voiceMeta   = GEMINI_VOICE_META.find(v => v.name === meta.voice);
  const pacingLabel = TTS_PACING_OPTIONS.find(p => p.value === meta.pacing)?.label ?? meta.pacing;
  const toneLabel   = TTS_TONE_OPTIONS.find(t => t.value === meta.tone)?.label   ?? meta.tone;

  const handleRegen = async () => {
    if (!transcript.trim()) { setErrorMsg("テキストを入力してください"); return; }
    setStatus("generating");
    setErrorMsg("");
    try {
      const res = await fetch("/api/editor/generate-narration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          provider: "google-gemini",
          model: "gemini-tts-high",
          voice: meta.voice,
          pacing: meta.pacing,
          tone: meta.tone,
          ttsCommonRules: wsRules,
          ttsNegativePrompt: wsNeg,
          workspaceId: workspaceId ?? undefined,
        }),
      });
      const data = await res.json() as { ok: boolean; audioUrl?: string; message?: string };
      if (!data.ok) throw new Error(data.message ?? "生成に失敗しました");
      if (data.audioUrl) {
        saveGenMeta(data.audioUrl, { type: "ai-narration", transcript, voice: meta.voice, pacing: meta.pacing, tone: meta.tone });
        setNewUrl(data.audioUrl);
      }
      setStatus("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "生成に失敗しました");
      setStatus("error");
    }
  };

  const handleInsert = (url: string) => { onInsert({ type: "audio", src: url, volume: 1.0 }, playbackTime); onClose(); };
  const handleClose = () => {
    if (status === "generating") return;
    setStatus("idle"); setErrorMsg(""); setNewUrl(null); onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.52)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }} onClick={handleClose}>
      <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: 540, maxHeight: "92vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 12px 48px rgba(0,0,0,0.22)" }} onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 17, fontWeight: 700, backgroundImage: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI ナレーションを再生成</span>
          <button onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#bbb", lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ background: "#f8fafc", borderRadius: 12, padding: 14, border: "1px solid #e2e8f0", position: "relative" }}>
          {newUrl && <div style={{ position: "absolute", top: -10, left: 12, background: GRAD, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>新しく生成</div>}
          <audio src={displayUrl} controls style={{ width: "100%", display: "block" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => handleInsert(displayUrl)} style={{ padding: "9px 0", fontSize: 13, fontWeight: 600, border: "1.5px solid #e2e8f0", borderRadius: 10, background: "#f8fafc", color: "#475569", cursor: "pointer", fontFamily: FONT }}>
            {newUrl ? "新しいナレーションをタイムラインに追加" : "このナレーションをタイムラインに追加"}
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
            <Badge label="音声"
              value={voiceMeta ? `${meta.voice}（${voiceMeta.gender}・${voiceMeta.trait}）` : meta.voice} />
            <Badge label="話速"   value={pacingLabel} />
            <Badge label="トーン" value={toneLabel} />
          </div>
          {wsRules && <InfoBlock label="共通ルール（WS設定）" value={wsRules} />}
          {wsNeg   && <InfoBlock label="NGワード（WS設定）"   value={wsNeg} />}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>読み上げテキスト</span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>編集して再生成できます</span>
          </div>
          <textarea value={transcript} onChange={e => setTranscript(e.target.value)} rows={5}
            style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "9px 12px", fontSize: 13, fontFamily: FONT, resize: "vertical", outline: "none", color: "#334155", lineHeight: 1.6 }} />
          <span style={{ fontSize: 11, color: "#94a3b8", textAlign: "right" }}>{transcript.length}文字</span>
        </div>

        {errorMsg && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#b91c1c" }}>{errorMsg}</div>}

        <button onClick={handleRegen} disabled={status === "generating"}
          style={{ background: status === "generating" ? "#cbd5e1" : GRAD, color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontWeight: 700, fontSize: 14, cursor: status === "generating" ? "not-allowed" : "pointer", fontFamily: FONT }}>
          {status === "generating" ? "生成中…（10〜30秒かかります）" : "再生成する"}
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
