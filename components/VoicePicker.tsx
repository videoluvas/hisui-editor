"use client";

import { useEffect, useRef, useState } from "react";
import { GEMINI_VOICE_META } from "@/lib/ttsSettings";
import type { GeminiVoiceMeta } from "@/lib/ttsSettings";

const FONT = "'Noto Sans JP', sans-serif";
const MALE_COLORS   = ["#2563eb", "#0891b2", "#4f46e5", "#0d9488", "#0284c7", "#6366f1", "#1e40af", "#06b6d4"];
const FEMALE_COLORS = ["#ec4899", "#f472b6", "#db2777", "#fb7185", "#d946ef", "#e11d48", "#be185d", "#f06292"];

function look(v: GeminiVoiceMeta) {
  const i = GEMINI_VOICE_META.filter((m) => m.gender === v.gender).findIndex((m) => m.name === v.name);
  const colors = v.gender === "女性" ? FEMALE_COLORS : MALE_COLORS;
  return { color: colors[i % colors.length], alt: Math.floor(i / colors.length) % 2 === 1 };
}

export function VoiceAvatar({ voice, size = 32 }: { voice: GeminiVoiceMeta; size?: number }) {
  const { color, alt } = look(voice);
  const female = voice.gender === "女性";
  const hair = "rgba(15,23,42,0.28)";
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" style={{ flexShrink: 0, display: "block" }}>
      <circle cx="20" cy="20" r="20" fill={color} />
      <clipPath id={`va-${voice.name}`}><circle cx="20" cy="20" r="20" /></clipPath>
      <g clipPath={`url(#va-${voice.name})`}>
        {female && !alt && <path d="M11 18c0-6.5 4-10.5 9-10.5s9 4 9 10.5v11H11z" fill="#fff" opacity="0.55" />}
        {female && alt && <path d="M11.5 17c0-6 3.8-9.5 8.5-9.5s8.5 3.5 8.5 9.5v5.5h-17z" fill="#fff" opacity="0.55" />}
        <path d="M6 42c0-8 6.3-13 14-13s14 5 14 13z" fill="#fff" />
        <circle cx="20" cy="17" r="7" fill="#fff" />
        {female && !alt && <path d="M13 16.5c0-4.5 3.2-7.5 7-7.5s7 3 7 7.5c-2.5-.3-5.5-1.6-7-3.6-1.5 2-4.5 3.3-7 3.6z" fill={hair} />}
        {female && alt && <path d="M13 17c0-4.6 3.2-7.6 7-7.6s7 3 7 7.6c-1.8-1.6-4.5-3.6-7-3.6s-5.2 2-7 3.6z" fill={hair} />}
        {!female && !alt && <path d="M13 15.5c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5c-1.2-1.3-4-2.2-7-2.2s-5.8.9-7 2.2z" fill={hair} />}
        {!female && alt && <path d="M13 16c0-4.2 3-7 7-7 3.6 0 6.6 2.4 7 6.2-3.2-.2-6.6-1.4-8.4-3.4-1.2 2-3.4 3.6-5.6 4.2z" fill={hair} />}
      </g>
    </svg>
  );
}

export default function VoicePicker({ value, onChange, maxHeight = 300 }: { value: string; onChange: (name: string) => void; maxHeight?: number }) {
  const [playing, setPlaying] = useState<{ name: string; loading: boolean } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audioRef.current?.pause(), []);

  const toggle = (v: GeminiVoiceMeta) => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (playing?.name === v.name) { setPlaying(null); return; }
    const audio = new Audio(v.sampleUrl);
    audioRef.current = audio;
    const mine = (f: () => void) => () => { if (audioRef.current === audio) f(); };
    const done = mine(() => { audioRef.current = null; setPlaying(null); });
    audio.addEventListener("playing", mine(() => setPlaying({ name: v.name, loading: false })));
    audio.addEventListener("waiting", mine(() => setPlaying({ name: v.name, loading: true })));
    audio.addEventListener("ended", done);
    audio.addEventListener("error", done);
    setPlaying({ name: v.name, loading: true });
    void audio.play().catch(done);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight, overflowY: "auto", paddingRight: 2 }}>
      <style>{`@keyframes vp-spin { to { transform: rotate(360deg); } }`}</style>
      {(["女性", "男性"] as const).map((g) => (
        <div key={g} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: g === "女性" ? "#db2777" : "#2563eb", fontFamily: FONT }}>{g}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 5 }}>
            {GEMINI_VOICE_META.filter((v) => v.gender === g).map((v) => {
              const { color } = look(v);
              const selected = value === v.name;
              const isPlaying = playing?.name === v.name;
              return (
                <div key={v.name} role="button" tabIndex={0} onClick={() => onChange(v.name)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(v.name); } }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 10, cursor: "pointer", border: `1.5px solid ${selected ? color : "#e2e8f0"}`, background: selected ? `${color}12` : "#fff", transition: "border-color 0.12s, background 0.12s" }}>
                  <VoiceAvatar voice={v} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: selected ? color : "#1e293b", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</div>
                    <div style={{ fontSize: 10, color: "#64748b", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.trait}</div>
                  </div>
                  <button type="button" aria-label={isPlaying ? `${v.name} の試聴を停止` : `${v.name} を試聴`} onClick={(e) => { e.stopPropagation(); toggle(v); }}
                    style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, border: "none", cursor: "pointer", background: isPlaying ? color : `${color}22`, color: isPlaying ? "#fff" : color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isPlaying && playing.loading
                      ? <span style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "vp-spin 0.8s linear infinite" }} />
                      : isPlaying
                      ? <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="3" height="8" rx="1"/><rect x="6" y="1" width="3" height="8" rx="1"/></svg>
                      : <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1.5l7 3.5-7 3.5z"/></svg>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
