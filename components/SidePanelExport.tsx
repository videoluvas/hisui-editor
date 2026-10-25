"use client";

import { useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/project.api";
import { track } from "@/lib/analytics";
import { loadVideoExportSettings, saveVideoExportSettings } from "@/lib/videoExportSettings";
import { GuidedError, exportGuide } from "@/lib/errorGuide";
import ErrorGuideBox from "@/components/ErrorGuideBox";

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
  onExportApi:      (cb: (info: ExportProgressInfo) => void) => Promise<string>;
  isProjectLoading: boolean;
  onOpenDashboard?: () => void;
  isFreePlan:       boolean;
};

// ─── Phase metadata ───────────────────────────────────────────────────────────

const PHASE_INFO: Record<ExportProgressPhase, { main: string; sub: string }> = {
  saving:        { main: "プロジェクトを保存中...",        sub: "最新の編集内容を保存しています" },
  submitting:    { main: "書き出しをリクエスト中...",      sub: "クラウドサーバーにジョブを送信しています" },
  queued:        { main: "レンダリングキューで待機中...",  sub: "サーバーが空き次第、自動で開始されます" },
  fetching:      { main: "アセットを取得中...",            sub: "動画・音声・画像ファイルをダウンロードしています" },
  rendering:     { main: "レンダリング中...",              sub: "サーバーで映像を合成・エンコードしています（数分かかる場合があります）" },
  saving_render: { main: "動画ファイルを保存中...",        sub: "レンダリング完了！ファイルに書き出しています" },
  done:          { main: "書き出し完了！",                 sub: "動画の準備ができました。ダウンロードが始まらない場合は下のボタンを押してください（24時間有効）" },
  failed:        { main: "書き出しに失敗しました",         sub: "下の案内をご確認ください" },
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

type HistoryItem = { id: string; renderId: string | null; status: string; sandbox: boolean; createdAt: string; expiresAt: string | null; available: boolean };

const STATUS_PHASE: Record<string, ExportProgressPhase> = { queued: "queued", fetching: "fetching", rendering: "rendering", saving: "saving_render" };
const POLL_LIMIT_MS = 15 * 60 * 1000;
const AUTO_DL_KEY = (renderId: string) => `hisui-export-autodl:${renderId}`;

function storageGet(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function storageSet(key: string, v: string) { try { localStorage.setItem(key, v); } catch {} }
function storageDel(key: string) { try { localStorage.removeItem(key); } catch {} }

const downloadPath = (logId: string) => `/api/export/download?id=${encodeURIComponent(logId)}`;

function startDownload(logId: string) {
  const a = document.createElement("a");
  a.href = downloadPath(logId);
  a.download = "";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtRemaining(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  const h = Math.floor(ms / 3600000);
  return h >= 1 ? `あと${h}時間` : `あと${Math.max(1, Math.floor(ms / 60000))}分`;
}

function fmtElapsed(s: number): string {
  const m   = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}分${String(sec).padStart(2, "0")}秒` : `${sec}秒`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
  selectedProject, onExportApi, isProjectLoading, onOpenDashboard, isFreePlan,
}: Props) {
  const [watermarkSetting, setWatermarkSetting] = useState(true);
  useEffect(() => { setWatermarkSetting(loadVideoExportSettings().sandboxMode); }, []);
  const watermark = isFreePlan || watermarkSetting;
  const toggleWatermark = () => {
    if (isFreePlan) return;
    const next = !watermarkSetting;
    setWatermarkSetting(next);
    saveVideoExportSettings({ ...loadVideoExportSettings(), sandboxMode: next });
  };

  const [phase,       setPhase]       = useState<ExportProgressPhase | "idle">("idle");
  const [elapsed,     setElapsed]     = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);
  const [errorCode,   setErrorCode]   = useState("EXPORT_FAILED");
  const [errorRef,    setErrorRef]    = useState<string | null>(null);
  const [doneLogId,   setDoneLogId]   = useState<string | null>(null);
  const [history,     setHistory]     = useState<HistoryItem[]>([]);

  const startRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // プロジェクトを切り替えた・画面を離れたら、前の確認ループを止める
  const runRef   = useRef(0);

  const projectId = selectedProject?.id ?? null;

  const loadHistory = async (): Promise<HistoryItem[]> => {
    if (!projectId) { setHistory([]); return []; }
    const res = await fetch(`/api/export/history?projectId=${encodeURIComponent(projectId)}`).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { ok?: boolean; items?: HistoryItem[] } | null;
    const items = data?.ok ? data.items ?? [] : [];
    setHistory(items);
    return items;
  };

  const startTimer = (startedAt: number) => {
    startRef.current = startedAt;
    setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
  };

  const stopTimer = () => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; };

  const fail = (e: unknown) => {
    const code = e instanceof GuidedError ? e.code : "EXPORT_FAILED";
    setPhase("failed");
    setErrorMsg(e instanceof Error ? e.message : "書き出しに失敗しました");
    setErrorCode(code);
    setErrorRef(e instanceof GuidedError ? e.ref ?? null : null);
    track("video_export_error", { code, watermark });
  };

  // 書き出しサーバーの状態を5秒ごとに確認する（開始から最大15分）
  const pollRender = async (renderId: string, startedAt: number, run: number) => {
    try {
      while (Date.now() - startedAt < POLL_LIMIT_MS) {
        await new Promise((r) => setTimeout(r, 5000));
        if (runRef.current !== run) return;
        const res  = await fetch(`/api/export/status?renderId=${encodeURIComponent(renderId)}`).catch(() => null);
        const data = (await res?.json().catch(() => null) ?? {}) as { status?: string; url?: string | null; error?: string | null; logId?: string | null };
        if (runRef.current !== run) return;
        const { status } = data;
        if (status && STATUS_PHASE[status]) { setPhase(STATUS_PHASE[status]); continue; }
        if (status === "done") {
          setPhase("done");
          setDownloadUrl(data.url ?? null);
          setDoneLogId(data.logId ?? null);
          track("video_export", { watermark, duration_sec: selectedProject?.durationSec ?? undefined });
          // 完了したら1回だけ自動でダウンロードする（このブラウザで書き出しを始めたものに限る）
          if (data.logId && storageGet(AUTO_DL_KEY(renderId))) { storageDel(AUTO_DL_KEY(renderId)); startDownload(data.logId); }
          loadHistory();
          return;
        }
        if (status === "failed") {
          storageDel(AUTO_DL_KEY(renderId));
          loadHistory();
          throw new GuidedError("RENDER_FAILED", data.error ?? "書き出しサーバーで動画を作成できませんでした", renderId);
        }
      }
      throw new GuidedError("EXPORT_TIMEOUT", "15 分たっても書き出しが終わりませんでした", renderId);
    } catch (e) {
      if (runRef.current === run) fail(e);
    } finally {
      if (runRef.current === run) stopTimer();
    }
  };

  // 開いたとき・プロジェクトを切り替えたとき：履歴を読み、途中の書き出しがあれば続きを表示する
  useEffect(() => {
    const run = ++runRef.current;
    stopTimer();
    setPhase("idle");
    setDownloadUrl(null);
    setDoneLogId(null);
    setErrorMsg(null);
    setElapsed(0);
    loadHistory().then((items) => {
      if (runRef.current !== run) return;
      const active = items.find((h) => h.renderId && STATUS_PHASE[h.status]);
      if (!active?.renderId) return;
      const startedAt = new Date(active.createdAt).getTime();
      setPhase(STATUS_PHASE[active.status]);
      startTimer(startedAt);
      pollRender(active.renderId, startedAt, run);
    });
    return () => { runRef.current++; stopTimer(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleApiExport = async () => {
    const run = ++runRef.current;
    setDownloadUrl(null);
    setDoneLogId(null);
    setErrorMsg(null);
    setPhase("saving");
    startTimer(Date.now());

    try {
      const renderId = await onExportApi((info) => { if (runRef.current === run) setPhase(info.phase); });
      storageSet(AUTO_DL_KEY(renderId), "1");
      if (runRef.current !== run) return;
      loadHistory();
      await pollRender(renderId, startRef.current, run);
    } catch (e: unknown) {
      if (runRef.current === run) { fail(e); stopTimer(); }
    }
  };

  const resetApi = () => {
    runRef.current++;
    stopTimer();
    setPhase("idle");
    setDownloadUrl(null);
    setDoneLogId(null);
    setErrorMsg(null);
    setElapsed(0);
  };

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

      {/* ── 動画に書き出しカード ── */}
      <div style={{
        borderRadius: 10, padding: 14, background: "#fff", display: "flex", flexDirection: "column", gap: 12,
        border: `1px solid ${isApiActive ? ACCENT + "55" : "#f0f0f0"}`,
        transition: "border-color 0.2s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconCloud />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#333", lineHeight: 1.4 }}>動画に書き出し</span>
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "#888", lineHeight: 1.7 }}>
          タイムラインをサーバーでレンダリングし、動画ファイルを作成します。
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
                  href={doneLogId ? downloadPath(doneLogId) : downloadUrl}
                  {...(doneLogId ? { download: "" } : { target: "_blank", rel: "noopener noreferrer" })}
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

            {/* エラー：何をすればよいか・問い合わせ先 */}
            {phase === "failed" && (
              <ErrorGuideBox
                guide={exportGuide(errorCode)} code={errorCode} detail={errorMsg} refId={errorRef} where="動画の書き出し" accent={ACCENT} compact
                actions={[
                  ...(errorCode === "CREDIT_SHORT" && onOpenDashboard ? [{ label: "クレジット残高を確認", onClick: onOpenDashboard, primary: true }] : []),
                  { label: "もう一度書き出す", onClick: resetApi, primary: errorCode !== "CREDIT_SHORT" },
                ]}
              />
            )}
          </div>
        )}

        {/* ── 書き出し履歴（URLが有効な24時間はダウンロードできる） ── */}
        {history.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>書き出し履歴</div>
            {history.map((h) => {
              const running = !!STATUS_PHASE[h.status];
              const note = h.available && h.expiresAt ? fmtRemaining(h.expiresAt)
                : running ? "書き出し中" : h.status === "failed" ? "失敗" : "期限切れ";
              return (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 7, background: "#f8fafc", border: "1px solid #eef2f7" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#334155" }}>
                      {fmtDateTime(h.createdAt)}
                      <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 600, color: "#94a3b8" }}>{h.sandbox ? "透かし入り" : "透かしなし"}</span>
                    </div>
                    <div style={{ fontSize: 10, color: h.status === "failed" ? RED : "#94a3b8", marginTop: 1 }}>{note}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startDownload(h.id)}
                    disabled={!h.available}
                    title={h.available ? "ダウンロード" : "ダウンロードできません"}
                    style={{
                      padding: "5px 10px", fontSize: 11, fontWeight: 700, borderRadius: 6, border: "none", flexShrink: 0,
                      background: h.available ? GREEN : "#e2e8f0", color: h.available ? "#fff" : "#94a3b8",
                      cursor: h.available ? "pointer" : "not-allowed", fontFamily: FONT,
                    }}
                  >
                    ↓ 保存
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── ウォーターマーク ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>ウォーターマーク</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, lineHeight: 1.5 }}>
              {isFreePlan ? "無料プランは透かし入りで何度でも書き出せます" : watermark ? "ロゴ入り・クレジット消費なし" : "ロゴなし・クレジットを消費します"}
            </div>
          </div>
          {isFreePlan && (
            <button
              type="button"
              onClick={onOpenDashboard}
              title="ウォーターマークを外すには有料プランが必要です"
              style={{ fontSize: 9, fontWeight: 700, color: "#e67d30", background: "#fff3e8", border: "1px solid #e67d3040", padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap", cursor: onOpenDashboard ? "pointer" : "default", fontFamily: FONT }}
            >
              外すには有料プラン
            </button>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={watermark}
            aria-label="ウォーターマーク"
            onClick={toggleWatermark}
            disabled={isFreePlan || isRendering}
            style={{
              width: 36, height: 20, borderRadius: 10, border: "none", padding: 2, flexShrink: 0,
              background: watermark ? ACCENT : "#cbd5e1",
              cursor: isFreePlan || isRendering ? "not-allowed" : "pointer",
              opacity: isFreePlan ? 0.6 : 1, display: "flex", justifyContent: watermark ? "flex-end" : "flex-start",
              transition: "background 0.15s",
            }}
          >
            <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
          </button>
        </div>
      </div>
    </div>
  );
}
