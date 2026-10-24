import type { Metadata } from "next";
import { FREE_NARRATION_IMPORTS } from "@/lib/credits";
import PublicFooter from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "料金プラン | ヒスイAI",
  description: "ヒスイAIの料金プラン。パワーポイントの取り込みと透かし入りの書き出しは無料で無制限。透かしなしの書き出し・ナレーション・AI 生成はスタンダード（月 2,980 円）とプロ（月 9,800 円）で使えます。",
  openGraph: {
    title: "料金プラン | ヒスイAI",
    description: "パワーポイントの取り込みと透かし入りの書き出しは無料。AI 生成はサブスクリプションで。",
  },
};

const TEAL = "#169385";
const INK = "#0f172a";
const FONT = "'Noto Sans JP', sans-serif";
const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

// 仕様シート「料金設計 2. プラン案」の値。決済ができるまでは問い合わせ → メールで手続き
const PAID_PLANS = [
  {
    id: "standard", label: "スタンダード", price: 2_980, yearly: 29_800, forWhom: "個人・講師・小さなチーム",
    items: ["書き出し 月 60 分（1080p・透かしなし）", "ナレーション 月 18,000 字（約 60 分）", "AI クレジット 月 30,000（AI 画像 6 枚 または AI 動画 6 秒）", "ワークスペース 10 個まで"],
  },
  {
    id: "pro", label: "プロ", price: 9_800, yearly: 98_000, forWhom: "研修・営業資料を毎月作る法人の担当者",
    items: ["書き出し 月 180 分（1080p・透かしなし）", "ナレーション 月 45,000 字（約 150 分）", "AI クレジット 月 200,000（AI 画像 40 枚 または AI 動画 40 秒）", "ワークスペース 無制限"],
  },
];

const SPECIAL = ["AI アバター", "多彩な学習モデル", "AI 絵コンテツール", "専門スタッフによる技術サポート", "チームでの共同編集"];

const FAQ: [string, string][] = [
  ["無料プランでどこまで使えますか？", `パワーポイントの取り込みと動画の書き出しは、回数・長さの制限なく使えます（書き出した動画には透かしが入ります）。ノートからナレーションを作る取り込みは、アカウントごとに ${FREE_NARRATION_IMPORTS} 回まで無料です。`],
  ["ナレーションの無料回数はリセットされますか？", "リセットされません。作り直しや 4 回目以降は、有料プランで作れます。"],
  ["透かしを外すには？", "有料プランでは、透かしなしで書き出せます（スタンダードは月 60 分、プロは月 180 分まで）。"],
  ["有料プランはどう申し込みますか？", "このページの「このプランを申し込む」から、お問い合わせフォームでお申し込みください。担当者からメールで、お支払い方法とお手続きをご案内します。"],
  ["アップロードした資料はどう扱われますか？", "元の .pptx と PDF は、取り込みが終わるとサーバーから削除します。分解した画像はプロジェクトに保存され、AI の学習には使いません。"],
  ["作った動画は商用利用できますか？", "はい、研修・営業資料・広告などに商用利用できます。"],
];

export default function PricingPage() {
  const card: React.CSSProperties = { flex: "1 1 260px", minWidth: 0, border: "1px solid #e2e8f0", borderRadius: 18, padding: "24px 22px", display: "flex", flexDirection: "column", gap: 14, background: "#fff" };
  const button = (primary: boolean): React.CSSProperties => ({
    display: "block", textAlign: "center", padding: "12px 0", borderRadius: 999, fontSize: 14, fontWeight: 700, textDecoration: "none",
    color: primary ? "#fff" : TEAL, background: primary ? TEAL : "#fff", border: `1.5px solid ${TEAL}`, marginTop: "auto",
  });
  const item = (ok: boolean, text: string) => (
    <li key={text} style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.7, color: ok ? "#334155" : "#94a3b8" }}>
      <span aria-hidden="true" style={{ color: ok ? TEAL : "#cbd5e1", fontWeight: 800 }}>{ok ? "✓" : "—"}</span>{text}
    </li>
  );

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
            パワーポイントの取り込みと書き出しは無料。<br />
            AI で画像・動画・ナレーションを作るときだけ、有料プランをお選びください。
          </p>
        </section>

        <section style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 20px 8px", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "stretch" }}>
          <div style={card}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>無料プラン</div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>¥0</div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              {item(true, "パワーポイントの取り込み 無制限")}
              {item(true, "動画の書き出し 無制限（透かし入り）")}
              {item(true, `ノートからナレーション ${FREE_NARRATION_IMPORTS} 回まで（累計）`)}
              {item(false, "AI 画像・動画・BGM の生成")}
              {item(false, "透かしなしの書き出し")}
            </ul>
            <a href="/powerpoint" style={button(true)}>無料で試す</a>
          </div>

          {PAID_PLANS.map((p) => (
            <div key={p.id} style={{ ...card, border: `1.5px solid ${TEAL}55` }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{p.label}</div>
              <div>
                <span style={{ fontSize: 30, fontWeight: 800 }}>{yen(p.price)}</span>
                <span style={{ fontSize: 13, color: "#64748b", marginLeft: 4 }}>/ 月（税込）</span>
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>年払い {yen(p.yearly)}（2 か月分おトク）</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEAL }}>{p.forWhom}</div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                {item(true, "無料プランのすべての機能")}
                {p.items.map((t) => item(true, t))}
              </ul>
              <a href={`/contact?topic=plan&plan=${encodeURIComponent(p.label)}`} style={button(false)}>このプランを申し込む</a>
            </div>
          ))}

          <div style={{ ...card, background: INK, color: "#fff", border: "none" }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>特別プラン</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>お見積り</div>
            <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.8 }}>企業・団体向けに、ご利用内容をうかがってプランをお作りします。</div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              {SPECIAL.map((s) => (
                <li key={s} style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.7 }}>
                  <span aria-hidden="true" style={{ color: "#5eead4", fontWeight: 800 }}>✓</span>{s}
                </li>
              ))}
            </ul>
            <a href="/contact?topic=enterprise" style={{ ...button(true), background: "#fff", color: INK, border: "none" }}>相談する</a>
          </div>
        </section>

        <p style={{ maxWidth: 1080, margin: "0 auto", padding: "8px 20px 0", fontSize: 11, color: "#94a3b8", lineHeight: 1.8 }}>
          有料プランは、お問い合わせのあと担当者がメールでお手続きをご案内します（カード決済は準備中です）。書き出しの分数・ナレーションの文字数・AI クレジットは毎月の更新日に戻ります。ナレーションは 1 分 300 文字として計算しています。
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
