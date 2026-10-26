"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PptxImportWizard from "@/components/PptxImportWizard";
import { setOpenProject } from "@/lib/pptxHandoff";
import { loadDraft } from "@/lib/pptxDraft";
import type { PptxDraft } from "@/lib/pptxDraft";
import { entryParams, track } from "@/lib/analytics";
import PublicFooter from "@/components/PublicFooter";
import UserDashboardModal from "@/components/UserDashboardModal";
import { useAuthUser } from "@/lib/auth.user";
import { FREE_LIMITS } from "@/lib/pricing";

const FONT   = "'Noto Sans JP', sans-serif";
const TEAL   = "#169385";
const ORANGE = "#c2410c";
const INK    = "#0f172a";
const SUB    = "#64748b";
const MAX_MB = 200;

type DropState = "idle" | "over" | "error";

const STEPS = [
  { no: "1", title: ".pptx を読み込む", body: "このページにドラッグするだけ。ノート・配置・アニメーションを読み取ります。" },
  { no: "2", title: "PDF を追加する", body: "PowerPoint で「エクスポート → PDF」したファイルを追加。フォントをそのまま使うためです。" },
  { no: "3", title: "自動でタイムライン化", body: "文字・画像・図形をオブジェクトごとのクリップに分け、アニメーションを付けて並べます。" },
  { no: "4", title: "動画に書き出す", body: "動画編集画面で調整して、1080p の動画に書き出します（16:9 / 4:3 はスライドに合わせます）。" },
];

const FEATURES = [
  { title: "フォントもレイアウトもそのまま", body: "PDF から文字を取り出すので、使っているフォントが置き換わりません。" },
  { title: "オブジェクトごとに動かせる", body: "背景・文字・画像・図形が別々のクリップになり、1 つずつ編集できます。" },
  { title: "アニメーションを反映", body: "フェード・スライドイン・ワイプなど、PowerPoint のアニメーションと画面切り替えを再現します。" },
  { title: "おすすめの動きを自動で", body: "アニメーションのないスライドにも、文字はフェード、画像はスライドとズームを付けられます。" },
];

function SlideIllustration() {
  return (
    <svg viewBox="0 0 440 250" width="100%" style={{ maxWidth: 440, display: "block" }} aria-hidden="true">
      <defs>
        <linearGradient id="ps-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0f2f1" />
          <stop offset="1" stopColor="#cce7f5" />
        </linearGradient>
      </defs>
      <g transform="translate(10 20)">
        <rect width="190" height="120" rx="8" fill="url(#ps-bg)" stroke="#cbd5e1" />
        <rect x="14" y="16" width="90" height="12" rx="3" fill={INK} opacity="0.75" />
        <rect x="14" y="40" width="70" height="6" rx="3" fill={SUB} opacity="0.5" />
        <rect x="14" y="52" width="80" height="6" rx="3" fill={SUB} opacity="0.5" />
        <rect x="14" y="64" width="60" height="6" rx="3" fill={SUB} opacity="0.5" />
        <rect x="112" y="16" width="64" height="88" rx="8" fill={TEAL} opacity="0.55" />
        <circle cx="144" cy="50" r="12" fill="#fff" opacity="0.8" />
        <text x="95" y="146" textAnchor="middle" fontSize="11" fill={SUB} fontFamily={FONT}>スライド</text>
      </g>
      <path d="M212 80 h26" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M232 74 l8 6 -8 6" fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(252 6)">
        {[
          { y: 0,   w: 150, c: "#94a3b8", label: "背景" },
          { y: 36,  w: 110, c: INK,       label: "タイトル", x: 20 },
          { y: 72,  w: 120, c: SUB,       label: "本文", x: 34 },
          { y: 108, w: 90,  c: TEAL,      label: "画像", x: 48 },
        ].map((r) => (
          <g key={r.label}>
            <rect x={r.x ?? 0} y={r.y} width={r.w} height="24" rx="6" fill={r.c} opacity="0.85" />
            <text x={(r.x ?? 0) + 10} y={r.y + 16} fontSize="11" fill="#fff" fontFamily={FONT} fontWeight="700">{r.label}</text>
          </g>
        ))}
        <text x="88" y="154" textAnchor="middle" fontSize="11" fill={SUB} fontFamily={FONT}>オブジェクトごとのクリップ</text>
      </g>
      <g transform="translate(252 178)">
        <rect width="176" height="40" rx="8" fill="#fff" stroke="#e2e8f0" />
        <rect x="10" y="10" width="60" height="8" rx="3" fill={TEAL} opacity="0.7" />
        <rect x="74" y="10" width="40" height="8" rx="3" fill={ORANGE} opacity="0.6" />
        <rect x="118" y="10" width="48" height="8" rx="3" fill={TEAL} opacity="0.4" />
        <rect x="10" y="22" width="156" height="8" rx="3" fill="#cbd5e1" />
        <text x="88" y="58" textAnchor="middle" fontSize="11" fill={SUB} fontFamily={FONT}>タイムライン</text>
      </g>
    </svg>
  );
}

