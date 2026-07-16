"use client";

import { useRef, useState } from "react";
import { TEAL } from "@/components/icons";
import type { Project } from "@/lib/project.api";

const FONT   = "'Noto Sans JP', sans-serif";
const ACCENT = "#5184F0";
const GREEN  = "#059669";
const RED    = "#dc2626";
const GRAD   = "linear-gradient(90deg, #5184F0, #169385)";

// ─── Progress types (exported – used in page.tsx) ─────────────────────────────

export type ExportProgressPhase =
  | "saving" | "submitting" | "queued" | "fetching"
  | "rendering" | "saving_render" | "done" | "failed";

export type ExportProgressInfo = { phase: ExportProgressPhase; url?: string };

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  selectedProject:  Project | null;
  onExportLocal:    () => void | Promise<void>;
  onExportApi:      (cb: (info: ExportProgressInfo) => void) => Promise<void>;
  isExporting:      boolean;
  isProjectLoading: boolean;
  exportError:      string | null;
  onOpenDashboard?: () => void;
};

// ─── Phase metadata ───────────────────────────────────────────────────────────

const PHASE_INFO: Record<ExportProgressPhase, { main: string; sub: string }> = {
  saving:        { main: "プロジェクトを保存中...",        sub: "最新の編集内容を保存しています" },
  submitting:    { main: "書き出しをリクエスト中...",      sub: "クラウドサーバーにジョブを送信しています" },
  queued:        { main: "レンダリングキューで待機中...",  sub: "サーバーが空き次第、自動で開始されます" },
  fetching:      { main: "アセットを取得中...",            sub: "動画・音声・画像ファイルをダウンロードしています" },
  rendering:     { main: "レンダリング中...",              sub: "サーバーで映像を合成・エンコードしています（数分かかる場合があります）" },
  saving_render: { main: "動画ファイルを保存中...",        sub: "レンダリング完了！ファイルに書き出しています" },
  done:          { main: "書き出し完了！",                 sub: "動画の準備ができました。下のボタンからダウンロードしてください" },
  failed:        { main: "レンダリングに失敗しました",     sub: "しばらく経ってから再試行してください" },
};

const STEP_LABELS = ["保存", "送信", "レンダリング", "完了"];

function phaseToStep(phase: ExportProgressPhase): number {
  if (phase === "saving"    || phase === "submitting")    return 0;
  if (phase === "queued"    || phase === "fetching")      return 1;
  if (phase === "rendering" || phase === "saving_render") return 2;
  if (phase === "done")                                   return 3;
  return -1;
}

function phaseToPercent(phase: ExportProgressPhase, elapsedSec: number): number {
  switch (phase) {
    case "saving":        return 8;
    case "submitting":    return 18;
    case "queued":        return 28;
    case "fetching":      return 42;
    case "rendering": {
      const fill = 1 - Math.exp(-elapsedSec / 80);
      return Math.round(42 + fill * 40);
    }
    case "saving_render": return 90;
    case "done":          return 100;
    default:              return 0;
  }
}

function fmtElapsed(s: number): string {
  const m   = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}分${String(sec).padStart(2, "0")}秒` : `${sec}秒`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function IconBrowser() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={TEAL} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="24" height="18" rx="2" />
      <line x1="2" y1="9" x2="26" y2="9" />
      <circle cx="6" cy="6.5" r="1" fill={TEAL} stroke="none" />
      <circle cx="10" cy="6.5" r="1" fill={TEAL} stroke="none" />
      <circle cx="14" cy="6.5" r="1" fill={TEAL} stroke="none" />
      <path d="M9 16l3 3 7-5" strokeWidth="1.8" />
    </svg>
  );
}

function IconCloud() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20H8a5 5 0 0 1-.5-9.97A7 7 0 0 1 21 14a4 4 0 0 1-1 6z" />
      <path d="M14 17v-6M11 14l3-3 3 3" />
    </svg>
  );
}

function SpinnerIcon({ color = ACCENT }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ animation: "spin 1s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="9" cy="9" r="7" stroke={color} strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M9 2 a7 7 0 0 1 7 7" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill={GREEN} />
      <path d="M5 9l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill={RED} />
      <path d="M6 6l6 6M12 6l-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function StepDot({ state }: { state: "done" | "active" | "pending" }) {
  if (state === "done") {
    return (
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 5.5l2.5 2.5 4.5-4.5" />
        </svg>
      </div>
    );
  }
  if (state === "active") {
    return (
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 0 4px ${ACCENT}33` }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />
      </div>
    );
  }
  return (
    <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid #d1d5db", background: "#f9fafb", flexShrink: 0 }} />
  );
}

