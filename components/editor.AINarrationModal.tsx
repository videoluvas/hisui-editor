"use client";

import { useEffect, useState } from "react";
import { loadTtsSettings, GEMINI_VOICE_META, TTS_PACING_OPTIONS, TTS_TONE_OPTIONS } from "@/lib/ttsSettings";
import { saveGenMeta } from "@/lib/gen.meta";
import type { GenMetaNarration } from "@/lib/gen.meta";

const GRAD = "linear-gradient(45deg, #5184F0, #169385)";
const FONT = "'Noto Sans JP', sans-serif";

type Props = {
  open: boolean;
  workspaceId?: string | null;
  playbackTime: number;
  onClose: () => void;
  onInsert: (asset: { type: "audio"; src: string; volume?: number }, start: number) => void;
  onOpenSettings?: () => void;
  initialData?: GenMetaNarration;
  onGenerated?: (fileUrl: string, meta: GenMetaNarration) => void;
};

export default function EditorAINarrationModal({ open, workspaceId, playbackTime, onClose, onInsert, onOpenSettings, initialData, onGenerated }: Props) {
  const [transcript,        setTranscript]        = useState("");
  const [voice,             setVoice]             = useState("Kore");
  const [pacing,            setPacing]            = useState("normal");
  const [tone,              setTone]              = useState("neutral");
  const [ttsCommonRules,    setTtsCommonRules]    = useState("");
  const [ttsNegativePrompt, setTtsNegativePrompt] = useState("");
  const [status,            setStatus]            = useState<"idle" | "generating" | "done" | "error">("idle");
  const [errorMsg,          setErrorMsg]          = useState("");
  const [audioUrl,          setAudioUrl]          = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const s = loadTtsSettings();
    setTtsCommonRules(s.ttsCommonRules);
    setTtsNegativePrompt(s.ttsNegativePrompt);
    if (initialData) {
      setTranscript(initialData.transcript);
      setVoice(initialData.voice);
      setPacing(initialData.pacing);
      setTone(initialData.tone);
    } else {
      setVoice(s.voice);
      setPacing(s.pacing);
      setTone(s.tone);
    }
  }, [open]);

  if (!open) return null;

  const hasWsRules = !!(ttsCommonRules.trim() || ttsNegativePrompt.trim());

  const handleGenerate = async () => {
    if (!transcript.trim()) { setErrorMsg("読み上げるテキストを入力してください"); return; }
    setStatus("generating");
    setErrorMsg("");
    setAudioUrl(null);
    try {
      const res = await fetch("/api/editor/generate-narration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          provider: "google-gemini",
          model: "gemini-tts-high",
          voice,
          pacing,
          tone,
          ttsCommonRules,
          ttsNegativePrompt,
          workspaceId: workspaceId ?? undefined,
        }),
      });
      const data = await res.json() as { ok: boolean; audioUrl?: string; message?: string };
      if (!data.ok) throw new Error(data.message ?? "生成に失敗しました");
      setAudioUrl(data.audioUrl ?? null);
      setStatus("done");
      if (data.audioUrl) {
        const meta: GenMetaNarration = { type: "ai-narration", transcript, voice, pacing, tone };
        saveGenMeta(data.audioUrl, meta);
        onGenerated?.(data.audioUrl, meta);
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "生成に失敗しました");
      setStatus("error");
    }
  };

  const handleInsert = () => {
    if (audioUrl) { onInsert({ type: "audio", src: audioUrl, volume: 1.0 }, playbackTime); onClose(); }
  };

  const handleClose = () => {
    if (status === "generating") return;
    setStatus("idle"); setErrorMsg(""); setAudioUrl(null); onClose();
  };

  const handleRetry = () => { setStatus("idle"); setErrorMsg(""); setAudioUrl(null); };

  const femaleVoices = GEMINI_VOICE_META.filter((v) => v.gender === "女性");
  const maleVoices   = GEMINI_VOICE_META.filter((v) => v.gender === "男性");

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
          <span style={{ fontSize: 18, fontWeight: 700, backgroundImage: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AIナレーションを生成</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                title="ワークスペース設定（ナレーション）を開く"
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

        {/* Transcript */}
        <Section label="読み上げテキスト" sub="ナレーションの台本を入力してください">
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="例：皆様、本日はご参加いただきありがとうございます。それでは、製品の特長についてご説明いたします。"
            rows={5}
            style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "9px 12px", fontSize: 13, fontFamily: FONT, resize: "vertical", outline: "none", color: "#334155", lineHeight: 1.6 }}
          />
          <span style={{ fontSize: 11, color: "#94a3b8", textAlign: "right" }}>{transcript.length}文字</span>
        </Section>

        {/* Voice */}
        <Section label="音声">
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: FONT, outline: "none", color: "#334155", background: "#fff" }}
          >
            <optgroup label="女性">
              {femaleVoices.map((v) => <option key={v.name} value={v.name}>{v.name}（{v.trait}）</option>)}
            </optgroup>
            <optgroup label="男性">
              {maleVoices.map((v) => <option key={v.name} value={v.name}>{v.name}（{v.trait}）</option>)}
            </optgroup>
          </select>
        </Section>

        {/* Pacing */}
        <Section label="話速">
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {TTS_PACING_OPTIONS.map((p) => (
              <ToggleChip key={p.value} label={p.label} active={pacing === p.value} onClick={() => setPacing(p.value)} />
            ))}
          </div>
        </Section>

        {/* Tone */}
        <Section label="トーン">
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {TTS_TONE_OPTIONS.map((t) => (
              <ToggleChip key={t.value} label={t.label} active={tone === t.value} onClick={() => setTone(t.value)} />
            ))}
          </div>
        </Section>

        {/* Error */}
        {errorMsg && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#b91c1c" }}>
            {errorMsg}
          </div>
        )}

        {/* Preview */}
        {status === "done" && audioUrl && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px", border: "1px solid #e2e8f0" }}>
              <audio src={audioUrl} controls style={{ width: "100%", display: "block" }} />
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
        {status !== "done" && (
          <button
            onClick={handleGenerate}
            disabled={status === "generating"}
            style={{ background: status === "generating" ? "#cbd5e1" : GRAD, color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontWeight: 700, fontSize: 14, cursor: status === "generating" ? "not-allowed" : "pointer", fontFamily: FONT, transition: "background 0.2s" }}
          >
            {status === "generating" ? "生成中…（10〜30秒かかります）" : "AIナレーションを生成"}
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
