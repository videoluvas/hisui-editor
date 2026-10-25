"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TEAL } from "@/components/icons";
import type { Project } from "@/lib/project.api";
import { confirmPptxNarration, createPptxImport, getPptxImport, startPptxImport, uploadToPresigned } from "@/lib/pptxImport.api";
import type { ConvertProgress, ImportWarning, NarrationEstimate } from "@/lib/pptxImport.api";
import VoicePicker from "@/components/VoicePicker";
import ImportProgress from "@/components/ImportProgress";
import ErrorGuideBox from "@/components/ErrorGuideBox";
import { importGuide } from "@/lib/errorGuide";
import { NARRATION_PAD_AFTER, NARRATION_PAD_BEFORE, PPTX_MIME, clampPad } from "@/lib/pptx.import.shared";
import { ANIM_TARGETS, DEFAULT_EFFECTS, DEFAULT_IN_GROUPS, RECOMMENDED_ANIMATIONS, SPEEDS, SUPPORTED_ANIMATIONS, SUPPORTED_TRANSITIONS, sanitizeAnimSettings } from "@/lib/pptx.effects";
import type { AnimSetting, AnimSettings, AnimTarget } from "@/lib/pptx.effects";
import { listWorkspaces, createWorkspace } from "@/lib/workspace.api";
import type { WorkspaceItem } from "@/lib/workspace.api";
import { clearDraft, saveDraft } from "@/lib/pptxDraft";
import Turnstile, { turnstileEnabled } from "@/components/Turnstile";
import type { PptxDraft } from "@/lib/pptxDraft";
import { flushSignup, track } from "@/lib/analytics";
import { openPricing } from "@/lib/pricing";

const FONT = "'Noto Sans JP', sans-serif";
const POLL_MS = 2000;
const MAX_MB = 200;
const NEW_WS = "__new__";

const RECOMMENDED_ROWS: [string, string, string][] = [
  ["文字・図形", "フェード 0.5 秒", "なし"],
  ["埋め込み画像", "下からスライド 0.5 秒", "ゆっくりズーム"],
  ["動画", "なし", "なし"],
  ["背景", "なし", "なし"],
];

type StepId = "pptx" | "pdf" | "animation" | "narration" | "account" | "workspace";
type Phase = "form" | "uploading" | "converting" | "confirm" | "done" | "error";

const STEP_LABEL: Record<StepId, string> = {
  pptx: "パワーポイント",
  pdf: "PDF",
  animation: "アニメーション",
  narration: "ナレーション・秒数",
  account: "ログイン",
  workspace: "保存先",
};

type Props = {
  isLoggedIn: boolean;
  workspaceId?: string | null;
  initialPptx?: File | null;
  initialDraft?: PptxDraft | null;
  onClose: () => void;
  onImported: (project: Project, workspaceId: string) => void;
};

const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 13, borderRadius: 8, border: "1px solid #e0e0e0", outline: "none", color: "#333", fontFamily: FONT, boxSizing: "border-box", background: "#fff" };
const providerBtn: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "11px 0", borderRadius: 10, border: "1px solid #dadce0", background: "#fff", color: "#1f1f1f", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT };
const labelStyle: React.CSSProperties = { fontSize: 12, color: "#666", fontWeight: 600 };

const PptxIcon = () => (
  <svg width="40" height="40" viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="28" cy="24" r="18" fill="#D35230" />
    <path d="M28 6a18 18 0 0 1 18 18H28Z" fill="#FF8F6B" />
    <path d="M10 24A18 18 0 0 1 28 6v18Z" fill="#ED6C47" />
    <rect x="2" y="13" width="22" height="22" rx="3" fill="#C43E1C" />
    <path d="M9 18.5h5.2c3 0 4.8 1.6 4.8 4.2s-1.9 4.3-4.9 4.3h-1.9v3.5H9Zm3.2 2.6v3.4h1.6c1.2 0 1.9-.6 1.9-1.7s-.7-1.7-1.9-1.7Z" fill="#fff" />
  </svg>
);

const PdfIcon = () => (
  <svg width="40" height="40" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M11 3h19l11 11v29a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="#E5252A" />
    <path d="M30 3v9a2 2 0 0 0 2 2h9Z" fill="#F59A9C" />
    <text x="25" y="35" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">PDF</text>
  </svg>
);