export default function PowerpointStart() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState]       = useState<DropState>("idle");
  const [message, setMessage]   = useState("");
  const { user, loading, isLoggedIn, logoutUser, refreshUser } = useAuthUser();
  const loggedIn = loading ? null : isLoggedIn;
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [file, setFile]         = useState<File | null>(null);
  const [draft, setDraft]       = useState<PptxDraft | null>(null);

  useEffect(() => {
    track("pptx_lp_view", entryParams());
    // 取り込みの途中（ログインでページを離れた等）なら、続きから再開する
    loadDraft().then((d) => {
      if (!d?.pptx) return;
      setDraft(d);
      setFile(d.pptx);
    });
  }, []);

  const accept = async (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pptx")) {
      setState("error");
      setMessage(".pptx ファイルを選んでください（.ppt や .key はそのままでは読み込めません。PowerPoint で .pptx に保存してください）");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setState("error");
      setMessage(`ファイルは ${MAX_MB}MB までです`);
      return;
    }
    setState("idle");
    setMessage("");
    setDraft(null);
    setFile(file);
  };

  const dropText =
    state === "over" ? "ここで離してください" :
    "ここに .pptx をドラッグ";

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: INK, fontFamily: FONT }}>
      <header style={{ maxWidth: 1080, margin: "0 auto", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center" }}>
          <img
            src="https://assets.hisui-ai.com/system/img/hisui_video_%E3%83%AD%E3%82%B4_01.png"
            alt="ヒスイAI"
            style={{ height: 28, width: "auto", objectFit: "contain", display: "block" }}
          />
        </a>
        {loggedIn === false && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a href="/contact" style={{ fontSize: 13, fontWeight: 700, color: "#475569", textDecoration: "none", padding: "6px 8px" }}>お問い合わせ</a>
            <a href="/auth?next=/powerpoint" style={{ fontSize: 13, fontWeight: 700, color: TEAL, textDecoration: "none", border: `1.5px solid ${TEAL}`, borderRadius: 999, padding: "6px 16px" }}>ログイン</a>
            <a href="/auth?tab=register&next=/powerpoint" style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: TEAL, textDecoration: "none", border: `1.5px solid ${TEAL}`, borderRadius: 999, padding: "6px 16px" }}>無料登録</a>
          </div>
        )}
        {loggedIn && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a href="/contact" style={{ fontSize: 13, fontWeight: 700, color: "#475569", textDecoration: "none", padding: "6px 8px" }}>お問い合わせ</a>
            <a href="/" style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: TEAL, textDecoration: "none", borderRadius: 999, padding: "7px 16px" }}>編集画面へ</a>
            <button
              type="button"
              onClick={() => setDashboardOpen(true)}
              title="ダッシュボードを開く"
              aria-label="ダッシュボードを開く"
              style={{ width: 34, height: 34, padding: 0, borderRadius: "50%", background: `${TEAL}22`, border: `2px solid ${TEAL}`, display: "flex", alignItems: "center", justifyContent: "center", color: TEAL, fontSize: 16, overflow: "hidden", cursor: "pointer", flexShrink: 0 }}
            >
              {user?.iconUrl
                ? <img src={user.iconUrl} alt={user.name ?? "User"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                : "✦"}
            </button>
          </div>
        )}
      </header>

      {dashboardOpen && (
        <UserDashboardModal
          onClose={() => setDashboardOpen(false)}
          onLogout={async () => { setDashboardOpen(false); await logoutUser(); }}
          userIconUrl={user?.iconUrl}
          userName={user?.name}
          onProfileUpdated={() => refreshUser()}
        />
      )}

      <main>
        <section style={{ background: "linear-gradient(180deg, #f0fdfa 0%, #ffffff 100%)", padding: "40px 20px 56px" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 40, alignItems: "center" }}>
            <div style={{ flex: "1 1 420px", minWidth: 0 }}>
              <span style={{ display: "inline-block", fontSize: 12, fontWeight: 700, color: ORANGE, background: "#fff1e6", borderRadius: 999, padding: "4px 12px" }}>パワーポイント → 動画化</span>
              <h1 style={{ fontSize: "clamp(28px, 4.4vw, 44px)", lineHeight: 1.3, fontWeight: 800, margin: "16px 0 14px", letterSpacing: "0.01em" }}>
                パワーポイントを、<br />そのまま動く動画に。
              </h1>
              <p style={{ fontSize: 15, lineHeight: 1.9, color: "#334155", margin: 0 }}>
                スライドを読み込むだけで、文字・画像・図形をオブジェクトごとに分けた動画プロジェクトを作ります。
                フォントもレイアウトもそのままに、アニメーションも自動で付けられます。
              </p>
            </div>
            <div style={{ flex: "1 1 360px", minWidth: 0, display: "flex", justifyContent: "center" }}>
              <SlideIllustration />
            </div>
          </div>

          <div style={{ maxWidth: 1080, margin: "36px auto 0" }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
              onDragOver={(e) => { e.preventDefault(); setState("over"); }}
              onDragLeave={() => state === "over" && setState("idle")}
              onDrop={(e) => { e.preventDefault(); setState("idle"); void accept(e.dataTransfer.files?.[0]); }}
              style={{
                borderRadius: 20, padding: "48px 20px", textAlign: "center", cursor: "pointer",
                border: `2.5px dashed ${state === "over" ? TEAL : state === "error" ? "#f87171" : "#94d3c9"}`,
                background: state === "over" ? "#ccfbf1" : "#ffffffcc",
                boxShadow: state === "over" ? `0 0 0 6px ${TEAL}22` : "0 10px 30px rgba(15,23,42,0.06)",
                transition: "all 0.15s",
              }}
            >
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block", margin: "0 auto 12px" }}>
                <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                <path d="M12 4v11" />
                <path d="M7.5 8.5 12 4l4.5 4.5" />
              </svg>
              <div style={{ fontSize: "clamp(18px, 2.6vw, 24px)", fontWeight: 800, color: INK }}>{dropText}</div>
              <div style={{ fontSize: 13, color: SUB, marginTop: 8 }}>またはクリックしてファイルを選択（{MAX_MB}MB まで。無料プランは {FREE_LIMITS.pptxMB}MB・{FREE_LIMITS.slides} 枚まで）</div>
              {state === "error" && <div role="alert" style={{ fontSize: 13, color: "#b91c1c", marginTop: 14, lineHeight: 1.7 }}>{message}</div>}
              {loggedIn === false && state !== "error" && (
                <div style={{ fontSize: 12, color: SUB, marginTop: 14 }}>読み込んだあとに PDF の追加・アニメーション・アカウント登録（無料）を順に進めます</div>
              )}
              <input ref={inputRef} type="file" accept=".pptx" style={{ display: "none" }} onChange={(e) => { void accept(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1080, margin: "0 auto", padding: "56px 20px 24px" }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 24px", textAlign: "center" }}>4 ステップで動画になります</h2>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {STEPS.map((s) => (
              <li key={s.no} style={{ border: "1px solid #e2e8f0", borderRadius: 16, padding: "18px 18px 16px", background: "#fff" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: TEAL, color: "#fff", fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.no}</div>
                <div style={{ fontSize: 15, fontWeight: 800, margin: "12px 0 6px" }}>{s.title}</div>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.8 }}>{s.body}</div>
              </li>
            ))}
          </ol>
        </section>

        <section style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 20px 24px" }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 24px", textAlign: "center" }}>できること</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ borderRadius: 16, padding: "18px", background: "#f8fafc" }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6, color: TEAL }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.8 }}>{f.body}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 64px" }}>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 16, padding: "18px 20px", fontSize: 13, color: "#475569", lineHeight: 1.9 }}>
            <div style={{ fontWeight: 800, color: INK, marginBottom: 6 }}>ご利用の前に</div>
            <div>・PDF は「スライドのみ」で書き出してください。ノート付きや配布資料の形式では読み込めません。</div>
            <div>・Google スライドや Keynote から書き出した .pptx と PDF も使えますが、位置やアニメーションがずれることがあります。</div>
            <div>・強調や軌跡のアニメーションは反映されず、そのまま表示されます。</div>
            <div>・無料プランは {FREE_LIMITS.pptxMB}MB・{FREE_LIMITS.slides} 枚までのパワーポイントを取り込み、透かし入りで累計 {FREE_LIMITS.exports} 回書き出せます。ノートからのナレーション生成は累計 {FREE_LIMITS.narrationImports} 回まで無料です。<a href="/pricing" style={{ color: TEAL, fontWeight: 700 }}>料金プラン</a></div>
          </div>
        </section>
      </main>

      <PublicFooter />

      {file && loggedIn !== null && (
        <PptxImportWizard
          isLoggedIn={loggedIn}
          initialPptx={file}
          initialDraft={draft}
          onClose={() => { setFile(null); setDraft(null); }}
          onImported={(project, workspaceId) => {
            setOpenProject(workspaceId, project.id);
            router.push("/");
          }}
        />
      )}
    </div>
  );
}