function StepIndicator({ currentStep, failed }: { currentStep: number; failed: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      {STEP_LABELS.map((label, i) => {
        const dotState: "done" | "active" | "pending" = failed
          ? "pending"
          : currentStep > i ? "done" : currentStep === i ? "active" : "pending";
        const labelColor = !failed && currentStep >= i ? ACCENT : "#9ca3af";
        return (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", flex: i < STEP_LABELS.length - 1 ? 1 : undefined }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <StepDot state={dotState} />
              <span style={{ fontSize: 9, fontWeight: dotState === "active" ? 700 : 400, color: labelColor, fontFamily: FONT, whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{
                flex: 1,
                height: 2,
                marginTop: 10,
                marginLeft: 2,
                marginRight: 2,
                background: !failed && currentStep > i ? GRAD : "#e5e7eb",
                transition: "background 0.4s",
                borderRadius: 1,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div>
      <div style={{ height: 8, borderRadius: 4, background: "#e5e7eb", overflow: "hidden" }}>
        <div style={{
          width: `${percent}%`,
          height: "100%",
          background: GRAD,
          borderRadius: 4,
          transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 3 }}>
        <span style={{ fontSize: 10, color: ACCENT, fontWeight: 700, fontFamily: FONT }}>{percent}%</span>
      </div>
    </div>
  );
}

function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  };
  return (
    <button onClick={handle} style={{ width: "100%", padding: "7px 0", fontSize: 12, fontWeight: 600, borderRadius: 7, border: `1px solid ${copied ? "#bbf7d0" : "#e2e8f0"}`, background: copied ? "#f0fdf4" : "#f8fafc", color: copied ? GREEN : "#64748b", cursor: "pointer", fontFamily: FONT }}>
      {copied ? "✓ URLをコピーしました" : "URLをコピー"}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SidePanelExport({
  selectedProject, onExportLocal, onExportApi, isExporting, isProjectLoading, exportError, onOpenDashboard,
}: Props) {
  const [phase,       setPhase]       = useState<ExportProgressPhase | "idle">("idle");
  const [elapsed,     setElapsed]     = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);

  const startRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleApiExport = async () => {
    startRef.current = Date.now();
    setElapsed(0);
    setDownloadUrl(null);
    setErrorMsg(null);
    setPhase("saving");

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    try {
      await onExportApi((info) => {
        setPhase(info.phase);
        if (info.url) setDownloadUrl(info.url);
      });
    } catch (e: unknown) {
      setPhase("failed");
      setErrorMsg(e instanceof Error ? e.message : "書き出しに失敗しました");
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resetApi = () => {
    setPhase("idle");
    setDownloadUrl(null);
    setErrorMsg(null);
    setElapsed(0);
  };

  const localDisabled = !selectedProject || isProjectLoading || isExporting;
  const apiDisabled   = !selectedProject || isProjectLoading || phase !== "idle";

  const isApiActive = phase !== "idle";
  const isRendering = isApiActive && phase !== "done" && phase !== "failed";
  const pct         = phase !== "idle" && phase !== "failed"
    ? phaseToPercent(phase as ExportProgressPhase, elapsed)
    : 0;
  const step        = phase !== "idle" ? phaseToStep(phase as ExportProgressPhase) : -1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: FONT }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        書き出しツール
      </p>

      {/* 選択中プロジェクト */}
      {selectedProject && (
        <div style={{ borderRadius: 8, border: "1px solid #f0f0f0", padding: "8px 12px", background: "#fafafa", fontSize: 12, color: "#555" }}>
          <span style={{ fontWeight: 700, color: "#333" }}>{selectedProject.title}</span>
          {selectedProject.width && selectedProject.height && (
            <span style={{ marginLeft: 6, color: "#94a3b8" }}>{selectedProject.width}×{selectedProject.height} · {selectedProject.fps}fps</span>
          )}
        </div>
      )}
      {isProjectLoading && <div style={{ fontSize: 12, color: "#94a3b8" }}>プロジェクト読み込み中...</div>}
      {exportError      && <div style={{ fontSize: 12, color: "#e53935" }}>{exportError}</div>}

      {/* ── APIで書き出しカード ── */}
      <div style={{
        borderRadius: 10, padding: 14, background: "#fff", display: "flex", flexDirection: "column", gap: 12,
        border: `1px solid ${isApiActive ? ACCENT + "55" : "#f0f0f0"}`,
        transition: "border-color 0.2s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconCloud />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#333", lineHeight: 1.4 }}>APIで書き出す</span>
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "#888", lineHeight: 1.7 }}>
          音声・動画クリップを含むプロジェクトをサーバーでレンダリングして書き出します。
        </p>

        {/* ── アイドル時: ボタン ── */}
        {!isApiActive && (
          <button
            type="button"
            onClick={handleApiExport}
            disabled={apiDisabled}
            style={{
              width: "100%", padding: "7px 0", fontSize: 12, fontWeight: 600,
              borderRadius: 7, border: "none",
              background: apiDisabled ? "#b8c8f0" : ACCENT,
              color: "#fff", cursor: apiDisabled ? "not-allowed" : "pointer", fontFamily: FONT,
            }}
          >
            書き出す
          </button>
        )}

        {/* ── 進行中・完了・エラー ── */}
        {isApiActive && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* ステップインジケーター */}
            <StepIndicator currentStep={step} failed={phase === "failed"} />

            {/* プログレスバー */}
            {phase !== "failed" && <ProgressBar percent={pct} />}

            {/* ステータスメッセージ */}
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "11px 13px",
              background: phase === "done" ? "#f0fdf4" : phase === "failed" ? "#fef2f2" : "#f8fafc",
              borderRadius: 9,
              border: `1px solid ${phase === "done" ? "#bbf7d0" : phase === "failed" ? "#fecaca" : "#e8edf4"}`,
            }}>
              <div style={{ marginTop: 1, flexShrink: 0 }}>
                {phase === "done"   && <CheckIcon />}
                {phase === "failed" && <XCircleIcon />}
                {isRendering        && <SpinnerIcon />}
              </div>
              <div>
                <p style={{
                  margin: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.4,
                  color: phase === "done" ? GREEN : phase === "failed" ? RED : "#334155",
                }}>
                  {PHASE_INFO[phase as ExportProgressPhase].main}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.55 }}>
                  {PHASE_INFO[phase as ExportProgressPhase].sub}
                </p>
              </div>
            </div>

            {/* 経過時間 */}
            {isRendering && (
              <div style={{ textAlign: "center", fontSize: 11, color: "#94a3b8" }}>
                ⏱ 経過時間: <span style={{ fontWeight: 600, color: "#64748b" }}>{fmtElapsed(elapsed)}</span>
                <span style={{ marginLeft: 8 }}>· 平均2〜5分かかります</span>
              </div>
            )}

            {/* ダウンロード・コピー */}
            {phase === "done" && downloadUrl && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block", textAlign: "center", padding: "11px 0",
                    borderRadius: 8, background: GREEN, color: "#fff",
                    fontWeight: 700, fontSize: 14, textDecoration: "none",
                    fontFamily: FONT,
                  }}
                >
                  ↓ 動画をダウンロード
                </a>
                <CopyUrlButton url={downloadUrl} />
              </div>
            )}

            {/* 完了後リセット */}
            {phase === "done" && (
              <button
                onClick={resetApi}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#94a3b8", padding: "2px 0", fontFamily: FONT }}
              >
                再度書き出す
              </button>
            )}

            {/* エラー */}
            {phase === "failed" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {errorMsg && (
                  <div style={{ fontSize: 11, color: RED, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "8px 10px", lineHeight: 1.6 }}>
                    {errorMsg}
                    {errorMsg.includes("クレジット") && onOpenDashboard && (
                      <div style={{ marginTop: 6 }}>
                        <button onClick={onOpenDashboard} style={{ fontSize: 11, fontWeight: 700, color: ACCENT, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                          クレジット残高を確認する →
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={resetApi}
                  style={{
                    width: "100%", padding: "7px 0", fontSize: 12, fontWeight: 600,
                    borderRadius: 7, border: `1px solid ${ACCENT}`,
                    background: "#fff", color: ACCENT, cursor: "pointer", fontFamily: FONT,
                  }}
                >
                  再試行
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ブラウザ書き出しカード ── */}
      <div style={{ borderRadius: 10, border: "1px solid #f0f0f0", padding: 14, background: "#fff", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconBrowser />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#333", lineHeight: 1.4 }}>ブラウザで書き出す</span>
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "#888", lineHeight: 1.7 }}>
          テキスト・画像のみのプロジェクトを素早く書き出します。音声・動画クリップは含まれません。
        </p>
        <button
          type="button"
          onClick={() => void onExportLocal()}
          disabled={localDisabled}
          style={{
            width: "100%", padding: "7px 0", fontSize: 12, fontWeight: 600,
            borderRadius: 7, border: "none",
            background: localDisabled ? "#c8e6e0" : TEAL,
            color: "#fff", cursor: localDisabled ? "not-allowed" : "pointer", fontFamily: FONT,
          }}
        >
          {isExporting ? "書き出し中..." : "書き出す"}
        </button>
      </div>
    </div>
  );
}
