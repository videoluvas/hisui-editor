"use client";

import { useState } from "react";
import { loadBgmSettings } from "@/lib/bgmSettings";
import { bgmTimeEstimate } from "@/lib/genTimeEstimate";

const GRAD = "linear-gradient(45deg, #5184F0, #169385)";
const FONT = "'Noto Sans JP', sans-serif";

const GENRES = ["Pop", "Jazz", "Classical", "Electronic", "Cinematic", "Ambient", "Lo-fi", "Rock"] as const;
const MOODS  = ["Happy", "Calm", "Epic", "Melancholic", "Energetic", "Mysterious", "Romantic", "Tense"] as const;
const GENRE_JA: Record<string, string> = {
  Pop: "ポップ", Jazz: "ジャズ", Classical: "クラシック", Electronic: "エレクトロニック",
  Cinematic: "シネマティック", Ambient: "アンビエント", "Lo-fi": "Lo-fi", Rock: "ロック",
};
const MOOD_JA: Record<string, string> = {
  Happy: "明るい", Calm: "穏やか", Epic: "壮大", Melancholic: "切ない",
  Energetic: "エネルギッシュ", Mysterious: "神秘的", Romantic: "ロマンチック", Tense: "緊張感",
};

type Props = {
  open: boolean;
  timelineDuration: number;
  workspaceId?: string | null;
  onClose: () => void;
  onInsert: (asset: { type: "audio"; src: string; volume?: number }, start: number) => void;
};

