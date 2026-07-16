"use client";

import { useState } from "react";

const GRAD  = "linear-gradient(45deg, #5184F0, #169385)";
const TEAL  = "#169385";
const BLUE  = "#5184F0";
const FONT  = "'Noto Sans JP', sans-serif";

// ─── TOC ─────────────────────────────────────────────────────────────────────

type NavItem =
  | { type: "link";  id: string; label: string; indent?: boolean }
  | { type: "group"; label: string };

const NAV: NavItem[] = [
  { type: "link",  id: "overview",     label: "ヒスイAIとは" },
  { type: "group", label: "ご利用を検討の方へ" },
  { type: "link",  id: "free",         label: "無料アカウント",    indent: true },
  { type: "link",  id: "service",      label: "サービス・料金",    indent: true },
  { type: "link",  id: "start",        label: "はじめかた" },
  { type: "link",  id: "workspace",    label: "ワークスペース" },
  { type: "link",  id: "settings",     label: "ワークスペース設定" },
  { type: "link",  id: "account",      label: "アカウント管理" },
  { type: "link",  id: "ai-models",    label: "AIモデルリスト" },
  { type: "group", label: "コンテパネル" },
  { type: "link",  id: "conte-panel",  label: "コンテパネルとは",  indent: true },
  { type: "link",  id: "conte",        label: "コンテ作成",        indent: true },
  { type: "link",  id: "ai-image",     label: "AI画像生成",        indent: true },
  { type: "link",  id: "ai-video",     label: "AI動画生成",        indent: true },
  { type: "link",  id: "narration",    label: "AIナレーション",    indent: true },
  { type: "group", label: "動画編集パネル" },
  { type: "link",  id: "editor-panel", label: "動画編集パネルとは", indent: true },
  { type: "link",  id: "project",      label: "プロジェクト",      indent: true },
  { type: "link",  id: "editor",       label: "動画編集エディタ",  indent: true },
  { type: "link",  id: "files",        label: "ファイルパネル",    indent: true },
  { type: "link",  id: "bgm",          label: "BGM生成",           indent: true },
  { type: "link",  id: "deco",         label: "装飾テロップ",      indent: true },
  { type: "link",  id: "bulk",         label: "一括編集（AI）",    indent: true },
  { type: "link",  id: "export",       label: "書き出し",          indent: true },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 64, scrollMarginTop: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 4, height: 28, borderRadius: 2, background: GRAD, flexShrink: 0 }} />
        <h2 className="manual-section-title" style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1e293b", fontFamily: FONT }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#334155", fontFamily: FONT,
        paddingLeft: 10, borderLeft: `3px solid ${TEAL}` }}>{title}</h3>
      <div style={{ paddingLeft: 2 }}>{children}</div>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "0 0 12px", fontSize: 14, color: "#475569", lineHeight: 1.8, fontFamily: FONT }}>{children}</p>;
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px",
      marginBottom: 12, ...style }}>{children}</div>
  );
}

function Callout({ color = BLUE, icon, children }: { color?: string; icon: string; children: React.ReactNode }) {
  const bg     = color === TEAL ? "#f0fdf9" : "#eff6ff";
  const border = color === TEAL ? "#a7f3d0" : "#bfdbfe";
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 16px",
      display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-start" }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.7, fontFamily: FONT }}>{children}</div>
    </div>
  );
}

