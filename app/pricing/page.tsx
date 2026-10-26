import type { Metadata } from "next";
import { CORPORATE_CONTACT_URL, CORPORATE_ITEMS, FREE_ITEMS, FREE_LIMITS, STANDARD_LIMITS, STANDARD_PLAN, planContactUrl, yen } from "@/lib/pricing";
import PublicFooter from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "料金プラン | ヒスイAI",
  description: "ヒスイAIの料金プラン。パワーポイントの動画変換は無料で試せます。スタンダード（月 9,800 円・税抜）は取り込みの枚数無制限・ノートからのナレーション月 45,000 字・透かしなしの書き出し月 60 分。AI 生成は法人プランでご提供します。",
  openGraph: {
    title: "料金プラン | ヒスイAI",
    description: "パワーポイントの動画変換は無料で試せます。スタンダードは月 9,800 円（税抜）。AI 生成は法人プランで。",
  },
};

const TEAL = "#169385";
const INK = "#0f172a";
const FONT = "'Noto Sans JP', sans-serif";

const FAQ: [string, string][] = [
  ["無料プランでどこまで使えますか？", `${FREE_LIMITS.pptxMB}MB・${FREE_LIMITS.slides} 枚までのパワーポイントを取り込めます（埋め込みの動画は読み込みません）。書き出しは透かし入りで累計 ${FREE_LIMITS.exports} 回、ノートからのナレーションは累計 ${FREE_LIMITS.narrationImports} 回（1 回 ${FREE_LIMITS.narrationSlides} 枚・${FREE_LIMITS.narrationChars.toLocaleString()} 字まで）使えます。`],
  ["無料の回数はリセットされますか？", "リセットされません。続けて使うには、スタンダードプランをお申し込みください。"],
  ["透かしを外すには？", `スタンダードプランは、透かしなし（1080p）で月 ${STANDARD_LIMITS.cleanExportMin} 分まで書き出せます。透かし入りなら回数の制限はありません。法人プランは透かしなしで書き出せます。`],
  ["ナレーションを作り直せますか？", `スタンダードプランでは、編集画面でナレーションを作り直せます（スタンダードで使える唯一の AI 生成です）。作り直した分も、月 ${STANDARD_LIMITS.narrationChars.toLocaleString()} 字の中から数えます。無料プランでは作り直しはできません。`],
  ["AI で画像や動画を作れますか？", "AI 画像・動画・ナレーション・BGM の生成、自動字幕などの AI 機能は、不具合にすぐ対応できるサポート体制とあわせて、法人プランでご提供しています。"],
  ["有料プランはどう申し込みますか？", "このページのボタンから、お問い合わせフォームでお申し込みください。担当者からメールで、お支払い方法とお手続きをご案内します。法人プランは、ご利用内容をうかがってプランをご提案します。"],
  ["アップロードした資料はどう扱われますか？", "元の .pptx と PDF は、取り込みが終わるとサーバーから削除します。分解した画像はプロジェクトに保存され、AI の学習には使いません。"],
  ["作った動画は商用利用できますか？", "はい、どのプランでも研修・営業資料・広告などに商用利用できます。"],
];

