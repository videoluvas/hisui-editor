"use client";

import { useEffect, useRef, useState } from "react";
import type { ConvertProgress } from "@/lib/pptxImport.api";

const TEAL = "#169385";
const FONT = "'Noto Sans JP', sans-serif";

type StageKey = "upload" | "start" | "render" | "objects" | "save" | "narration" | "timeline";

const STAGES: { key: StageKey; label: string }[] = [
  { key: "upload",   label: "ファイルをアップロード" },
  { key: "start",    label: "変換の準備" },
  { key: "render",   label: "スライドを描画" },
  { key: "objects",  label: "オブジェクトを切り出し" },
  { key: "save",     label: "画像を保存" },
  { key: "narration", label: "ナレーションを生成" },
  { key: "timeline", label: "タイムラインを作成" },
];

// 段階ごとの進捗バーの範囲（%）。段階の中では時間に合わせて少しずつ進め、止まって見えないようにする
const RANGE: Record<StageKey, [number, number]> = {
  upload: [0, 12], start: [12, 18], render: [18, 38], objects: [38, 90], save: [90, 96], narration: [60, 96], timeline: [96, 99],
};

function currentStage(phase: "uploading" | "converting", p: ConvertProgress | null): StageKey {
  if (phase === "uploading") return "upload";
  if (!p) return "start";
  if (p.stage === "parse") return "start";
  if (p.stage === "render") return "render";
  if (p.stage === "objects") return "objects";
  if (p.stage === "narration") return p.done >= p.total ? "timeline" : "narration";
  return p.done >= p.total ? "timeline" : "save";
}

function LayersIcon() {
  return (
    <svg width="120" height="84" viewBox="0 0 120 84" aria-hidden="true">
      <style>{`
        @keyframes hisui-lift { 0%, 15% { transform: translate(0, 0); opacity: 1 } 45%, 70% { transform: translate(var(--dx), var(--dy)); opacity: 1 } 100% { transform: translate(0, 0); opacity: 1 } }
        @keyframes hisui-scan { 0% { transform: translateY(0) } 100% { transform: translateY(46px) } }
        .hisui-layer { animation: hisui-lift 2.4s ease-in-out infinite; }
        .hisui-scan { animation: hisui-scan 1.2s ease-in-out infinite alternate; }
        @media (prefers-reduced-motion: reduce) { .hisui-layer, .hisui-scan { animation: none; } }
      `}</style>
      <g transform="translate(22 16)">
        <rect className="hisui-layer" style={{ ["--dx" as string]: "-14px", ["--dy" as string]: "8px", animationDelay: "0s" }} width="76" height="52" rx="6" fill="#e2f3f1" stroke="#b6dfd9" />
        <rect className="hisui-layer" style={{ ["--dx" as string]: "-4px", ["--dy" as string]: "-6px", animationDelay: "0.1s" }} x="8" y="8" width="36" height="7" rx="2" fill="#334155" opacity="0.8" />
        <rect className="hisui-layer" style={{ ["--dx" as string]: "-2px", ["--dy" as string]: "2px", animationDelay: "0.2s" }} x="8" y="21" width="30" height="4" rx="2" fill="#94a3b8" />
        <rect className="hisui-layer" style={{ ["--dx" as string]: "-2px", ["--dy" as string]: "6px", animationDelay: "0.25s" }} x="8" y="29" width="34" height="4" rx="2" fill="#94a3b8" />
        <rect className="hisui-layer" style={{ ["--dx" as string]: "14px", ["--dy" as string]: "-8px", animationDelay: "0.3s" }} x="48" y="8" width="20" height="36" rx="4" fill={TEAL} opacity="0.75" />
        <rect className="hisui-scan" x="-4" y="-2" width="84" height="3" rx="1.5" fill={TEAL} opacity="0.35" />
      </g>
    </svg>
  );
}

export default function ImportProgress({ phase, uploadRatio, progress, withNarration = false }: {
  phase: "uploading" | "converting";
  uploadRatio: number;
  progress: ConvertProgress | null;
  withNarration?: boolean;
}) {
  const stages = withNarration ? STAGES : STAGES.filter((s) => s.key !== "narration");
  const stage = currentStage(phase, progress);
  const stageStart = useRef<{ key: StageKey; at: number }>({ key: stage, at: Date.now() });
  const [percent, setPercent] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(Date.now());

  if (stageStart.current.key !== stage) stageStart.current = { key: stage, at: Date.now() };

  useEffect(() => {
    const tick = () => {
      const [lo, hi] = RANGE[stage];
      const inStage = (Date.now() - stageStart.current.at) / 1000;
      let ratio: number;
      if (stage === "upload") ratio = uploadRatio;
      else if ((stage === "objects" || stage === "save" || stage === "narration") && progress && progress.total > 0) {
        ratio = Math.min(1, (progress.done + Math.min(0.9, inStage / 3)) / progress.total);
      } else {
        const expect = stage === "render" ? Math.max(8, (progress?.total ?? 10) * 1.2) : 10;
        ratio = 1 - Math.exp(-inStage / expect);
      }
      const target = lo + (hi - lo) * Math.min(0.97, ratio);
      setPercent((p) => Math.max(p, Math.round(target * 10) / 10));
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [stage, uploadRatio, progress]);

  const index = stages.findIndex((s) => s.key === stage);
  const detail =
    stage === "upload" ? "" :
    (stage === "objects" || stage === "save" || stage === "narration") && progress?.total ? `${Math.min(progress.done + 1, progress.total)} / ${progress.total}${stage !== "save" ? " 枚" : ""}` :
    "";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "8px 0 4px", fontFamily: FONT }}>
      <LayersIcon />
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "#334155" }}>
          <span>{stages[index].label}{detail && <span style={{ color: TEAL, marginLeft: 6 }}>{detail}</span>}</span>
          <span style={{ color: TEAL }}>{Math.floor(percent)}%</span>
        </div>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(percent)} style={{ height: 10, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
          <div style={{ width: `${percent}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${TEAL}, #34d3b9)`, transition: "width 0.3s ease" }} />
        </div>
      </div>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, width: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
        {stages.map((s, i) => {
          const done = i < index;
          const active = i === index;
          return (
            <li key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: done ? "#64748b" : active ? "#0f172a" : "#cbd5e1", fontWeight: active ? 700 : 500 }}>
              <span style={{ width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0, background: done ? TEAL : "transparent", color: "#fff", border: done ? "none" : `1.5px solid ${active ? TEAL : "#e2e8f0"}` }}>
                {done ? "✓" : active ? <span style={{ width: 6, height: 6, borderRadius: "50%", background: TEAL, animation: "hisui-pulse 1s ease-in-out infinite" }} /> : null}
              </span>
              {s.label}
            </li>
          );
        })}
      </ol>
      <style>{`@keyframes hisui-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.25 } }`}</style>
      <div style={{ fontSize: 11, color: "#94a3b8" }}>経過 {elapsed} 秒・この画面を閉じずにお待ちください</div>
    </div>
  );
}
