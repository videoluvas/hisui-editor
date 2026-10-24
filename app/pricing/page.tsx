import type { Metadata } from "next";
import { getPublicPlans } from "@/lib/plan-config";
import { CREDIT_COST, FREE_NARRATION_IMPORTS } from "@/lib/credits";
import PublicFooter from "@/components/PublicFooter";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "料金プラン | ヒスイAI",
  description: "ヒスイAIの料金プラン。パワーポイントの取り込みと透かし入りの書き出しは無料で無制限。AI 画像・動画・ナレーションはサブスクリプションで使えます。",
  openGraph: {
    title: "料金プラン | ヒスイAI",
    description: "パワーポイントの取り込みと透かし入りの書き出しは無料。AI 生成はサブスクリプションで。",
  },
};

const TEAL = "#169385";
const INK = "#0f172a";
const FONT = "'Noto Sans JP', sans-serif";
const NARRATION_CHARS_PER_MIN = 300;

const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;
const approx = (n: number) => `約 ${Math.floor(n).toLocaleString("ja-JP")}`;

// 毎月のクレジットを 1 つの用途だけに使った場合の目安
function estimates(credits: number): [string, string][] {
  const narrationPerMin = CREDIT_COST.narration * Math.ceil(NARRATION_CHARS_PER_MIN / 200);
  return [
    ["透かしなしの書き出し（1080p）", `${approx(credits / CREDIT_COST.export_1080p)} 分`],
    ["AI ナレーション", `${approx(credits / narrationPerMin)} 分`],
    ["AI 画像（GPT Image）", `${approx(credits / CREDIT_COST.image_gpt_high)} 枚`],
    ["AI 動画（Kling 3.0・5 秒）", `${approx(credits / (CREDIT_COST.video_kling_v3 * 5))} 本`],
  ];
}

const SPECIAL = ["AI アバター", "多彩な学習モデル", "AI 絵コンテツール", "専門スタッフによる技術サポート", "チームでの共同編集"];

const FAQ: [string, string][] = [
  ["無料プランでどこまで使えますか？", `パワーポイントの取り込みと動画の書き出しは、回数・長さの制限なく使えます（書き出した動画には透かしが入ります）。ノートからナレーションを作る取り込みは、アカウントごとに ${FREE_NARRATION_IMPORTS} 回まで無料です。`],
  ["ナレーションの無料回数はリセットされますか？", "リセットされません。作り直しや 4 回目以降は、有料プランのクレジットで作れます。"],
  ["透かしを外すには？", "有料プランでは、透かしなしで書き出せます（書き出しの長さに応じてクレジットを使います）。"],
  ["アップロードした資料はどう扱われますか？", "元の .pptx と PDF は、取り込みが終わるとサーバーから削除します。分解した画像はプロジェクトに保存され、AI の学習には使いません。"],
  ["作った動画は商用利用できますか？", "はい、研修・営業資料・広告などに商用利用できます。"],
];

export default async function PricingPage() {
  const plans = await getPublicPlans();
  const free = plans.find((p) => p.id === "Free");
  const paid = plans.filter((p) => p.id !== "Free");

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
            <div style={{ fontSize: 16, fontWeight: 800 }}>{free?.label ?? "無料プラン"}</div>
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

          {paid.map((p) => (
            <div key={p.id} style={{ ...card, border: `1.5px solid ${TEAL}55` }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{p.label}</div>
              <div>
                <span style={{ fontSize: 30, fontWeight: 800 }}>{yen(p.price_jpy)}</span>
                <span style={{ fontSize: 13, color: "#64748b", marginLeft: 4 }}>/ 月（税込）</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEAL }}>毎月 {p.credits_default.toLocaleString("ja-JP")} クレジット</div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                {item(true, "無料プランのすべての機能")}
                {item(true, "透かしなしの書き出し")}
                {item(true, "AI 画像・動画・ナレーション・BGM の生成")}
                {item(true, `ワークスペース ${p.max_workspaces} 個まで`)}
              </ul>
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>クレジットの使いみちの目安（1 つの用途だけに使った場合）</div>
                {estimates(p.credits_default).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, color: "#334155", lineHeight: 1.9 }}>
                    <span>{k}</span><span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{v}</span>
                  </div>
                ))}
              </div>
              <a href={`/contact?topic=plan&plan=${encodeURIComponent(p.id)}`} style={button(false)}>このプランを申し込む</a>
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
          クレジットは毎月の更新日に付与されます。使いみちの目安は、AI ナレーションを 1 分 {NARRATION_CHARS_PER_MIN} 文字として計算しています。
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