export default function PricingPage() {
  const card: React.CSSProperties = { flex: "1 1 280px", minWidth: 0, border: "1px solid #e2e8f0", borderRadius: 18, padding: "24px 22px", display: "flex", flexDirection: "column", gap: 14, background: "#fff" };
  const button = (primary: boolean): React.CSSProperties => ({
    display: "block", textAlign: "center", padding: "12px 0", borderRadius: 999, fontSize: 14, fontWeight: 700, textDecoration: "none",
    color: primary ? "#fff" : TEAL, background: primary ? TEAL : "#fff", border: `1.5px solid ${TEAL}`, marginTop: "auto",
  });
  const item = (ok: boolean, text: string, color = ok ? "#334155" : "#94a3b8", mark = ok ? TEAL : "#cbd5e1") => (
    <li key={text} style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.7, color }}>
      <span aria-hidden="true" style={{ color: mark, fontWeight: 800 }}>{ok ? "✓" : "—"}</span>{text}
    </li>
  );
  const list: React.CSSProperties = { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: INK, fontFamily: FONT }}>
      <header style={{ maxWidth: 1080, margin: "0 auto", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/powerpoint" style={{ display: "flex", alignItems: "center" }}>
          <img src="https://assets.hisui-ai.com/system/img/hisui_video_%E3%83%AD%E3%82%B4_01.png" alt="ヒスイAI" style={{ height: 28, width: "auto", objectFit: "contain", display: "block" }} />
        </a>
        <a href="/powerpoint" style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: TEAL, textDecoration: "none", borderRadius: 999, padding: "7px 16px" }}>無料で試す</a>
      </header>

      <main>
        <section style={{ background: "linear-gradient(180deg, #f0fdfa 0%, #ffffff 100%)", padding: "40px 20px 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 12px" }}>料金プラン</h1>
          <p style={{ fontSize: 15, color: "#475569", margin: 0, lineHeight: 1.8 }}>
            パワーポイントの動画変換は、無料で試せます。<br />
            毎月使うならスタンダード、AI 生成やサポートが必要なら法人プランをお選びください。
          </p>
        </section>

        <section style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 20px 8px", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "stretch" }}>
          <div style={card}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>無料プラン</div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>¥0</div>
            <ul style={list}>{FREE_ITEMS.map(([ok, t]) => item(ok, t))}</ul>
            <a href="/powerpoint" style={button(true)}>無料で試す</a>
          </div>

          <div style={{ ...card, border: `1.5px solid ${TEAL}55` }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{STANDARD_PLAN.label}</div>
            <div>
              <span style={{ fontSize: 30, fontWeight: 800 }}>{yen(STANDARD_PLAN.price)}</span>
              <span style={{ fontSize: 13, color: "#64748b", marginLeft: 4 }}>/ 月（税抜）</span>
              <div style={{ fontSize: 12, color: "#64748b" }}>税込 {yen(STANDARD_PLAN.priceTaxIn)}・月ごとの更新</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEAL }}>{STANDARD_PLAN.forWhom}</div>
            <ul style={list}>{STANDARD_PLAN.items.map((t) => item(true, t))}</ul>
            <a href={planContactUrl(STANDARD_PLAN.label)} style={button(false)}>このプランを申し込む</a>
          </div>

          <div style={{ ...card, background: INK, color: "#fff", border: "none" }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>法人プラン</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>お見積り</div>
            <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.8 }}>AI 機能は、不具合にすぐ対応できるサポート体制とあわせて法人プランでご提供します。ご利用内容をうかがってプランをご提案します。</div>
            <ul style={list}>{CORPORATE_ITEMS.map((s) => item(true, s, "#fff", "#5eead4"))}</ul>
            <a href={CORPORATE_CONTACT_URL} style={{ ...button(true), background: "#fff", color: INK, border: "none" }}>相談する</a>
          </div>
        </section>

        <p style={{ maxWidth: 1080, margin: "0 auto", padding: "8px 20px 0", fontSize: 11, color: "#94a3b8", lineHeight: 1.8 }}>
          有料プランは、お問い合わせのあと担当者がメールでお手続きをご案内します（カード決済は準備中です）。年払いはありません。ナレーションの文字数・透かしなしの書き出しの分数は毎月の更新日に戻ります。ナレーションは 1 分 300 文字として計算しています。どのプランでも商用利用できます。
        </p>

        <section style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px 64px" }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px", textAlign: "center" }}>よくある質問</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FAQ.map(([q, a]) => (
              <details key={q} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 700 }}>{q}</summary>
                <p style={{ margin: "10px 0 0", fontSize: 13, color: "#475569", lineHeight: 1.9 }}>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