function DropBox({ accept, file, onPick, title, hint, check, icon }: {
  accept: string; file: File | null; onPick: (f: File) => void; title: string; hint: string; check: (f: File) => string | null; icon: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState("");
  const take = (f: File | undefined) => {
    if (!f) return;
    const e = check(f);
    setError(e ?? "");
    if (!e) onPick(f);
  };
  return (
    <div
      role="button" tabIndex={0}
      onClick={() => ref.current?.click()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") ref.current?.click(); }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); }}
      style={{ borderRadius: 12, padding: "26px 16px", textAlign: "center", cursor: "pointer", border: `2px dashed ${over || file ? TEAL : "#cbd5e1"}`, background: over ? `${TEAL}14` : file ? `${TEAL}08` : "#f8fafc" }}
    >
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: file ? TEAL : "#334155", wordBreak: "break-all" }}>
        {file ? `✓ ${file.name}（${(file.size / 1024 / 1024).toFixed(1)}MB）` : title}
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{file ? "クリックして選び直す" : hint}</div>
      {error && <div role="alert" style={{ fontSize: 12, color: "#b91c1c", marginTop: 8 }}>{error}</div>}
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }} onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}

const sizeCheck = (ext: string) => (f: File) =>
  !f.name.toLowerCase().endsWith(ext) ? `${ext} ファイルを選んでください` : f.size > MAX_MB * 1024 * 1024 ? `ファイルは ${MAX_MB}MB までです` : null;