function Badge({ label, color = "#5184F0" }: { label: string; color?: string }) {
  return (
    <span style={{ display: "inline-block", background: color + "18", color, border: `1px solid ${color}44`,
      borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, fontFamily: FONT, marginRight: 6 }}>{label}</span>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div style={{ overflowX: "auto", marginBottom: 16 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: FONT }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: "#475569", fontWeight: 700,
                borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: "1px solid #f1f5f9" }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: "9px 14px", color: "#334155", verticalAlign: "top" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StepList({ steps }: { steps: { n: string | number; title: string; desc: string }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: GRAD, color: "#fff",
            fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginTop: 1, fontFamily: FONT }}>{s.n}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", fontFamily: FONT, marginBottom: 2 }}>{s.title}</div>
            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.65, fontFamily: FONT }}>{s.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ModelTable({ rows }: { rows: [string, string, "free" | "paid"][] }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
      {rows.map(([name, desc, plan], i) => (
        <div key={i} className="model-row" style={{ display: "flex", alignItems: "stretch",
          borderBottom: i < rows.length - 1 ? "1px solid #f1f5f9" : "none",
          background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
          <div className="model-name" style={{ width: 200, flexShrink: 0, padding: "11px 14px",
            borderRight: "1px solid #f1f5f9", display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", fontFamily: FONT }}>{name}</span>
          </div>
          <div className="model-desc" style={{ flex: 1, padding: "11px 14px", fontSize: 12, color: "#475569",
            lineHeight: 1.65, fontFamily: FONT }}>{desc}</div>
          <div className="model-badge" style={{ flexShrink: 0, padding: "11px 14px", borderLeft: "1px solid #f1f5f9",
            display: "flex", alignItems: "center" }}>
            {plan === "free"
              ? <span style={{ background: "#f0fdf9", color: TEAL, border: `1px solid #a7f3d0`,
                  borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, fontFamily: FONT, whiteSpace: "nowrap" }}>無料</span>
              : <span style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fcd34d",
                  borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, fontFamily: FONT, whiteSpace: "nowrap" }}>有料</span>
            }
          </div>
        </div>
      ))}
    </div>
  );
}

function FeatureList({ items }: { items: [string, string][] }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
      {items.map(([label, desc], i) => (
        <div key={i} className="feature-row" style={{ display: "flex",
          borderBottom: i < items.length - 1 ? "1px solid #f1f5f9" : "none" }}>
          <div className="feature-label" style={{ width: 130, flexShrink: 0, background: "#f8fafc", padding: "11px 14px",
            borderRight: "1px solid #e2e8f0", display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#334155", fontFamily: FONT }}>{label}</span>
          </div>
          <div style={{ flex: 1, padding: "11px 14px", fontSize: 13, color: "#475569",
            lineHeight: 1.65, fontFamily: FONT }}>{desc}</div>
        </div>
      ))}
    </div>
  );
}

function GridCards({ items }: { items: { icon: string; title: string; desc: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
      {items.map((it, i) => (
        <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>{it.icon}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", fontFamily: FONT, marginBottom: 4 }}>{it.title}</div>
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, fontFamily: FONT }}>{it.desc}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ManualPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: FONT }}>
      <style>{`
        /* ── Mobile breakpoint ── */
        @media (max-width: 768px) {
          .manual-sidebar    { display: none !important; }
          .manual-hamburger  { display: flex !important; }
          .manual-back-link  { display: none !important; }
          .manual-content    { padding-left: 0 !important; }
          .manual-header     { padding: 0 14px !important; }
          .manual-container  { padding: 0 14px !important; }
          .manual-section-title { font-size: 18px !important; }

          /* Hero */
          .manual-hero       { padding: 22px 18px !important; border-radius: 12px !important; margin-bottom: 32px !important; }
          .manual-hero-title { font-size: 20px !important; }
          .manual-hero-desc  { font-size: 13px !important; }

          /* Panel flow: stack vertically */
          .manual-panel-flow  { flex-direction: column !important; }
          .manual-panel-arrow { display: none !important; }

          /* ModelTable: stack name + desc on top, badge stays on right */
          .model-row   { flex-wrap: wrap !important; align-items: flex-start !important; }
          .model-name  { width: 100% !important; border-right: none !important; border-bottom: 1px solid #f1f5f9 !important; padding-bottom: 8px !important; }
          .model-desc  { flex: 1 1 auto !important; border-bottom: 1px solid #f1f5f9 !important; min-width: 0 !important; }
          .model-badge { border-left: none !important; padding-top: 8px !important; align-self: flex-end !important; }

          /* FeatureList: stack label + desc */
          .feature-row   { flex-direction: column !important; }
          .feature-label { width: 100% !important; border-right: none !important; border-bottom: 1px solid #e2e8f0 !important; padding: 9px 14px !important; }
        }

        /* ── Desktop: hide mobile-only elements ── */
        @media (min-width: 769px) {
          .manual-hamburger { display: none !important; }
          .manual-drawer-overlay, .manual-drawer { display: none !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <header className="manual-header" style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 100,
        padding: "0 32px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: GRAD, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 13, flexShrink: 0 }}>✦</div>
          <span style={{ fontSize: 15, fontWeight: 800, backgroundImage: GRAD,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", whiteSpace: "nowrap" }}>ヒスイAI</span>
          <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 2, whiteSpace: "nowrap" }}>マニュアル</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <a className="manual-back-link" href="/" style={{ fontSize: 13, color: BLUE, textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>← エディタに戻る</a>
          <button
            className="manual-hamburger"
            onClick={() => setMenuOpen(true)}
            aria-label="メニューを開く"
            style={{ display: "none", flexDirection: "column", justifyContent: "center", gap: 5,
              background: "none", border: "none", cursor: "pointer", padding: "6px 4px" }}
          >
            <span style={{ width: 22, height: 2, background: "#334155", borderRadius: 2, display: "block" }} />
            <span style={{ width: 22, height: 2, background: "#334155", borderRadius: 2, display: "block" }} />
            <span style={{ width: 22, height: 2, background: "#334155", borderRadius: 2, display: "block" }} />
          </button>
        </div>
      </header>

      <div className="manual-container" style={{ display: "flex", maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>

        {/* ── Sidebar TOC ── */}
        <aside className="manual-sidebar" style={{ width: 220, flexShrink: 0, paddingTop: 32, paddingRight: 24, position: "sticky",
          top: 72, height: "calc(100vh - 72px)", overflowY: "auto" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em",
            margin: "0 0 10px", textTransform: "uppercase" }}>目次</p>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV.map((item, i) => {
              if (item.type === "group") {
                return (
                  <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8",
                    letterSpacing: "0.08em", padding: "12px 10px 4px", textTransform: "uppercase", fontFamily: FONT }}>
                    {item.label}
                  </div>
                );
              }
              const active = activeSection === item.id;
              return (
                <button key={item.id} onClick={() => scrollTo(item.id)}
                  style={{ textAlign: "left",
                    background: active ? BLUE + "14" : "none",
                    border: "none", borderRadius: 6,
                    padding: item.indent ? "5px 10px 5px 18px" : "6px 10px",
                    fontSize: item.indent ? 12 : 13,
                    color: active ? BLUE : item.indent ? "#64748b" : "#475569",
                    fontWeight: active ? 700 : 400,
                    cursor: "pointer", fontFamily: FONT, transition: "all 0.15s" }}>
                  {item.indent ? "· " : ""}{item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Content ── */}
        <main className="manual-content" style={{ flex: 1, minWidth: 0, paddingTop: 32, paddingBottom: 80, paddingLeft: 8 }}>

          {/* Hero */}
          <div className="manual-hero" style={{ background: GRAD, borderRadius: 16, padding: "36px 40px", marginBottom: 48, color: "#fff" }}>
            <h1 className="manual-hero-title" style={{ margin: "0 0 10px", fontSize: 28, fontWeight: 900, fontFamily: FONT }}>ヒスイAI マニュアル</h1>
            <p className="manual-hero-desc" style={{ margin: 0, fontSize: 15, opacity: 0.9, lineHeight: 1.7 }}>
              動画制作のプロが本気で設計した、AI動画制作自動化ツールの完全ガイドです。
            </p>
          </div>

          {/* ═══════════════════════════════════════════════════════
              ヒスイAIとは
          ════════════════════════════════════════════════════════ */}
          <Section id="overview" title="ヒスイAIとは">
            <P>
              ヒスイAIは、動画制作会社・株式会社LUVASが自社の制作現場で使うために開発してきたツールをサービス化したものです。
              台本作成からナレーション・画像・動画生成、タイムライン編集・書き出しまで、
              動画制作の全工程をブラウザ上で完結できます。
            </P>

            {/* 2パネルフロー */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", fontFamily: FONT,
                marginBottom: 14, textAlign: "center", letterSpacing: "0.05em" }}>
                ── ヒスイAIは「2つのパネル」で動画制作を完結する ──
              </div>

              <div className="manual-panel-flow" style={{ display: "flex", gap: 12, alignItems: "stretch", flexWrap: "wrap" }}>

                {/* コンテパネル */}
                <div style={{ flex: "1 1 260px", background: "#eff6ff", border: "2px solid #bfdbfe",
                  borderRadius: 16, padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <div style={{ background: BLUE, color: "#fff", borderRadius: 8, padding: "4px 12px",
                      fontSize: 12, fontWeight: 800, fontFamily: FONT }}>コンテパネル</div>
                    <span style={{ fontSize: 12, color: "#64748b", fontFamily: FONT }}>素材を作る</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { icon: "📝", label: "整理されていないテキスト・情報を入力" },
                      { icon: "↓", label: "", arrow: true },
                      { icon: "📄", label: "AI台本作成　シーン分割" },
                      { icon: "↓", label: "", arrow: true },
                      { icon: "🖼", label: "各シーンに画像を生成" },
                      { icon: "🎬", label: "各シーンに動画を生成" },
                      { icon: "🎤", label: "各シーンにナレーションを生成" },
                      { icon: "💬", label: "各シーンに字幕を設定" },
                    ].map((row, i) =>
                      row.arrow ? (
                        <div key={i} style={{ textAlign: "center", color: "#93c5fd", fontSize: 18, lineHeight: 1 }}>↓</div>
                      ) : (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8,
                          background: "#fff", borderRadius: 8, padding: "7px 12px",
                          fontSize: 12, color: "#334155", fontFamily: FONT, fontWeight: 500 }}>
                          <span>{row.icon}</span>{row.label}
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* 矢印（モバイルでは非表示） */}
                <div className="manual-panel-arrow" style={{ display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, padding: "0 4px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, fontFamily: FONT,
                      textAlign: "center", lineHeight: 1.4 }}>動画プロジェクト<br />に変換</div>
                    <div style={{ fontSize: 24, color: TEAL }}>→</div>
                  </div>
                </div>

                {/* 動画編集パネル */}
                <div style={{ flex: "1 1 260px", background: "#f0fdf9", border: "2px solid #a7f3d0",
                  borderRadius: 16, padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <div style={{ background: TEAL, color: "#fff", borderRadius: 8, padding: "4px 12px",
                      fontSize: 12, fontWeight: 800, fontFamily: FONT }}>動画編集パネル</div>
                    <span style={{ fontSize: 12, color: "#64748b", fontFamily: FONT }}>一本に仕上げる</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { icon: "🗂", label: "素材がタイムラインに並ぶ" },
                      { icon: "✂️", label: "クリップ配置・トリム・順番調整" },
                      { icon: "✨", label: "装飾テロップ・BGMを追加" },
                      { icon: "↓", label: "", arrow: true },
                      { icon: "🤖", label: "AI一括編集でまとめて整える" },
                      { icon: "↓", label: "", arrow: true },
                      { icon: "🎥", label: "書き出し → 完成動画" },
                    ].map((row, i) =>
                      row.arrow ? (
                        <div key={i} style={{ textAlign: "center", color: "#6ee7b7", fontSize: 18, lineHeight: 1 }}>↓</div>
                      ) : (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8,
                          background: "#fff", borderRadius: 8, padding: "7px 12px",
                          fontSize: 12, color: "#334155", fontFamily: FONT, fontWeight: 500 }}>
                          <span>{row.icon}</span>{row.label}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Callout icon="💡">
              コンテパネルで素材をまとめて作り、動画編集パネルで一本に仕上げる——この2ステップが基本的な使い方です。
              動画編集パネルから直接スタートして自分でファイルをアップロードすることも可能です。
            </Callout>
            <Callout icon="🔁" color={TEAL}>
              <b>採用AIモデルについて</b><br />
              画像・動画・ナレーション生成に使用するAIモデルは、ユーザー様の利用用途に合わせて選定・差し替えを行っています。
              AIモデルの優位性は日々入れ替わっており、ヒスイAIではその時点で最適なモデルを随時導入しています。
              マニュアルに記載のモデルはあくまで現時点の構成です。担当者にご相談いただければ用途に最適なモデルをご提案します。
            </Callout>
          </Section>

          {/* ═══════════════════════════════════════════════════════
              無料アカウント
          ════════════════════════════════════════════════════════ */}
          <Section id="free" title="無料アカウント">
            <P>
              ヒスイAIは現在、導入を検討しているユーザー様に対して、
              担当者との打ち合わせを経た上で無料アカウントを配布しています。
              まずはお気軽にお問い合わせください。
            </P>
            <SubSection title="無料アカウントの取得方法">
              <StepList steps={[
                { n: 1, title: "お問い合わせ・申し込み", desc: "サービスサイトのお問い合わせフォームよりご連絡ください。" },
                { n: 2, title: "担当者との打ち合わせ", desc: "用途・利用規模・希望機能などを担当者がヒアリングします（オンライン30分程度）。" },
                { n: 3, title: "無料アカウント発行", desc: "打ち合わせ後、アカウントを発行します。発行後すぐにすべての機能をお試しいただけます。" },
              ]} />
            </SubSection>
            <SubSection title="無料プランの利用制限">
              <P>無料アカウントでは以下の機能に回数制限があります。それ以外の機能は制限なく利用できます。</P>
              <Table
                headers={["機能", "無料プラン", "備考"]}
                rows={[
                  ["AI画像生成", "20回まで", "コンテ内の画像生成・エディタからの生成を含む。使用モデルはGoogle Nano Banana 2 Lite固定"],
                  ["AI台本作成（スクリプト自動生成）", "5回まで", "コンテ作成モードでのシーン別スクリプト生成"],
                  ["AI動画生成", "10回まで", "使用モデルはGoogle Veo 3.1 Lite固定"],
                  ["AIナレーション", "20回まで", "使用モデルはGoogle Gemini 3.1 Flash TTS固定"],
                  ["BGM生成", "5回まで", "使用モデルはGoogle Lyria 2固定（Lyria 3 Proは有料プランのみ）"],
                  ["装飾テロップ", "制限なし", ""],
                  ["動画編集エディタ", "制限なし", "タイムライン編集・書き出しを含む"],
                  ["一括編集（AI）", "制限なし", ""],
                  ["ワークスペース・プロジェクト数", "制限なし", ""],
                ]}
              />
              <Callout icon="💡">
                残クレジット数はサイドパネルのユーザーアイコン → 「ダッシュボード」から確認できます。
                クレジットが不足した場合はプランのアップグレードまたは追加付与が可能です。担当者にご相談ください。
              </Callout>
            </SubSection>
          </Section>

          {/* ═══════════════════════════════════════════════════════
              サービス・料金
          ════════════════════════════════════════════════════════ */}
          <Section id="service" title="サービス・料金">
            <SubSection title="サービスの提供経緯">
              <Card>
                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.9, fontFamily: FONT }}>
                  ヒスイAIは、動画制作会社・株式会社LUVASが自社の制作業務効率化のために構築してきたAIコンテツールをサービス化したものです。<br /><br />
                  当初はお取引のある企業様のみへの限定提供でしたが、ご利用いただいた方々から大きな反響をいただき、
                  現在は順次ウェブからの募集も開始しています。<br /><br />
                  プロの制作現場で実際に使われてきたツールであるため、実務に即した設計と使いやすさが特徴です。
                </div>
              </Card>
            </SubSection>
            <SubSection title="日次アップデート方針">
              <Callout icon="🔄" color={TEAL}>
                ヒスイAIは現在、<b>1日単位で機能の拡充・アップデート</b>を継続して行っています。
                打ち合わせ時にヒアリングしたご要望を反映した機能追加を前提にしたお見積り提案も行っており、
                ユーザー様のニーズに合わせてサービスを育てていく運営スタイルです。
              </Callout>
              <P>ご利用開始後も継続的に新機能が追加・改善されていきます。アップデート情報は担当者よりご連絡します。</P>
            </SubSection>
            <SubSection title="料金・見積もりについて">
              <P>
                現在の提供方針では、<b>ユーザー様ごとに個別のお見積もり</b>を行っています。
                利用用途・想定する生成量・必要な機能・サポート体制などをお伺いした上で最適なプランをご提案します。
              </P>
              <Table
                headers={["確認事項", "内容"]}
                rows={[
                  ["利用用途", "どんな動画を・どの工程で使いたいか"],
                  ["想定出力量", "月間の画像・動画・ナレーション生成の目安"],
                  ["必要機能", "コンテ作成 / 動画編集 / テロップ / AIナレーション など"],
                  ["サポート体制", "専任担当 / チャットサポート の要否"],
                ]}
              />
              <Callout icon="📝">
                まずは無料アカウントでお試しいただいた上で、利用状況をもとにプランをご提案することも可能です。
              </Callout>
            </SubSection>
            <SubSection title="サポートについて">
              <P>
                ご希望のプランに応じて、<b>専任のサポート担当者が付くプラン</b>も用意しています。
                Slack・Chatwork・LINEなど希望されるチャットツールで御社専用のグループを作成し、
                スムーズに連絡・対応させていただきます。
              </P>
              <GridCards items={[
                { icon: "💬", title: "専用チャットグループ", desc: "Slack / Chatwork / LINE など希望ツールで御社専用グループを作成" },
                { icon: "👤", title: "専任担当者", desc: "操作方法・機能追加要望・トラブル対応を一括でサポート" },
                { icon: "🔧", title: "カスタム機能開発", desc: "打ち合わせでヒアリングした機能要件を実装してご提案" },
              ]} />
            </SubSection>
          </Section>

          {/* ═══════════════════════════════════════════════════════
              はじめかた
          ════════════════════════════════════════════════════════ */}
          <Section id="start" title="はじめかた">
            <StepList steps={[
              { n: 1, title: "ログイン / アカウント作成", desc: "ページ左上の「ログイン / 新規登録」をクリックしてアカウントを作成またはログインします。" },
              { n: 2, title: "ワークスペースを作成", desc: "サイドパネル上部のワークスペース選択エリアから「新規作成」を選び、名前を入力して作成します。" },
              { n: 3, title: "コンテを作成（推奨）またはプロジェクトを作成", desc: "コンテパネルでコンテを作り素材を一括生成するか、動画編集パネルで直接プロジェクト（SEQ）を作成して編集します。" },
              { n: 4, title: "動画プロジェクトに変換 / ファイルをアップロード", desc: "コンテから変換するか、ファイルパネルの「アップロード」ボタンで動画・画像・音声ファイルを追加します。" },
              { n: 5, title: "タイムラインで編集", desc: "ファイルをタイムラインに配置し、テロップ・BGM・トランジションを追加して仕上げます。" },
              { n: 6, title: "書き出し", desc: "左パネルの「書き出し」タブから書き出し方式を選んで動画を出力します。" },
            ]} />
          </Section>

          {/* ═══════════════════════════════════════════════════════
              ワークスペース
          ════════════════════════════════════════════════════════ */}
          <Section id="workspace" title="ワークスペース">
            <P>
              ワークスペースはプロジェクト・ファイル・コンテをまとめるグループです。
              チームや用途ごとにワークスペースを分けて管理できます。
            </P>
            <SubSection title="ワークスペースの操作">
              <Table
                headers={["操作", "手順"]}
                rows={[
                  ["新規作成", "サイドパネル上部のワークスペース名横のドロップダウンを開き、名前を入力して作成"],
                  ["切り替え", "ドロップダウンから別のワークスペースを選択"],
                  ["名前変更", "ドロップダウン内の鉛筆アイコンをクリック → 名前を編集 → Enter で確定"],
                  ["削除", "ドロップダウン内のゴミ箱アイコン → 確認ダイアログで「削除」（ファイル・プロジェクトは保持）"],
                ]}
              />
            </SubSection>
          </Section>

          {/* ═══════════════════════════════════════════════════════
              ワークスペース設定
          ════════════════════════════════════════════════════════ */}
          <Section id="settings" title="ワークスペース設定">
            <P>
              各モーダル内の「設定」ボタン、またはワークスペースバーの歯車アイコンから開きます。
              設定はワークスペース単位でクラウドに保存されます。
            </P>
            <SubSection title="画像生成設定">
              <Table
                headers={["設定", "内容"]}
                rows={[
                  ["デフォルトモデル", "担当者にご確認ください（ユーザーの用途に合わせて設定）"],
                  ["デフォルトアスペクト比", "16:9 / 9:16 / 1:1 / 4:3 / 3:4"],
                  ["共通ルール", "全プロンプトに自動付加されるルール（例：テキスト排除、日本人描写）"],
                  ["NGプロンプト", "生成に含めないキーワード（ネガティブプロンプト）"],
                ]}
              />
            </SubSection>
            <SubSection title="動画生成設定">
              <Table
                headers={["設定", "内容"]}
                rows={[
                  ["デフォルトモデル", "担当者にご確認ください（ユーザーの用途に合わせて設定）"],
                  ["デフォルト解像度", "720p / 1080p"],
                  ["デフォルト尺", "モデルに応じた秒数（4〜12秒）"],
                  ["共通ルール", "全プロンプトに自動付加されるルール"],
                  ["NGプロンプト", "生成に含めないキーワード"],
                ]}
              />
            </SubSection>
            <SubSection title="ナレーション設定">
              <Table
                headers={["設定", "内容"]}
                rows={[
                  ["デフォルト音声", "30種の音声から選択（男性/女性）"],
                  ["デフォルト話速", "とてもゆっくり〜速い（5段階）"],
                  ["デフォルトトーン", "標準・明るい・落ち着いたなど（9種）"],
                  ["共通ルール", "全ナレーションに適用されるルール"],
                  ["NGワード", "生成で使わない表現"],
                ]}
              />
            </SubSection>
            <SubSection title="AI BGM設定">
              <Table
                headers={["設定", "選択肢・内容"]}
                rows={[
                  ["使用モデル", "Lyria 3 Pro（有料プランのみ）/ Lyria 2（無料・有料共通）"],
                  ["デフォルトボーカル", "なし / あり — 生成時のボーカル有無の初期値"],
                  ["デフォルトジャンル", "Pop / Jazz / Classical / Electronic / Cinematic / Ambient / Lo-fi / Rock など"],
                  ["デフォルトムード", "Happy / Calm / Epic / Melancholic / Energetic / Mysterious / Romantic / Tense など"],
                  ["共通プロンプト", "全BGM生成に自動付加される共通の指示テキスト"],
                  ["デフォルト音量", "スライダー（0〜1.0）— BGMのデフォルト音量を設定"],
                ]}
              />
              <Callout icon="💡">
                無料プランではモデルが Lyria 2 に固定されます。Lyria 3 Pro（最高品質）は有料プランで選択できます。
              </Callout>
            </SubSection>
            <SubSection title="コンテ変換設定">
              <P>
                「コンテ変換」タブで、コンテを動画プロジェクトに変換する際のデフォルト設定を構成できます。
              </P>
              <Table
                headers={["設定", "選択肢・内容"]}
                rows={[
                  ["解像度", "HD 720p / Full HD 1080p — 変換後のプロジェクト解像度"],
                  ["FPS", "24 / 30 / 60"],
                  ["背景色", "カラーピッカー — シーン間の背景色"],
                  ["シーン尺の決定方法", "ナレーションに合わせる / 秒数を指定する"],
                  ["デフォルト尺（秒）", "シーンにナレーションがない場合に使用するフォールバック秒数"],
                  ["ナレーション前後のパディング（秒）", "ナレーション尺モード時に前後に追加する余白秒数"],
                  ["テロップフォントサイズ", "ピクセル単位で指定"],
                  ["テロップフォント", "Noto Sans JP / Noto Serif JP"],
                  ["テロップ太さ", "300 / 400 / 500 / 700 / 900"],
                  ["テロップ色", "カラーピッカー"],
                  ["テロップ位置", "上 / 下"],
                  ["テロップシャドウ", "ON / OFF"],
                  ["ナレーション音量", "スライダー（0〜1.0）"],
                ]}
              />
              <P>
                「コンテ変換」タブにはPDF変換・Excel/CSV変換の設定もあります。
              </P>
              <Table
                headers={["機能", "設定できる項目"]}
                rows={[
                  ["コンテ → PDF変換", "用紙サイズ（A4/A3/Letter）/ 向き（横・縦）/ 1ページあたりのシーン数（1/2/4/6）/ スクリプト表示 / ナレーション表示"],
                  ["コンテ → Excel/CSV変換", "形式（xlsx / csv）/ CSV文字コード（UTF-8 / Shift-JIS）/ スクリプト列・ナレーション列・画像URL列・動画URL列の含否"],
                ]}
              />
            </SubSection>
            <SubSection title="動画書き出し設定">
              <P>
                「動画書き出し」タブで、APIサーバー書き出し時の詳細な出力設定を事前に構成できます。
                設定はブラウザに保存され、書き出しボタンを押したときに自動的に適用されます。
              </P>
              <Table
                headers={["設定", "選択肢", "備考"]}
                rows={[
                  ["解像度", "720p / 1080p", "コンテ変換タブと連動（シーケンス連動）"],
                  ["FPS", "24 / 25 / 30 / 60", "コンテ変換タブのFPS設定と連動（シーケンス連動）"],
                  ["背景色", "カラーピッカー", "コンテ変換タブの背景色と連動（シーケンス連動）"],
                  ["フォーマット", "mp4 / gif", "出力ファイル形式"],
                  ["クオリティ", "verylow / low / medium / high / veryhigh", "エンコード品質（デフォルト: medium）"],
                  ["ミュート", "ON / OFF", "動画の音声をすべて消してレンダリング"],
                  ["サムネイル", "ON / OFF + キャプチャ秒数 + スケール", "指定秒数の縮小画像を出力（スケール 0〜1.0）"],
                ]}
              />
              <Callout icon="🔗" color={TEAL}>
                「シーケンス連動」と表示された項目は、コンテ変換タブ（シーケンス設定）の値をデフォルトとして引き継ぎます。
                動画書き出しタブで変更した場合は書き出し専用の設定として保持されます。
                「シーケンス設定に戻す」ボタンで連動状態にリセットできます。
              </Callout>
            </SubSection>
          </Section>

          {/* ═══════════════════════════════════════════════════════
              アカウント管理
          ════════════════════════════════════════════════════════ */}
          <Section id="account" title="アカウント管理">
            <P>
              サイドパネルのユーザーアイコン → 「プロフィール設定」からアカウントの各種管理が行えます。
            </P>
            <SubSection title="パスワードの変更">
              <P>
                プロフィール設定の「セキュリティ」セクションから、現在のパスワードを入力せずに新しいパスワードへ変更できます。
              </P>
              <StepList steps={[
                { n: 1, title: "プロフィール設定を開く", desc: "サイドパネルのユーザーアイコンをクリック → 「プロフィール設定」を選択します。" },
                { n: 2, title: "セキュリティセクションに入力", desc: "下部の「セキュリティ」セクションに新しいパスワード（8文字以上）と確認用パスワードを入力します。" },
                { n: 3, title: "変更を確定", desc: "「パスワードを変更する」ボタンをクリックすると即座に反映されます。" },
              ]} />
            </SubSection>
            <SubSection title="メールアドレスの変更">
              <P>
                プロフィール設定の「セキュリティ」セクションから登録済みメールアドレスを変更できます。
                変更は新しいアドレス宛の確認メール内リンクをクリックして完了します。
              </P>
              <StepList steps={[
                { n: 1, title: "新しいメールアドレスを入力", desc: "プロフィール設定 → セキュリティ → 「新しいメールアドレス」欄に変更先アドレスを入力します。" },
                { n: 2, title: "確認メールを送信", desc: "「確認メールを送信」ボタンをクリックすると、新しいアドレス宛に確認メールが届きます。" },
                { n: 3, title: "メール内のリンクをクリック", desc: "届いたメールの「メールアドレスを確認する」をクリックすると変更が完了し、次回から新しいアドレスでログインできます。" },
              ]} />
              <Callout icon="⚠️">
                確認リンクの有効期限は<b>24時間</b>です。期限切れの場合は再度「確認メールを送信」を行ってください。
                リンクをクリックするまで旧メールアドレスのまま維持されます。
              </Callout>
            </SubSection>
            <SubSection title="パスワードを忘れた場合">
              <P>
                ログイン画面から再設定メールを送信できます。メールアドレスさえ覚えていれば旧パスワードなしで変更可能です。
              </P>
              <StepList steps={[
                { n: 1, title: "再設定ページを開く", desc: "ログイン画面の「パスワードをお忘れの方」リンクをクリックします。" },
                { n: 2, title: "メールアドレスを入力", desc: "登録済みのメールアドレスを入力して「再設定リンクを送信」をクリックします。" },
                { n: 3, title: "メール内のリンクをクリック", desc: "届いたメールの「パスワードを再設定する」ボタンをクリックします。" },
                { n: 4, title: "新しいパスワードを設定", desc: "新しいパスワード（8文字以上）と確認用パスワードを入力して変更を完了します。" },
              ]} />
              <Callout icon="⏱">
                再設定リンクの有効期限は<b>1時間</b>です。期限切れの場合は再度「再設定リンクを送信」してください。
              </Callout>
            </SubSection>
          </Section>

          {/* ═══════════════════════════════════════════════════════
              AIモデルリスト
          ════════════════════════════════════════════════════════ */}
          <Section id="ai-models" title="AIモデルリスト">
            <P>
              ヒスイAIで利用できるAIモデルの一覧です。
              モデルはユーザーの利用用途に合わせて選定・差し替えを行っており、
              AIモデルの優位性は日々入れ替わるため随時最適なモデルを導入しています。
            </P>
            <Callout icon="💡">
              <b>無料プラン</b>で利用できるモデルには <Badge label="無料" color={TEAL} /> を表示しています。
              <Badge label="有料プラン" color="#f59e0b" /> のモデルは担当者にご相談ください。
            </Callout>

            <SubSection title="画像生成モデル">
              <ModelTable rows={[
                ["Google Nano Banana 2 Lite","高速生成に特化。大量のシーン画像を短時間で生成したい場合に最適",         "free"],
                ["OpenAI GPT Image 2 (high)", "最高品質。プロンプト理解力が高く、テキスト合成・細部描写に優れる", "paid"],
                ["Reve 2.0",                 "高品質でコスパ良好。幅広い用途に対応するバランス型モデル",               "paid"],
                ["Nano Banana 2",            "Liteの上位版。品質とスピードのバランスが良く、バリエーション生成に向く",   "paid"],
                ["MAI-Image-2.5",            "写実的な人物・プロダクト表現に強み。企業広告・商品撮影風の画像に最適",    "paid"],
                ["Recraft V4.1 Utility",     "デザイン・ベクター寄りの出力が得意。インフォグラフィックや図解系に向く",  "paid"],
              ]} />
              <p style={{ margin: "16px 0 8px", fontSize: 12, fontWeight: 700, color: "#64748b",
                fontFamily: FONT, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                著作権クリーンなデータで学習したモデル
              </p>
              <ModelTable rows={[
                ["Bria",          "学習データが完全クリーン。著作権リスクを避けたい制作に。企業・官公庁・金融向け",                 "paid"],
                ["Adobe Firefly", "Adobe公式モデル。広告・デザイン・商用制作向けのクリーンなデータで学習。完全商用利用可",         "paid"],
              ]} />
            </SubSection>

            <SubSection title="動画生成モデル">
              <ModelTable rows={[
                ["Google Veo 3.1 Lite",   "カメラワーク・物理表現が最高水準。企業PV・CM・広告に最適",          "free"],
                ["Dreamina Seedance 2.0", "安定した動き・B-rollに強い。企業動画の素材生成に最適",              "paid"],
                ["HappyHorse 1.1",        "製品紹介・人物動画に強み。滑らかな動きが特徴",                      "paid"],
                ["Wan 2.7",               "企業動画全般に対応できる汎用性の高いモデル",                         "paid"],
                ["Kling 3.0 Pro",         "人物の動きの再現性が高い。SNS広告動画向け",                          "paid"],
                ["SkyReels V4",           "人物・インタビュー系動画に特化した高品質モデル",                     "paid"],
              ]} />
            </SubSection>

            <SubSection title="ナレーションモデル">
              <ModelTable rows={[
                ["Google Gemini 3.1 Flash TTS","豊富な音声バリエーション（30種以上）・9トーン・5話速に対応した汎用モデル",      "free"],
                ["SpeechifyAI Simba 3.2",      "自然な息づかいと感情表現が得意。プロナレーターに近い音声質",                    "paid"],
                ["Cartesia Sonic 3.5",         "超低遅延でクリアな音質。鮮明で聞き取りやすい声質",                              "paid"],
              ]} />
            </SubSection>

            <SubSection title="BGM・音楽生成モデル">
              <ModelTable rows={[
                ["Google Lyria 3 Pro","映画音楽・シネマティックBGMに特化した高品質モデル",                      "free"],
                ["Suno V5.5",        "フルボーカル楽曲の生成に最適。歌詞・メロディの完成度が高い",              "paid"],
                ["Mureka V8",        "インスト・BGM生成の標準モデル。幅広いジャンルに安定した品質で対応",       "paid"],
              ]} />
            </SubSection>
          </Section>

          {/* ═══════════════════════════════════════════════════════
              コンテパネルとは
          ════════════════════════════════════════════════════════ */}
          <Section id="conte-panel" title="コンテパネルとは">
            <P>
              コンテパネルは、動画の素材を一括で作り込むための工程です。
              バラバラな情報やテキストを入力するだけで、AIが台本を整理しシーンに分割。
              各シーンに画像・動画・ナレーションを生成し、絵コンテとして整理できます。
            </P>

            <FeatureList items={[
              ["AI台本作成",   "箇条書きや文章を入力するとAIがナレーション原稿を整理し、希望尺に合わせてシーン分割します"],
              ["AI画像生成",   "各シーンのプロンプトから画像をワンクリック生成。参照画像機能で複数シーンの一貫性も保てます"],
              ["AI動画生成",   "画像とプロンプトからワンクリックで動画を生成。静止画コンテをそのまま動画コンテへ進化させます"],
              ["AIナレーション","スクリプトをAIナレーターが読み上げ。30種の音声・9トーン・5話速から選択可能"],
            ]} />

            <Callout icon="→" color={TEAL}>
              コンテが完成したら「動画プロジェクトに変換」で動画編集パネルへ。
              シーンの画像・動画・ナレーションがタイムラインに自動配置されます。
            </Callout>
          </Section>

          {/* ═══════════════════════════════════════════════════════
              コンテ作成
          ════════════════════════════════════════════════════════ */}
          <Section id="conte" title="コンテ作成">
            <P>
              左パネル上部の「コンテ作成」ボタンでモードを切り替えます。
              シーン単位でスクリプト・画像・動画・ナレーションを管理するテーブル形式の機能です。
            </P>
            <SubSection title="コンテの作成手順">
              <StepList steps={[
                { n: 1, title: "新規コンテを作成", desc: "プロジェクトタブから「新しいコンテを作成」をクリック。タイトルを設定します。" },
                { n: 2, title: "シーンを追加", desc: "「シーンを追加」ボタンでシーンを追加。各シーンにスクリプト・画像・動画・ナレーションを設定できます。" },
                { n: 3, title: "スクリプトを入力または生成", desc: "テキストを手入力するか、AIによるスクリプト自動生成を利用します。" },
                { n: 4, title: "画像・動画を生成", desc: "各シーンのプロンプトを設定してAI生成。参照画像・参照テンプレートも利用可能です。" },
                { n: 5, title: "ナレーションを生成", desc: "スクリプトをもとにAIがナレーションを音声合成します。" },
                { n: 6, title: "動画プロジェクトに変換", desc: "コンテ全体を動画プロジェクト（SEQ）に変換してタイムライン編集に移ります。" },
              ]} />
            </SubSection>
            <SubSection title="画像生成モード">
              <Table
                headers={["モード", "内容"]}
                rows={[
                  ["テキスト", "プロンプトを直接入力して生成"],
                  ["別シーン参照", "他のシーンの画像を参照して一貫性を保ちながら生成"],
                  ["テンプレート参照", "登録済みテンプレート画像を参照して生成"],
                  ["ファイル参照", "ワークスペースのファイルを参照画像として使用"],
                  ["アップロード参照", "任意の画像をアップロードして参照"],
                ]}
              />
            </SubSection>
          </Section>

          {/* ═══════════════════════════════════════════════════════
              AI画像生成
          ════════════════════════════════════════════════════════ */}
          <Section id="ai-image" title="AI 画像生成">
            <P>
              コンテパネルの各シーン、またはAIパネルの「AI画像を生成」ボタンから起動します。
              テキストプロンプトを入力するだけで高品質な画像を生成できます。
            </P>
            <Callout icon="📋" color={TEAL}>
              利用可能なモデルの一覧・無料/有料の区分は <b>AIモデルリスト</b> をご確認ください。
            </Callout>
            <SubSection title="設定項目">
              <Table
                headers={["項目", "選択肢"]}
                rows={[
                  ["アスペクト比", "16:9（横型・推奨）/ 9:16（縦型）/ 1:1（正方形）/ 4:3 / 3:4"],
                  ["プロンプト", "日本語・英語どちらでも入力可。シーンの内容・雰囲気・画風を具体的に記述"],
                  ["参照画像", "元画像を参照しながら生成（再生成モーダル時）。「参照して生成」のトグルでON/OFF"],
                ]}
              />
            </SubSection>
            <Callout icon="💡">
              ワークスペース設定の「共通ルール」に「テキスト排除、日本人描写デフォルト」などを設定しておくと、
              プロンプトに書かなくても毎回適用されます。
            </Callout>
          </Section>

          {/* ═══════════════════════════════════════════════════════
              AI動画生成
          ════════════════════════════════════════════════════════ */}
          <Section id="ai-video" title="AI 動画生成">
            <P>
              コンテパネルの各シーン、またはAIパネルの「AI動画を生成」ボタンから起動します。
              動画生成はタスクの非同期処理のため、生成完了まで1〜5分かかります。
            </P>
            <Callout icon="📋" color={TEAL}>
              利用可能なモデルの一覧・無料/有料の区分は <b>AIモデルリスト</b> をご確認ください。
            </Callout>
            <SubSection title="設定項目">
              <Table
                headers={["項目", "内容"]}
                rows={[
                  ["アスペクト比", "16:9（横型）/ 9:16（縦型）"],
                  ["尺（秒）", "モデルに応じた選択肢から選択（モデル変更時に自動調整）"],
                  ["プロンプト", "動画の動き・シーン・カメラワークを詳しく記述すると精度が上がります"],
                ]}
              />
            </SubSection>
            <Callout icon="⏳">
              動画生成は1〜5分かかることがあります。生成中はモーダルを閉じないでください。
              「キャンセル」ボタンで生成を中断することができます。
            </Callout>
          </Section>

          {/* ═══════════════════════════════════════════════════════
              AIナレーション
          ════════════════════════════════════════════════════════ */}
          <Section id="narration" title="AI ナレーション（TTS）">
            <P>
              コンテパネルの各シーン、またはAIパネルの「AIナレーションを生成」ボタンから起動します。
              高品質なAI音声合成でナレーションを生成します。
            </P>
            <Callout icon="📋" color={TEAL}>
              利用可能なモデルの一覧・無料/有料の区分は <b>AIモデルリスト</b> をご確認ください。
            </Callout>
            <P>各音声には「明るい」「説明的」「温かみのある」などの特性ラベルが表示されます。</P>
            <SubSection title="話速（Pacing）">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {["とてもゆっくり", "ゆっくり", "標準", "やや速い", "速い"].map(l => (
                  <span key={l} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 20,
                    padding: "4px 12px", fontSize: 12, color: "#475569", fontFamily: FONT }}>{l}</span>
                ))}
              </div>
            </SubSection>
            <SubSection title="トーン（Tone）">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {["標準", "明るい", "落ち着いた", "真面目", "力強い", "優しい", "元気", "悲しい", "緊張感"].map(l => (
                  <span key={l} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 20,
                    padding: "4px 12px", fontSize: 12, color: "#475569", fontFamily: FONT }}>{l}</span>
                ))}
              </div>
            </SubSection>
            <Callout icon="💡">
              ナレーションの長さはテキスト量と話速によって変わります。
              生成後に音声プレイヤーで確認してからタイムラインに追加してください。
            </Callout>
          </Section>

          {/* ═══════════════════════════════════════════════════════
              動画編集パネルとは
          ════════════════════════════════════════════════════════ */}
          <Section id="editor-panel" title="動画編集パネルとは">
            <P>
              動画編集パネルは、素材を一本の動画に仕上げるための工程です。
              コンテから変換した素材や自分でアップロードしたファイルをタイムラインに配置し、
              テロップ・BGM・装飾を加えて完成動画を書き出します。
            </P>

            <FeatureList items={[
              ["タイムライン編集", "クリップの配置・トリム・順番変更・差し替えをビジュアルに操作"],
              ["装飾テロップ",     "グラデーション・縁取り・グロー等の高品質テロップを作成してタイムラインに合成"],
              ["BGM生成",         "ジャンル・ムードを指定してAIがオリジナルBGMを作曲し自動配置"],
              ["AI一括編集",      "「字幕を明朝体に」など自然言語でプロジェクト全体を一括変更"],
              ["書き出し",        "ブラウザ書き出し（即時）またはクラウドサーバー書き出し（動画・音声対応）"],
            ]} />

            <Callout icon="🤖" color={TEAL}>
              AI一括編集を使えば、「全シーンを5秒に統一」「フェードトランジションを追加」など、
              自然言語の指示だけでプロジェクト全体をまとめて整えることができます。
            </Callout>
          </Section>

          {/* ═══════════════════════════════════════════════════════
              プロジェクト
          ════════════════════════════════════════════════════════ */}
          <Section id="project" title="プロジェクト（SEQ）">
            <P>
              プロジェクト（SEQ）は動画編集の作業単位です。
              1つのプロジェクトに1つのタイムライン（edit.json）が対応します。
            </P>
            <SubSection title="プロジェクトの作成">
              <Card>
                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.8, fontFamily: FONT }}>
                  <b>設定できる項目：</b><br />
                  • <b>タイトル</b>：プロジェクト名<br />
                  • <b>アスペクト比</b>：16:9 / 9:16 / 1:1 / 4:3 / 21:9<br />
                  • <b>解像度</b>：720p (1280×720) / 1080p (1920×1080) ほか<br />
                  • <b>FPS</b>：24 / 30 / 60<br />
                  • <b>背景色</b>：カラーピッカーで任意の色
                </div>
              </Card>
            </SubSection>
            <SubSection title="自動保存">
              <P>
                編集内容はタイムライン変更のたびに自動保存されます。
                右上の保存パネルから保存モード（変更時 / 一定間隔）や手動保存が行えます。
                保存ログからスナップショットを復元することも可能です。
              </P>
            </SubSection>
          </Section>

          {/* ═══════════════════════════════════════════════════════
              動画編集エディタ
          ════════════════════════════════════════════════════════ */}
          <Section id="editor" title="動画編集エディタ">
            <P>
              中央エリアにキャンバスプレビューとタイムラインが表示されます。
              クリップを配置・編集して動画を組み立てていきます。
            </P>
            <SubSection title="ツールバーボタン">
              <Table
                headers={["ボタン", "機能"]}
                rows={[
                  ["字幕を追加", "タイムラインの指定位置にテキストクリップを挿入（デフォルト: Noto Sans JP 72px 白色）"],
                  ["図形を追加", "シアン色の角丸矩形（SVG）を追加"],
                  ["ファイルを挿入", "アップロード済みファイルまたは新規ファイルをタイムラインに挿入"],
                  ["ファイルを差し替え", "タイムラインで選択中のクリップを別のファイルに差し替え（クリップ未選択時は無効）"],
                ]}
              />
            </SubSection>
            <SubSection title="タイムライン操作">
              <Table
                headers={["操作", "方法"]}
                rows={[
                  ["クリップ選択", "タイムライン上のクリップをクリック"],
                  ["クリップ移動", "クリップをドラッグして位置を変更"],
                  ["クリップのリサイズ", "クリップ端をドラッグして長さを変更"],
                  ["クリップ削除", "クリップを選択してDeleteキー"],
                  ["ファイルをDnD", "ファイルパネルからタイムライン領域にドラッグ&ドロップ"],
                ]}
              />
            </SubSection>
            <SubSection title="クリップの再生成">
              <P>
                AI生成したクリップをタイムラインで選択すると、AIパネルに「再生成」ボタンが表示されます。
                クリックすると元の設定を引き継いだ再生成モーダルが開き、プロンプトやパラメータを調整して再生成できます。
              </P>
              <Callout icon="↻" color={TEAL}>
                「生成して差し替え」ボタンを使うと、再生成後にタイムライン上の元クリップを自動的に新しいファイルに置き換えます。
                元ファイルはファイルパネルに残ります。
              </Callout>
            </SubSection>
          </Section>

          {/* ═══════════════════════════════════════════════════════
              ファイルパネル
          ════════════════════════════════════════════════════════ */}
          <Section id="files" title="ファイルパネル">
            <P>
              左サイドパネルの「ファイル」タブでワークスペース内の全メディアを管理します。
            </P>
            <SubSection title="自動フォルダ分類">
              <P>アップロード・生成されたファイルは自動的に以下のフォルダに振り分けられます。</P>
              <Table
                headers={["フォルダ", "対象ファイル"]}
                rows={[
                  ["AI 画像", "AI画像生成で作成した画像ファイル（image-〇〇.jpg など）"],
                  ["AI 動画", "AI動画生成で作成した動画ファイル（video-〇〇.mp4 など）"],
                  ["AI ナレーション", "AIナレーション生成で作成した音声ファイル（narration_〇〇.mp3 など）"],
                  ["装飾テロップ", "装飾テロップエディタで作成した画像ファイル（deco-telop-〇〇.png など）"],
                ]}
              />
            </SubSection>
            <SubSection title="ファイル操作">
              <Table
                headers={["操作", "方法"]}
                rows={[
                  ["アップロード", "「アップロード」ボタン → ファイル選択（画像30MB / 動画200MB / 音声100MB まで）"],
                  ["タイムラインに追加", "ファイルをタイムライン領域にドラッグ＆ドロップ"],
                  ["再生成モーダルを開く", "AI生成ファイルをダブルクリック（genMetaがある場合）"],
                  ["複数選択", "Ctrl/Cmd+クリック（個別）または Shift+クリック（範囲）"],
                  ["フォルダに移動", "ファイルを右クリック → 「フォルダに移動」で振り分け先を選択"],
                  ["削除", "ファイルを右クリック → 「削除」"],
                ]}
              />
            </SubSection>
            <SubSection title="表示モード">
              <P>ファイルパネル右上のアイコンで表示モードを切り替えられます。</P>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                {[["リスト", "ファイル名とアイコン一覧"],["小サムネイル", "2列グリッド"],["中サムネイル", "1列ワイド"]].map(([l, d]) => (
                  <Card key={l} style={{ flex: "1 1 140px", marginBottom: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", fontFamily: FONT, marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 12, color: "#64748b", fontFamily: FONT }}>{d}</div>
                  </Card>
                ))}
              </div>
            </SubSection>
          </Section>

          {/* ═══════════════════════════════════════════════════════
              BGM生成
          ════════════════════════════════════════════════════════ */}
          <Section id="bgm" title="BGM 生成">
            <P>
              AIパネルの「BGMを生成」ボタンから起動します。
              AIがオリジナルBGMを作曲します。
            </P>
            <Callout icon="📋" color={TEAL}>
              利用可能なモデルの一覧・無料/有料の区分は <b>AIモデルリスト</b> をご確認ください。
            </Callout>
            <SubSection title="設定項目">
              <Table
                headers={["項目", "選択肢"]}
                rows={[
                  ["ボーカル", "あり / なし（インスト）"],
                  ["ジャンル（8種）", "Pop / Jazz / Classical / Electronic / Cinematic / Ambient / Lo-fi / Rock"],
                  ["ムード（8種）", "Happy / Calm / Epic / Melancholic / Energetic / Mysterious / Romantic / Tense"],
                  ["カスタムプロンプト", "任意の文章で雰囲気・楽器・テンポなどを指定"],
                  ["尺", "自動（タイムライン全体の長さに合わせる）または 5〜300秒で手動指定"],
                ]}
              />
            </SubSection>
            <Callout icon="🎵">
              生成された BGM はタイムラインの先頭（start: 0）に音量 70%（0.7）で自動配置されます。
              配置後にタイムラインで位置・音量を調整できます。
            </Callout>
          </Section>

          {/* ═══════════════════════════════════════════════════════
              装飾テロップ
          ════════════════════════════════════════════════════════ */}
          <Section id="deco" title="装飾テロップエディタ">
            <P>
              AIパネルの「装飾テロップを追加」から起動します。
              1920×1080 のキャンバス上でテキストを WYSIWYG で装飾し、PNG 画像として書き出してタイムラインに追加します。
            </P>
            <SubSection title="テキスト設定">
              <Table
                headers={["項目", "内容"]}
                rows={[
                  ["フォント", "ゴシック / 明朝 / 丸ゴシック / インパクト / システムフォントなど 70種以上から選択"],
                  ["サイズ", "12〜400px（数値入力）"],
                  ["スタイル", "太字（B）/ 斜体（I）"],
                  ["テキスト揃え", "左 / 中央 / 右"],
                  ["文字間", "-20〜200px（文字間隔を広げる・詰める）"],
                  ["行間", "0.8〜4.0倍（行の高さを変更）"],
                  ["位置X / 位置Y", "0〜100% でキャンバス内の表示位置を指定。スナップボタンで端・中央に即座に合わせられます"],
                ]}
              />
            </SubSection>
            <SubSection title="文字色・グラデーション">
              <Table
                headers={["種別", "内容"]}
                rows={[
                  ["単色（solid）", "1色でベタ塗り。透明度も指定可"],
                  ["直線グラデーション（linear）", "2色グラデーション。角度（0〜360°）を指定"],
                  ["放射状グラデーション（radial）", "中心から外に向かうグラデーション"],
                  ["4点グラデーション（4color）", "四隅に色を設定した複雑なグラデーション"],
                ]}
              />
            </SubSection>
            <SubSection title="エフェクト">
              <Table
                headers={["エフェクト", "設定項目"]}
                rows={[
                  ["縁取り（複数レイヤー）", "種類（edge / depth）/ 幅 / 色 / 透明度 / グラデーション / 深度角度など"],
                  ["ドロップシャドウ", "色 / 透明度 / ぼかし / X・Yオフセット"],
                  ["光彩（グロー）", "色 / 透明度 / ぼかし量 / 強度（1〜10）"],
                  ["光沢（グロス）", "強度 / サイズ / 角度"],
                  ["テクスチャ", "画像URL指定 / 透明度 / スケール（10〜500%）"],
                  ["背景パネル", "色 / 透明度 / パディング / 角丸半径"],
                ]}
              />
            </SubSection>
            <SubSection title="プリセット（16種）">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
                {["白・縁取り", "黄・縁取り", "白・影", "黒・白縁", "赤・縁取り", "ゴールド", "ゴールド光沢",
                  "ネオン青", "白・ドロップ", "白・背景", "白・細縁", "白・太縁", "オレンジ", "シアン・縁", "エレガント", "二重縁取り"
                ].map(p => (
                  <div key={p} style={{ background: "#f1f5f9", borderRadius: 8, padding: "6px 10px",
                    fontSize: 12, color: "#475569", fontFamily: FONT }}>{p}</div>
                ))}
              </div>
            </SubSection>
            <SubSection title="ユーザープリセット">
              <P>
                自分でカスタマイズしたスタイルを「プリセットを保存」でクラウドに保存できます。
                保存済みプリセットはドラッグで並べ替え、名前変更、削除が可能です。
              </P>
            </SubSection>
            <SubSection title="再編集">
              <P>
                ファイルパネルの装飾テロップファイルをダブルクリック、またはタイムラインで選択してAIパネルの「再加工」ボタンを押すと、
                作成時の設定を引き継いでエディタが開きます。
              </P>
            </SubSection>
          </Section>

          {/* ═══════════════════════════════════════════════════════
              一括編集
          ════════════════════════════════════════════════════════ */}
          <Section id="bulk" title="一括編集（AI プロンプト編集）">
            <P>
              AIパネルの「プロンプトで全体編集」から起動します。
              自然言語で指示するだけで、プロジェクト全体のクリップを一括変更できます。
            </P>
            <SubSection title="編集カテゴリ">
              <Table
                headers={["カテゴリ", "できること", "プロンプト例"]}
                rows={[
                  ["A. 字幕編集", "フォント / 色 / サイズ / 文字間 / 行間 / 位置 / シャドウ / フェード", "「字幕を明朝体にして」「文字間を広げて」"],
                  ["B. 尺・タイミング", "シーン長の統一 / 音声同期 / 全体尺の比例縮小", "「全シーンを5秒に統一して」"],
                  ["C. トランジション", "フェード / ワイプ / スライド / ズーム / リビールの追加・削除", "「フェードトランジションを追加」"],
                  ["D. フィルター", "モノクロ / ぼかし / 明暗 / コントラストなどの適用・削除", "「映像をモノクロにして」"],
                  ["E. 音声・BGM", "BGM URL / 音量 / フェード / ナレーション音量 / 動画ミュート", "「ナレーションを0.7倍に下げて」"],
                  ["F. 出力設定", "背景色 / 解像度(720p/1080p) / FPS(24/30/60)", "「解像度を1080pに変更して」"],
                ]}
              />
            </SubSection>
            <Callout icon="↩">
              一括編集の適用前にスナップショットが自動保存されます。
              「保存ログ」から編集前の状態に戻すことができます。
            </Callout>
            <Callout icon="⚠️">
              「字幕」はタイムライン上の rich-text クリップを指します。
              「装飾テロップ」（DecoTelopModal で作成した画像クリップ）は一括編集の対象外です。
            </Callout>
          </Section>

          {/* ═══════════════════════════════════════════════════════
              書き出し
          ════════════════════════════════════════════════════════ */}
          <Section id="export" title="書き出し">
            <P>左パネルの「書き出し」タブから書き出せます。2つの方式があります。</P>
            <SubSection title="方式1：ブラウザ書き出し">
              <Card>
                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.8, fontFamily: FONT }}>
                  <b>対象：</b>テキスト・画像・SVGのみのプロジェクト<br />
                  <b>処理場所：</b>ブラウザ（ローカルマシン）<br />
                  <b>出力：</b>MP4 (25fps)<br />
                  <b>特徴：</b>即座にダウンロード可能・無料
                </div>
              </Card>
              <Callout icon="⚠️">
                動画・音声クリップが含まれる場合はブラウザ書き出しを使用できません。「APIサーバー書き出し」をご利用ください。
              </Callout>
            </SubSection>
            <SubSection title="方式2：APIサーバー書き出し（クラウド）">
              <Card>
                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.8, fontFamily: FONT }}>
                  <b>対象：</b>動画・音声クリップを含む全てのプロジェクト<br />
                  <b>処理場所：</b>クラウドサーバー<br />
                  <b>所要時間：</b>最大5分（レンダリング完了まで5秒間隔でポーリング）<br />
                  <b>出力：</b>クラウドURLとしてダウンロードリンクを提供
                </div>
              </Card>
              <Callout icon="⚙️" color={TEAL}>
                フォーマット・クオリティ・解像度・FPS・ミュート・サムネイルなどの詳細な書き出し設定は、
                <b>ワークスペース設定 → 動画書き出しタブ</b> で事前に構成できます。
              </Callout>
              <SubSection title="進捗ステータス">
                <Table
                  headers={["フェーズ", "内容"]}
                  rows={[
                    ["保存", "プロジェクトをサーバーに保存"],
                    ["送信", "レンダリングジョブを送信"],
                    ["キュー待機", "サーバーキューで順番待ち"],
                    ["アセット取得", "クリップ素材をサーバーがダウンロード"],
                    ["レンダリング", "動画をエンコード処理中"],
                    ["ファイル保存", "出力ファイルをサーバーに保存"],
                    ["完了", "ダウンロードリンクが表示されます"],
                  ]}
                />
              </SubSection>
            </SubSection>
          </Section>

          {/* ─── Footer ─── */}
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 32, marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: GRAD, display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 12 }}>✦</div>
              <span style={{ fontSize: 14, fontWeight: 700, backgroundImage: GRAD,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ヒスイAI</span>
            </div>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, fontFamily: FONT }}>
              ご不明な点はサポートまでお問い合わせください。
            </p>
          </div>

        </main>
      </div>

      {/* ── Mobile drawer overlay ── */}
      <div
        className="manual-drawer-overlay"
        onClick={() => setMenuOpen(false)}
        style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 300,
          opacity: menuOpen ? 1 : 0, pointerEvents: menuOpen ? "auto" : "none",
          transition: "opacity 0.2s",
        }}
      />

      {/* ── Mobile drawer ── */}
      <div
        className="manual-drawer"
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 280,
          background: "#fff", zIndex: 301, overflowY: "auto",
          transform: menuOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 16px 12px", borderBottom: "1px solid #f0f0f0" }}>
          <span style={{ fontSize: 14, fontWeight: 800, backgroundImage: GRAD,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: FONT }}>
            目次
          </span>
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="メニューを閉じる"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4,
              color: "#94a3b8", fontSize: 20, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px" }}>
          {NAV.map((item, i) => {
            if (item.type === "group") {
              return (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8",
                  letterSpacing: "0.08em", padding: "12px 10px 4px", textTransform: "uppercase", fontFamily: FONT }}>
                  {item.label}
                </div>
              );
            }
            const active = activeSection === item.id;
            return (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                style={{ textAlign: "left",
                  background: active ? BLUE + "14" : "none",
                  border: "none", borderRadius: 6,
                  padding: item.indent ? "7px 10px 7px 20px" : "8px 10px",
                  fontSize: item.indent ? 13 : 14,
                  color: active ? BLUE : item.indent ? "#64748b" : "#475569",
                  fontWeight: active ? 700 : 400,
                  cursor: "pointer", fontFamily: FONT }}>
                {item.indent ? "· " : ""}{item.label}
              </button>
            );
          })}

          {/* ドロワー内のエディタに戻るリンク */}
          <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 12, paddingTop: 12 }}>
            <a href="/" style={{ display: "block", padding: "8px 10px", fontSize: 13, color: BLUE,
              textDecoration: "none", fontWeight: 600, fontFamily: FONT }}>
              ← エディタに戻る
            </a>
          </div>
        </nav>
      </div>
    </div>
  );
}