export default function EditorBGMModal({ open, timelineDuration, workspaceId, onClose, onInsert }: Props) {
  const defaults = loadBgmSettings();
  const [vocal, setVocal] = useState<"yes" | "no" | "">(defaults.defaultVocal);
  const [genre, setGenre] = useState<string>(defaults.defaultGenre);
  const [mood, setMood] = useState<string>(defaults.defaultMood);
  const [prompt, setPrompt] = useState(defaults.commonPrompt);
  const [useDurationAuto, setUseDurationAuto] = useState(true);
  const [customDuration, setCustomDuration] = useState(30);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (!open) return null;

  const duration = useDurationAuto ? Math.max(1, Math.round(timelineDuration)) : customDuration;
  const autoLabel = timelineDuration > 0 ? `${Math.round(timelineDuration)}秒（タイムラインに合わせる）` : "タイムライン未確定（手動指定を推奨）";

  const handleGenerate = async () => {
    if (!genre && !mood && !prompt.trim()) {
      setErrorMsg("ジャンル・ムード・プロンプトのいずれかを選択または入力してください");
      return;
    }
    setStatus("generating");
    setErrorMsg("");

    try {
      const res = await fetch("/api/bgm/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genre,
          mood,
          vocal: vocal || undefined,
          prompt,
          duration,
          workspaceId: workspaceId ?? undefined,
          model: defaults.model ?? "lyria-3-pro-preview",
        }),
      });
      const data = await res.json() as { ok: boolean; audioUrl?: string; message?: string };
      if (!data.ok) throw new Error(data.message ?? "生成に失敗しました");
      const audioUrl = data.audioUrl;
      setStatus("done");
      if (audioUrl) {
        onInsert({ type: "audio", src: audioUrl, volume: defaults.defaultVolume }, 0);
        onClose();
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "生成に失敗しました");
      setStatus("error");
    }
  };

  const handleClose = () => {
    if (status === "generating") return;
    setStatus("idle");
    setErrorMsg("");
    const d = loadBgmSettings();
    setVocal(d.defaultVocal);
    setGenre(d.defaultGenre);
    setMood(d.defaultMood);
    setPrompt(d.commonPrompt);
    onClose();
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.52)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}
      onClick={handleClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 18, padding: 28, width: 480, maxHeight: "88vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18, boxShadow: "0 12px 48px rgba(0,0,0,0.22)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, backgroundImage: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              BGMを生成
            </span>
          </div>
          <button
            onClick={handleClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#bbb", lineHeight: 1, padding: 0 }}
          >×</button>
        </div>

        {/* ─── ボーカル ─── */}
        <Section label="ボーカル">
          <div style={{ display: "flex", gap: 8 }}>
            <ToggleChip label="あり" active={vocal === "yes"} onClick={() => setVocal(vocal === "yes" ? "" : "yes")} />
            <ToggleChip label="なし（インスト）" active={vocal === "no"} onClick={() => setVocal(vocal === "no" ? "" : "no")} />
          </div>
        </Section>

        {/* ─── ジャンル ─── */}
        <Section label="ジャンル">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {GENRES.map((g) => (
              <ToggleChip key={g} label={GENRE_JA[g] ?? g} active={genre === g} onClick={() => setGenre(genre === g ? "" : g)} />
            ))}
          </div>
        </Section>

        {/* ─── ムード ─── */}
        <Section label="ムード">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {MOODS.map((m) => (
              <ToggleChip key={m} label={MOOD_JA[m] ?? m} active={mood === m} onClick={() => setMood(mood === m ? "" : m)} />
            ))}
          </div>
        </Section>

        {/* ─── プロンプト ─── */}
        <Section label="プロンプト" sub="より具体的な指示を自由に入力できます">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例：明るくテンポの速いポップス、ピアノメロディあり、ボーカルなし"
            rows={3}
            style={{
              width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 10,
              padding: "9px 12px", fontSize: 13, fontFamily: FONT, resize: "vertical", outline: "none",
              color: "#334155", lineHeight: 1.5,
            }}
          />
        </Section>

        {/* ─── 尺 ─── */}
        <Section label="尺（秒）">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#475569" }}>
              <input type="radio" checked={useDurationAuto} onChange={() => setUseDurationAuto(true)} style={{ accentColor: "#5184F0" }} />
              {autoLabel}
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#475569" }}>
              <input type="radio" checked={!useDurationAuto} onChange={() => setUseDurationAuto(false)} style={{ accentColor: "#5184F0" }} />
              手動で指定
              {!useDurationAuto && (
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={customDuration}
                  onChange={(e) => setCustomDuration(Math.max(5, Math.min(300, Number(e.target.value))))}
                  style={{
                    width: 72, border: "1.5px solid #e2e8f0", borderRadius: 7, padding: "4px 8px",
                    fontSize: 13, fontFamily: FONT, outline: "none", color: "#334155",
                  }}
                />
              )}
              {!useDurationAuto && <span style={{ fontSize: 12, color: "#94a3b8" }}>秒</span>}
            </label>
          </div>
        </Section>

        {/* ─── エラー ─── */}
        {(status === "error" || errorMsg) && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#b91c1c" }}>
            {errorMsg}
          </div>
        )}

        {/* ─── タイムライン未確定警告 ─── */}
        {useDurationAuto && timelineDuration <= 0 && (
          <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#92400e" }}>
            タイムラインの尺が未確定です。手動で指定するか、先にクリップを配置してください。
          </div>
        )}

        {/* ─── 生成ボタン ─── */}
        {status !== "done" && (
          <button
            onClick={handleGenerate}
            disabled={status === "generating"}
            style={{
              background: status === "generating" ? "#cbd5e1" : GRAD,
              color: "#fff", border: "none", borderRadius: 10,
              padding: "13px 0", fontWeight: 700, fontSize: 14,
              cursor: status === "generating" ? "not-allowed" : "pointer",
              fontFamily: FONT, transition: "background 0.2s",
            }}
          >
            {status === "generating" ? `生成中…（${bgmTimeEstimate(defaults.model ?? "lyria-3-pro-preview")}）` : status === "error" ? "再試行" : "BGMを生成"}
          </button>
        )}
      </div>
    </div>
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
      style={{
        border: active ? "none" : "1.5px solid #e2e8f0",
        borderRadius: 20,
        padding: "5px 14px",
        fontSize: 12,
        fontWeight: active ? 700 : 400,
        fontFamily: FONT,
        cursor: "pointer",
        background: active ? GRAD : "#f8fafc",
        color: active ? "#fff" : "#475569",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}