export default function PptxImportWizard({ isLoggedIn, workspaceId = null, initialPptx = null, initialDraft = null, onClose, onImported }: Props) {
  const d = (initialDraft?.settings ?? {}) as Record<string, any>;
  const [loggedIn, setLoggedIn] = useState(isLoggedIn);
  const steps: StepId[] = ["pptx", "pdf", "animation", "narration", ...(isLoggedIn ? [] : ["account" as const]), "workspace"];
  const restoredStep = initialDraft?.step === "account" && isLoggedIn ? "workspace" : (initialDraft?.step as StepId | undefined);
  const [step, setStep] = useState<StepId>(restoredStep && steps.includes(restoredStep) ? restoredStep : "pptx");
  const index = steps.indexOf(step);

  const [pptx, setPptx] = useState<File | null>(initialDraft?.pptx ?? initialPptx);
  const [pdf, setPdf]   = useState<File | null>(initialDraft?.pdf ?? null);
  const [animationMode, setAnimationMode]       = useState<"recommended" | "custom">(d.animationMode ?? "recommended");
  const [animations, setAnimations]             = useState<AnimSettings>(d.animations ? sanitizeAnimSettings(d.animations) : RECOMMENDED_ANIMATIONS);
  const setAnim = (t: AnimTarget, patch: Partial<AnimSetting>) => setAnimations((prev) => ({ ...prev, [t]: { ...prev[t], ...patch } }));
  const [stagger, setStagger]                   = useState<boolean>(d.stagger ?? true);
  const [secPerSlide, setSecPerSlide]           = useState<number>(d.secPerSlide ?? 5);
  const [narrationOn, setNarrationOn]           = useState<boolean>(d.narrationOn ?? false);
  const [voice, setVoice]                       = useState<string>(d.voice ?? "Kore");
  const [padMode, setPadMode]                   = useState<"recommended" | "custom">(d.padMode ?? "recommended");
  const [padBefore, setPadBefore]               = useState<number>(d.padBefore ?? NARRATION_PAD_BEFORE);
  const [padAfter, setPadAfter]                 = useState<number>(d.padAfter ?? NARRATION_PAD_AFTER);
  const pad = padMode === "custom" ? { before: padBefore, after: padAfter } : { before: NARRATION_PAD_BEFORE, after: NARRATION_PAD_AFTER };

  const [authTab, setAuthTab]   = useState<"register" | "login">("register");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy]   = useState(false);
  const [providers, setProviders] = useState<{ google: boolean; microsoft: boolean; emailLink: boolean } | null>(null);
  const [waiting, setWaiting]     = useState<"popup" | "email" | null>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tsToken, setTsToken] = useState("");
  const [tsReset, setTsReset] = useState(0);
  const tsReady = !turnstileEnabled || !!tsToken;

  const [workspaces, setWorkspaces] = useState<WorkspaceItem[] | null>(null);
  const [wsChoice, setWsChoice]     = useState<string>(NEW_WS);
  const [newWsName, setNewWsName]   = useState<string>(d.newWsName ?? "パワーポイント");
  const [title, setTitle]           = useState<string>(d.title ?? "");

  const [phase, setPhase]       = useState<Phase>("form");
  const [message, setMessage]   = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [errorRef, setErrorRef]   = useState<string | null>(null);
  const [warnings, setWarnings] = useState<ImportWarning[]>([]);
  const [result, setResult]     = useState<{ project: Project; workspaceId: string } | null>(null);
  const [uploadRatio, setUploadRatio] = useState(0);
  const [convProgress, setConvProgress] = useState<ConvertProgress | null>(null);
  const [estimate, setEstimate] = useState<NarrationEstimate | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const jobRef = useRef<{ jobId: string; workspaceId: string } | null>(null);

  useEffect(() => {
    if (step !== "workspace" || !loggedIn || workspaces) return;
    listWorkspaces().then((res) => {
      const list = res.ok ? res.workspaces.filter((w) => w.toolType === "pptx") : [];
      setWorkspaces(list);
      const current = list.find((w) => w.id === workspaceId);
      setWsChoice(current?.id ?? list[0]?.id ?? NEW_WS);
    });
  }, [step, loggedIn, workspaces, workspaceId]);

  // 途中経過を保存しておき、ログインでページを移動しても続きから再開できるようにする
  useEffect(() => {
    if (phase !== "form" || !pptx) return;
    const t = setTimeout(() => {
      void saveDraft({ step, pptx, pdf, settings: { animationMode, animations, stagger, secPerSlide, narrationOn, voice, padMode, padBefore, padAfter, title, newWsName } });
    }, 300);
    return () => clearTimeout(t);
  }, [phase, step, pptx, pdf, animationMode, animations, stagger, secPerSlide, narrationOn, voice, padMode, padBefore, padAfter, title, newWsName]);

  const close = () => { void clearDraft(); onClose(); };

  useEffect(() => {
    if (step !== "account" || loggedIn || providers) return;
    fetch("/api/auth/providers").then((r) => r.json()).then(setProviders).catch(() => setProviders({ google: false, microsoft: false, emailLink: false }));
  }, [step, loggedIn, providers]);

  // ポップアップからの通知、またはログイン状態の確認（メールのリンクを別タブで開いた場合など）で次へ進む
  useEffect(() => {
    if (!waiting || loggedIn) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "hisui-auth") return;
      if (e.data.ok) loginDone();
      else { setAuthError(e.data.message || "ログインできませんでした"); setWaiting(null); }
    };
    window.addEventListener("message", onMessage);
    const poll = setInterval(async () => {
      const r = await fetch("/api/me", { credentials: "include", cache: "no-store" }).catch(() => null);
      if (r?.ok) loginDone();
    }, 2500);
    return () => { window.removeEventListener("message", onMessage); clearInterval(poll); };
  }, [waiting, loggedIn]);

  useEffect(() => {
    if (phase !== "converting") return;
    const poll = setInterval(async () => {
      if (!jobRef.current) return;
      const res = await getPptxImport(jobRef.current.jobId);
      if (!res.ok) return;
      if (res.progress) setConvProgress(res.progress);
      if (res.status === "done" && res.project) {
        setWarnings(res.warnings ?? []);
        setResult({ project: res.project, workspaceId: jobRef.current.workspaceId });
        setPhase("done");
        track("pptx_import_success", { narration: narrationOn, duration_sec: res.project.durationSec ?? undefined });
        void clearDraft();
      } else if (res.status === "confirm" && res.estimate) {
        setEstimate(res.estimate);
        setConfirmError("");
        setPhase("confirm");
      } else if (res.status === "error") {
        fail(res.errorCode ?? "CONVERT_FAILED", res.message ?? "取り込みに失敗しました", jobRef.current.jobId);
      }
    }, POLL_MS);
    return () => clearInterval(poll);
  }, [phase]);

  const busy = phase === "uploading" || phase === "converting" || phase === "confirm";
  const canNext =
    step === "pptx" ? !!pptx :
    step === "pdf" ? !!pdf :
    step === "account" ? loggedIn :
    true;

  function loginDone() {
    flushSignup();
    setWaiting(null);
    setLoggedIn(true);
    setStep("workspace");
  }

  function openProvider(p: "google" | "microsoft") {
    setAuthError("");
    const w = 480, h = 640;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(`/api/auth/oauth/${p}/start`, "hisui-auth", `width=${w},height=${h},left=${left},top=${top}`);
    if (!popup) { setAuthError("ポップアップがブロックされました。ブラウザの設定で許可してください"); return; }
    setWaiting("popup");
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    const res = await fetch("/api/auth/email-link", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: linkEmail, next: window.location.pathname, turnstileToken: tsToken }),
    }).catch(() => null);
    setTsReset((n) => n + 1);
    const data = (await res?.json().catch(() => null)) ?? { ok: false };
    setAuthBusy(false);
    if (!data.ok) { setAuthError(data.message ?? "メールを送信できませんでした"); return; }
    setWaiting("email");
  }

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    try {
      const res = await fetch(authTab === "register" ? "/api/auth/register" : "/api/auth/login", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, turnstileToken: tsToken }),
      });
      setTsReset((n) => n + 1);
      const data = await res.json().catch(() => ({ ok: false }));
      if (!data.ok) { setAuthError(data.message ?? "エラーが発生しました"); return; }
      loginDone();
    } catch {
      setAuthError("通信エラーが発生しました");
    } finally {
      setAuthBusy(false);
    }
  }

  function fail(code: string, msg: string, ref: string | null = null) {
    setErrorCode(code);
    setMessage(msg);
    setErrorRef(ref);
    setPhase("error");
    track("pptx_import_error", { code });
  }

  // 失敗の種類に合わせて、選び直すファイルのステップへ戻す
  function backTo(target: "pptx" | "pdf" | null) {
    if (target === "pptx") setPptx(null);
    if (target === "pdf") setPdf(null);
    setStep(target ?? step);
    setPhase("form");
  }

  async function handleStart() {
    if (!pptx || !pdf) return;
    track("pptx_upload_start", { narration: narrationOn, size_mb: Math.round((pptx.size + pdf.size) / 1024 / 1024) });
    setPhase("uploading");
    setMessage("");
    let wsId = wsChoice;
    if (wsChoice === NEW_WS) {
      const created = await createWorkspace(newWsName.trim() || "パワーポイント", "pptx");
      if (!created.ok || !created.workspace) {
        fail("WORKSPACE_FAILED", created.message ?? "ワークスペースを作成できませんでした");
        return;
      }
      wsId = created.workspace.id;
      setWorkspaces((prev) => [created.workspace!, ...(prev ?? [])]);
      setWsChoice(wsId);
    }
    const job = await createPptxImport({ workspaceId: wsId, title, secPerSlide, animationMode, animations, stagger, pptxSize: pptx.size, pdfSize: pdf.size, ...(narrationOn ? { narration: { voice, padBefore: pad.before, padAfter: pad.after } } : {}) });
    if (!job.ok || !job.jobId || !job.pptxUrl || !job.pdfUrl) {
      fail("START_FAILED", job.message ?? "取り込みを開始できませんでした");
      return;
    }
    const loaded = { pptx: 0, pdf: 0 };
    const report = () => setUploadRatio((loaded.pptx + loaded.pdf) / Math.max(1, pptx.size + pdf.size));
    setUploadRatio(0);
    setConvProgress(null);
    const uploaded = await Promise.all([
      uploadToPresigned(job.pptxUrl, pptx, PPTX_MIME, (n) => { loaded.pptx = n; report(); }),
      uploadToPresigned(job.pdfUrl, pdf, "application/pdf", (n) => { loaded.pdf = n; report(); }),
    ]);
    if (uploaded.includes(false)) {
      fail("UPLOAD_FAILED", "ファイルのアップロードが途中で止まりました", job.jobId);
      return;
    }
    const started = await startPptxImport(job.jobId);
    if (!started.ok) {
      fail("START_FAILED", started.message ?? "変換を開始できませんでした", job.jobId);
      return;
    }
    jobRef.current = { jobId: job.jobId, workspaceId: wsId };
    setPhase("converting");
  }

  async function handleConfirm(generate: boolean) {
    if (!jobRef.current) return;
    setConfirmBusy(true);
    setConfirmError("");
    const res = await confirmPptxNarration(jobRef.current.jobId, generate);
    setConfirmBusy(false);
    if (!res.ok) { setConfirmError(res.message ?? "続けられませんでした"); return; }
    if (!generate) setNarrationOn(false);
    setConvProgress(null);
    setPhase("converting");
  }

  const chip = (active: boolean, off = false): React.CSSProperties => ({
    padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${active ? TEAL : "#e2e8f0"}`, background: active ? `${TEAL}0e` : "#fff",
    color: off ? "#cbd5e1" : active ? TEAL : "#64748b", fontSize: 12, fontWeight: 600, cursor: off ? "default" : "pointer", fontFamily: FONT,
  });

  return createPortal(
    <div
      onClick={busy ? undefined : close}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16, fontFamily: FONT }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 560, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 16px 40px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: 16, boxSizing: "border-box" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#222" }}>パワーポイントから作成</h2>
          {!busy && <button type="button" onClick={close} aria-label="閉じる" style={{ border: "none", background: "transparent", color: "#999", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>}
        </div>

        {phase === "form" && (
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: 4 }}>
            {steps.map((s, i) => {
              const done = i < index;
              const active = i === index;
              return (
                <li key={s} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, background: done || active ? TEAL : "#e2e8f0", color: done || active ? "#fff" : "#94a3b8", boxShadow: active ? `0 0 0 3px ${TEAL}33` : "none" }}>
                    {done ? "✓" : i + 1}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: active ? TEAL : "#94a3b8", textAlign: "center", lineHeight: 1.3 }}>{STEP_LABEL[s]}</span>
                </li>
              );
            })}
          </ol>
        )}

        {phase === "form" && step === "pptx" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>パワーポイント（.pptx）を読み込む</div>
            <DropBox accept=".pptx" file={pptx} onPick={setPptx} title="ここに .pptx をドラッグ" hint={`またはクリックしてファイルを選択（${MAX_MB}MB まで）`} check={sizeCheck(".pptx")} icon={<PptxIcon />} />
            <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>ノート・オブジェクトの位置・アニメーション・埋め込み動画を読み取ります。</div>
          </div>
        )}

        {phase === "form" && step === "pdf" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>同じファイルの PDF を読み込む</div>
            <DropBox accept=".pdf,application/pdf" file={pdf} onPick={setPdf} title="ここに PDF をドラッグ" hint={`またはクリックしてファイルを選択（${MAX_MB}MB まで）`} check={sizeCheck(".pdf")} icon={<PdfIcon />} />
            {pptx && <div style={{ fontSize: 11, color: "#94a3b8" }}>パワーポイント：{pptx.name}</div>}
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px", fontSize: 12, color: "#78350f", lineHeight: 1.8 }}>
              フォントやレイアウトをそのまま使うため、PowerPoint で書き出した PDF が必要です。<br />
              <b>Windows</b>：ファイル → エクスポート → PDF/XPS ドキュメントの作成 → 発行<br />
              <b>Mac</b>：ファイル → エクスポート → ファイル形式「PDF」→ エクスポート<br />
              「スライド」のみを書き出してください（ノート付き・配布資料の形式は不可）。<br />
              非表示スライドは含めないでください（.pptx と枚数が合わなくなります）。「印刷 → PDF として保存」は使えません。
            </div>
          </div>
        )}

        {phase === "form" && step === "animation" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>読み込み時の自動アニメーション</div>
            <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
              {([["recommended", "おすすめ設定"], ["custom", "カスタマイズ"]] as const).map(([v, label]) => (
                <button key={v} type="button" onClick={() => setAnimationMode(v)}
                  style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: "none", background: animationMode === v ? "#fff" : "transparent", boxShadow: animationMode === v ? "0 1px 3px rgba(0,0,0,0.1)" : "none", color: animationMode === v ? TEAL : "#64748b", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                  {label}
                </button>
              ))}
            </div>
            {animationMode === "recommended" ? (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, color: "#475569" }}>
                <thead>
                  <tr style={{ color: "#94a3b8", textAlign: "left" }}>
                    <th style={{ fontWeight: 600, padding: "4px 0" }}>対象</th>
                    <th style={{ fontWeight: 600, padding: "4px 0" }}>登場</th>
                    <th style={{ fontWeight: 600, padding: "4px 0" }}>表示中の動き</th>
                  </tr>
                </thead>
                <tbody>
                  {RECOMMENDED_ROWS.map(([target, inLabel, effectLabel]) => (
                    <tr key={target} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "6px 0", fontWeight: 600 }}>{target}</td>
                      <td style={{ padding: "6px 0" }}>{inLabel}</td>
                      <td style={{ padding: "6px 0" }}>{effectLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ANIM_TARGETS.map(({ value: t, label }) => {
                  const a = animations[t];
                  const noSpeed = a.in === "none" || a.in === "zoom";
                  return (
                    <div key={t} style={{ border: "1px solid #f1f5f9", borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{label}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
                        <label style={{ flex: "1 1 150px", display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontSize: 10, color: "#94a3b8" }}>登場</span>
                          <select value={a.in} onChange={(e) => setAnim(t, { in: e.target.value })} style={{ ...inputStyle, padding: "7px 8px", fontSize: 12 }}>
                            {DEFAULT_IN_GROUPS.map((g) => (
                              <optgroup key={g.group} label={g.group}>
                                {g.items.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                              </optgroup>
                            ))}
                          </select>
                        </label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontSize: 10, color: "#94a3b8" }}>速さ</span>
                          <div style={{ display: "flex", gap: 3 }}>
                            {SPEEDS.map((sp) => (
                              <button key={sp.label} type="button" disabled={noSpeed} onClick={() => setAnim(t, { speed: sp.value })}
                                style={{ ...chip(a.speed === sp.value && !noSpeed, noSpeed), padding: "6px 8px", fontSize: 11 }}>
                                {sp.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <label style={{ flex: "1 1 130px", display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontSize: 10, color: "#94a3b8" }}>表示中の動き</span>
                          <select value={a.effect} onChange={(e) => setAnim(t, { effect: e.target.value })} style={{ ...inputStyle, padding: "7px 8px", fontSize: 12 }}>
                            {DEFAULT_EFFECTS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                          </select>
                        </label>
                      </div>
                    </div>
                  );
                })}
                <button type="button" onClick={() => setAnimations(RECOMMENDED_ANIMATIONS)}
                  style={{ alignSelf: "flex-start", border: "none", background: "none", color: TEAL, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: FONT }}>
                  おすすめ設定に戻す
                </button>
              </div>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569", cursor: "pointer" }}>
              <input type="checkbox" checked={stagger} onChange={(e) => setStagger(e.target.checked)} />
              上から順に 1 つずつ表示する
            </label>
            <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
              PowerPoint で登場アニメーションを設定しているオブジェクトは、そちらを優先します。背景は PowerPoint の画面切り替えがあればそちらを優先します。
            </div>
            <details style={{ fontSize: 11, color: "#64748b", background: "#f8fafc", borderRadius: 8, padding: "8px 12px" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>反映できる PowerPoint のアニメーション・画面切り替え</summary>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, lineHeight: 1.6 }}>
                <div><b>アニメーション（開始・終了）</b>：{SUPPORTED_ANIMATIONS.map((a) => a.label).join("、")}</div>
                <div><b>画面切り替え</b>：{SUPPORTED_TRANSITIONS.map((t) => t.label).join("、")}</div>
                <div>強調・軌跡は反映されず、そのまま表示されます。「クリック時」に始まるものはスライドの開始と同時に動きます。</div>
              </div>
            </details>
          </div>
        )}

        {phase === "form" && step === "narration" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>ナレーションとシーンの秒数</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={labelStyle}>ナレーション</span>
              {([[false, "生成しない（1 枚の秒数で並べる）"], [true, "ノートから生成する（スライドの長さを読み上げに合わせる）"]] as const).map(([v, label]) => (
                <label key={String(v)} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", padding: "10px 12px", borderRadius: 8, cursor: "pointer", border: `1.5px solid ${narrationOn === v ? TEAL : "#e2e8f0"}`, background: narrationOn === v ? `${TEAL}0b` : "#fff" }}>
                  <input type="radio" checked={narrationOn === v} onChange={() => setNarrationOn(v)} />
                  {label}
                </label>
              ))}
            </div>
            {narrationOn && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelStyle}>声</span>
                <VoicePicker value={voice} onChange={setVoice} maxHeight={260} />
              </div>
            )}
            {narrationOn && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={labelStyle}>スライドの長さ：ナレーション尺に合わせる</span>
                <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
                  {([["recommended", "おすすめ設定"], ["custom", "カスタマイズ"]] as const).map(([v, label]) => (
                    <button key={v} type="button" onClick={() => setPadMode(v)}
                      style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: "none", background: padMode === v ? "#fff" : "transparent", boxShadow: padMode === v ? "0 1px 3px rgba(0,0,0,0.1)" : "none", color: padMode === v ? TEAL : "#64748b", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {([["ナレーションの前に開ける", padBefore, setPadBefore, NARRATION_PAD_BEFORE], ["ナレーションの後に開ける", padAfter, setPadAfter, NARRATION_PAD_AFTER]] as const).map(([label, value, set, def]) => (
                    <label key={label} style={{ flex: "1 1 180px", display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 11, color: "#64748b" }}>{label}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="number" min={0} max={10} step={0.1} disabled={padMode === "recommended"} value={padMode === "recommended" ? def : value}
                          onChange={(e) => set(clampPad(e.target.value, def))}
                          style={{ ...inputStyle, width: 100, ...(padMode === "recommended" ? { background: "#f8fafc", color: "#94a3b8" } : {}) }} />
                        <span style={{ fontSize: 13, color: "#475569" }}>秒</span>
                      </div>
                    </label>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.7, background: "#f8fafc", borderRadius: 8, padding: "8px 12px" }}>
                  ノート（発表者メモ）を読み上げ、スライドの長さを「前 {pad.before} 秒＋読み上げ＋後 {pad.after} 秒」に合わせます。<br />
                  取り込み後、作る前にノートの文字数と消費クレジットを確認できます。<br />
                  無料プランはアカウントごとに 3 回まで無料です（作り直しは有料プラン）。
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={labelStyle}>{narrationOn ? "ノートが空のスライドの秒数" : "1 枚（1 シーン）の秒数"}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="number" min={1} max={60} value={secPerSlide}
                  onChange={(e) => setSecPerSlide(Math.min(60, Math.max(1, Number(e.target.value) || 1)))}
                  style={{ ...inputStyle, width: 100 }} />
                <span style={{ fontSize: 13, color: "#475569" }}>秒</span>
              </div>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>あとで動画編集画面で 1 枚ずつ変えられます。</span>
            </div>
          </div>
        )}

        {phase === "form" && step === "account" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{loggedIn ? "ログインしました" : "アカウント登録 または ログイン"}</div>
            {loggedIn ? (
              <div style={{ fontSize: 13, color: TEAL, fontWeight: 600 }}>✓ 次へ進んで、保存先を選んでください</div>
            ) : waiting === "email" ? (
              <div style={{ background: `${TEAL}0b`, border: `1px solid ${TEAL}44`, borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#334155", lineHeight: 1.8 }}>
                <b>{linkEmail}</b> にログイン用のリンクを送りました。<br />
                メールのリンクを開くと、この画面が自動で次に進みます（15 分以内に開いてください）。
                <div style={{ marginTop: 8 }}>
                  <button type="button" onClick={() => setWaiting(null)} style={{ border: "none", background: "none", color: TEAL, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: FONT }}>別の方法でログインする</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>アカウントをお持ちでない方は、そのまま無料で登録されます。</div>
                {providers === null && <div style={{ fontSize: 12, color: "#94a3b8" }}>読み込み中...</div>}
                {providers?.google && (
                  <button type="button" onClick={() => openProvider("google")} style={providerBtn}>
                    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
                    Google で続ける
                  </button>
                )}
                {providers?.microsoft && (
                  <button type="button" onClick={() => openProvider("microsoft")} style={providerBtn}>
                    <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden="true"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
                    Microsoft で続ける
                  </button>
                )}
                {waiting === "popup" && <div style={{ fontSize: 12, color: "#64748b" }}>開いた画面でログインしてください。終わると自動で次に進みます。</div>}
                {providers?.emailLink && (
                  <form onSubmit={sendLink} style={{ display: "flex", gap: 6 }}>
                    <input type="email" required autoComplete="email" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} placeholder="メールアドレス" style={{ ...inputStyle, flex: 1 }} />
                    <button type="submit" disabled={authBusy || !tsReady} style={{ padding: "0 14px", borderRadius: 8, border: "none", background: authBusy || !tsReady ? "#94a3b8" : TEAL, color: "#fff", fontSize: 12, fontWeight: 700, cursor: authBusy ? "wait" : "pointer", fontFamily: FONT, whiteSpace: "nowrap" }}>
                      リンクを受け取る
                    </button>
                  </form>
                )}
                {providers && (providers.google || providers.microsoft || providers.emailLink) && (
                  <button type="button" onClick={() => setShowPassword((v) => !v)} style={{ border: "none", background: "none", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0, textAlign: "left", fontFamily: FONT }}>
                    {showPassword ? "▾" : "▸"} メールアドレスとパスワードで登録・ログイン
                  </button>
                )}
                {(showPassword || (providers && !providers.google && !providers.microsoft && !providers.emailLink)) && (
                  <>
                    <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
                      {([["register", "新しく登録"], ["login", "ログイン"]] as const).map(([v, label]) => (
                        <button key={v} type="button" onClick={() => { setAuthTab(v); setAuthError(""); }}
                          style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: "none", background: authTab === v ? "#fff" : "transparent", boxShadow: authTab === v ? "0 1px 3px rgba(0,0,0,0.1)" : "none", color: authTab === v ? TEAL : "#64748b", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <form onSubmit={submitAuth} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={labelStyle}>メールアドレス</span>
                        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" style={inputStyle} />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={labelStyle}>パスワード{authTab === "register" && "（8 文字以上）"}</span>
                        <input type="password" required minLength={authTab === "register" ? 8 : undefined} autoComplete={authTab === "register" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
                      </label>
                      <button type="submit" disabled={authBusy || !tsReady} style={{ padding: "11px 0", borderRadius: 10, border: "none", background: authBusy || !tsReady ? "#94a3b8" : TEAL, color: "#fff", fontSize: 14, fontWeight: 700, cursor: authBusy ? "wait" : "pointer", fontFamily: FONT }}>
                        {authBusy ? "処理中..." : authTab === "register" ? "登録して次へ" : "ログインして次へ"}
                      </button>
                    </form>
                  </>
                )}
                <Turnstile onToken={setTsToken} resetKey={tsReset} />
                {authError && <div role="alert" style={{ fontSize: 12, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 10px" }}>{authError}</div>}
                <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
                  続けると<a href="/terms" target="_blank" rel="noreferrer" style={{ color: TEAL }}>利用規約</a>と<a href="/privacy" target="_blank" rel="noreferrer" style={{ color: TEAL }}>プライバシーポリシー</a>に同意したことになります。
                </div>
              </>
            )}
          </div>
        )}

        {phase === "form" && step === "workspace" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>保存先とプロジェクト名</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={labelStyle}>ワークスペース</span>
              {workspaces === null ? (
                <div style={{ fontSize: 12, color: "#94a3b8" }}>読み込み中...</div>
              ) : (
                <select value={wsChoice} onChange={(e) => setWsChoice(e.target.value)} style={inputStyle}>
                  {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  <option value={NEW_WS}>＋ 新しいワークスペースを作る</option>
                </select>
              )}
              {wsChoice === NEW_WS && (
                <input value={newWsName} onChange={(e) => setNewWsName(e.target.value)} placeholder="ワークスペース名" style={inputStyle} />
              )}
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={labelStyle}>プロジェクト名（空欄なら 1 枚目のタイトル）</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
            </label>
          </div>
        )}

        {phase === "form" && (
          <div style={{ display: "flex", gap: 8 }}>
            {index > 0 && (
              <button type="button" onClick={() => setStep(steps[index - 1])}
                style={{ padding: "11px 18px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#334155", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                戻る
              </button>
            )}
            {step === "workspace" ? (
              <button type="button" onClick={handleStart} disabled={workspaces === null}
                style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: workspaces === null ? "#cbd5e1" : TEAL, color: "#fff", fontSize: 14, fontWeight: 700, cursor: workspaces === null ? "not-allowed" : "pointer", fontFamily: FONT }}>
                取り込む
              </button>
            ) : step !== "account" || loggedIn ? (
              <button type="button" onClick={() => setStep(steps[index + 1])} disabled={!canNext}
                style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: canNext ? TEAL : "#cbd5e1", color: "#fff", fontSize: 14, fontWeight: 700, cursor: canNext ? "pointer" : "not-allowed", fontFamily: FONT }}>
                次へ
              </button>
            ) : null}
          </div>
        )}

        {(phase === "uploading" || phase === "converting") && (
          <ImportProgress phase={phase} uploadRatio={uploadRatio} progress={convProgress} withNarration={narrationOn} />
        )}

        {phase === "confirm" && estimate && (() => {
          const short = estimate.free ? estimate.freeLeft <= 0 : estimate.balance < estimate.credits;
          const rows: [string, string][] = [
            ["ノートのあるスライド", `${estimate.withNotes} / ${estimate.slides} 枚`],
            ["読み上げる文字数", `${estimate.chars.toLocaleString()} 文字`],
            estimate.free
              ? ["無料のナレーション生成", `残り ${estimate.freeLeft} / ${estimate.freeLimit} 回（今回 1 回使います）`]
              : ["消費クレジット", `${estimate.credits.toLocaleString()}（残り ${estimate.balance.toLocaleString()}）`],
          ];
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>ナレーションを作る前の確認</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: "#334155" }}>
                <tbody>
                  {rows.map(([k, v]) => (
                    <tr key={k} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 0", color: "#64748b" }}>{k}</td>
                      <td style={{ padding: "8px 0", fontWeight: 700, textAlign: "right" }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {short && (
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#78350f", lineHeight: 1.7 }}>
                  {estimate.free ? `無料プランのナレーション生成は ${estimate.freeLimit} 回まで使いました。` : "クレジットが足りません。"}
                  {estimate.free
                    ? <button type="button" onClick={openPricing} style={{ border: "none", background: "none", padding: 0, color: TEAL, fontSize: 12, fontWeight: 700, marginLeft: 4, cursor: "pointer", fontFamily: FONT }}>料金プランを見る</button>
                    : <a href="/pricing" target="_blank" rel="noreferrer" style={{ color: TEAL, fontWeight: 700, marginLeft: 4 }}>料金プランを見る</a>}
                  <br />ナレーションなしで続けることもできます。
                </div>
              )}
              {confirmError && <div role="alert" style={{ fontSize: 12, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 10px" }}>{confirmError}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => handleConfirm(false)} disabled={confirmBusy}
                  style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#334155", fontSize: 13, fontWeight: 700, cursor: confirmBusy ? "wait" : "pointer", fontFamily: FONT }}>
                  ナレーションなしで続ける
                </button>
                <button type="button" onClick={() => (estimate.free && short ? openPricing() : handleConfirm(true))} disabled={confirmBusy || (short && !estimate.free)}
                  style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: confirmBusy || (short && !estimate.free) ? "#cbd5e1" : TEAL, color: "#fff", fontSize: 14, fontWeight: 700, cursor: confirmBusy ? "wait" : short && !estimate.free ? "not-allowed" : "pointer", fontFamily: FONT }}>
                  ナレーションを作って続ける
                </button>
              </div>
            </div>
          );
        })()}

        {phase === "done" && result && (
          <>
            <div style={{ fontSize: 14, fontWeight: 700, color: TEAL }}>取り込みが完了しました</div>
            {result.project.aspectRatio && result.project.aspectRatio !== "16:9" && (
              <div style={{ background: `${TEAL}0b`, border: `1px solid ${TEAL}44`, borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#334155", lineHeight: 1.7 }}>
                動画の画角をスライドに合わせて <b>{result.project.aspectRatio}</b> にしました。16:9 がよければ、動画編集画面で画面サイズを変更してください。
              </div>
            )}
            {warnings.length > 0 && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
                {warnings.map((w, i) => <div key={i} style={{ fontSize: 11, color: "#92400e" }}>・{w.message}</div>)}
              </div>
            )}
            <button type="button" onClick={() => onImported(result.project, result.workspaceId)}
              style={{ padding: "11px 0", borderRadius: 10, border: "none", background: TEAL, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
              動画編集画面を開く
            </button>
          </>
        )}

        {phase === "error" && (() => {
          const guide = importGuide(errorCode);
          const actions =
            guide.action === "pdf" ? [{ label: "PDF を選び直す", onClick: () => backTo("pdf"), primary: true }] :
            guide.action === "pptx" ? [{ label: "パワーポイントを選び直す", onClick: () => backTo("pptx"), primary: true }] :
            [{ label: "もう一度取り込む", onClick: () => void handleStart(), primary: true }];
          return (
            <ErrorGuideBox guide={guide} code={errorCode || "CONVERT_FAILED"} detail={message} refId={errorRef} where="パワーポイントの取り込み" accent={TEAL}
              actions={[...actions, { label: "設定に戻る", onClick: () => backTo(null) }]} />
          );
        })()}
      </div>
    </div>
  , document.body);
}
