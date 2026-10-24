"use client";

import { useEffect, useState } from "react";
import { entryParams, track } from "@/lib/analytics";

const TEAL = "#169385";
const FONT = "'Noto Sans JP', sans-serif";

export type ContactTopicId = "enterprise" | "plan" | "usage" | "bug" | "account" | "other";

export const CONTACT_TOPICS: { id: ContactTopicId; label: string; desc: string }[] = [
  { id: "enterprise", label: "法人向けオプションの相談", desc: "AI コンテツール・AI アバター・チーム編集・専用の学習モデルなど" },
  { id: "plan",       label: "有料プランの申し込み",     desc: "スタンダード / プロ プランのお申し込み" },
  { id: "usage",      label: "使い方・機能について",     desc: "パワーポイントの取り込み・ナレーション・書き出しなど" },
  { id: "bug",        label: "不具合の報告",             desc: "エラーが出る・取り込みが終わらない など" },
  { id: "account",    label: "アカウント・請求",         desc: "プラン変更・解約・アカウント削除・請求書" },
  { id: "other",      label: "その他",                   desc: "取材・提携など" },
];

const ENTERPRISE_FEATURES = ["AI コンテツール", "AI アバター", "多彩な学習モデル", "チームでの共同編集", "専門スタッフによる技術サポート", "研修・社内向けの大量制作"];
const SEATS = ["1〜5 名", "6〜20 名", "21〜100 名", "101 名以上", "未定"];
const TIMING = ["すぐにでも", "1〜3 か月以内", "半年以内", "情報収集中"];
const PLANS = ["スタンダード", "プロ", "まだ決めていない"];

const PLACEHOLDER: Record<ContactTopicId, string> = {
  enterprise: "使いたい用途（例：新人研修の動画を毎月 20 本作りたい）や、気になっている点をご記入ください。",
  plan:       "月払い / 年払い、お支払い方法（カード / 請求書払い）のご希望などがあればご記入ください。担当者からメールでお手続きをご案内します。",
  usage:      "どの画面で、何をしようとしているかをご記入ください。",
  bug:        "起きたこと・操作の手順・表示されたエラーメッセージ・起きた日時をご記入ください。ご登録のメールアドレスで送っていただくと調査が早くなります。",
  account:    "ご登録のメールアドレスと、ご希望の手続きをご記入ください。",
  other:      "",
};

// 旧リンク（料金ページの ?plan=）も受ける
function initialTopic(q: URLSearchParams): { topic: ContactTopicId; plan?: string } {
  const t = q.get("topic");
  if (t && CONTACT_TOPICS.some((x) => x.id === t)) return { topic: t as ContactTopicId, plan: q.get("plan") ?? undefined };
  const plan = q.get("plan");
  if (plan === "special") return { topic: "enterprise" };
  if (plan === "Business") return { topic: "plan", plan: "スタンダード" };
  if (plan === "Pro") return { topic: "plan", plan: "プロ" };
  return { topic: "usage" };
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 12px", fontSize: 14, borderRadius: 10, border: "1px solid #e2e8f0", outline: "none", color: "#1e293b", fontFamily: FONT, boxSizing: "border-box", background: "#fff" };
const labelStyle: React.CSSProperties = { fontSize: 12, color: "#475569", fontWeight: 700 };
const req = <span style={{ color: "#dc2626", marginLeft: 4 }}>*</span>;

export default function ContactForm() {
  const [topic, setTopic] = useState<ContactTopicId>("usage");
  const [plan, setPlan] = useState(PLANS[0]);
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [seats, setSeats] = useState(SEATS[4]);
  const [timing, setTiming] = useState(TIMING[3]);
  const [features, setFeatures] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const init = initialTopic(q);
    setTopic(init.topic);
    if (init.plan && PLANS.includes(init.plan)) setPlan(init.plan);
    // エラーの案内から来たときは、起きた場所・エラーコード・受付番号を本文に入れておく
    const code = q.get("code");
    if (code) {
      const lines = [q.get("where") && `起きた場所：${q.get("where")}`, `エラーコード：${code}`, q.get("ref") && `受付番号：${q.get("ref")}`, `起きた日時：${new Date().toLocaleString("ja-JP")}`];
      setMessage(`${lines.filter(Boolean).join("\n")}\n\n（直前に行った操作や、気づいたことがあればご記入ください）\n`);
    }
  }, []);

  const enterprise = topic === "enterprise";
  const label = CONTACT_TOPICS.find((t) => t.id === topic)!.label;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const details: [string, string][] = [
      ...(topic === "plan" ? [["希望プラン", plan] as [string, string]] : []),
      ...(enterprise ? [["利用予定人数", seats], ["導入の時期", timing], ["関心のある機能", features.join("、") || "（未選択）"]] as [string, string][] : []),
      ...(phone.trim() ? [["電話番号", phone.trim()] as [string, string]] : []),
    ];
    const body = [`【${label}】`, ...details.map(([k, v]) => `${k}：${v}`), "", message].join("\n");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: label, companyName: companyName.trim() || "（個人）", name, email, message: body }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) ?? { ok: false, message: "通信エラーが発生しました" };
    setBusy(false);
    if (!data.ok) { setError(data.message ?? "送信できませんでした"); return; }
    track("contact_submit", { topic, ...entryParams() });
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (done) {
    return (
      <div role="status" style={{ textAlign: "center", padding: "40px 16px", fontFamily: FONT, border: "1px solid #e2e8f0", borderRadius: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${TEAL}14`, color: TEAL, fontSize: 24, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>✓</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>送信しました</div>
        <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.9 }}>
          確認のメールを <b>{email}</b> にお送りしました。<br />
          担当者より 1〜2 営業日以内にご連絡します。
        </div>
        <a href="/powerpoint" style={{ display: "inline-block", marginTop: 20, fontSize: 13, fontWeight: 700, color: TEAL }}>ヒスイAI のトップへ戻る</a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18, fontFamily: FONT }}>
      <fieldset style={{ border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <legend style={{ ...labelStyle, marginBottom: 8, padding: 0 }}>お問い合わせの種類{req}</legend>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
          {CONTACT_TOPICS.map((t) => {
            const on = topic === t.id;
            return (
              <label key={t.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 12, cursor: "pointer", border: `1.5px solid ${on ? TEAL : "#e2e8f0"}`, background: on ? `${TEAL}0b` : "#fff" }}>
                <input type="radio" name="topic" checked={on} onChange={() => setTopic(t.id)} style={{ marginTop: 3, accentColor: TEAL }} />
                <span>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: on ? TEAL : "#1e293b" }}>{t.label}</span>
                  <span style={{ display: "block", fontSize: 11, color: "#64748b", lineHeight: 1.6, marginTop: 2 }}>{t.desc}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {topic === "plan" && (
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelStyle}>希望のプラン</span>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} style={inputStyle}>
            {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <a href="/pricing" target="_blank" rel="noreferrer" style={{ fontSize: 12, color: TEAL, fontWeight: 700 }}>料金プランを見る</a>
        </label>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelStyle}>会社名・団体名{enterprise ? req : "（任意）"}</span>
          <input required={enterprise} value={companyName} onChange={(e) => setCompanyName(e.target.value)} autoComplete="organization" style={inputStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelStyle}>お名前{req}</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" style={inputStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelStyle}>メールアドレス{req}</span>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" style={inputStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelStyle}>電話番号（任意）</span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" style={inputStyle} />
        </label>
      </div>

      {enterprise && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, background: "#f8fafc", borderRadius: 14, padding: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={labelStyle}>利用予定の人数</span>
              <select value={seats} onChange={(e) => setSeats(e.target.value)} style={inputStyle}>
                {SEATS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={labelStyle}>導入の時期</span>
              <select value={timing} onChange={(e) => setTiming(e.target.value)} style={inputStyle}>
                {TIMING.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
            <legend style={{ ...labelStyle, marginBottom: 8, padding: 0 }}>関心のある機能（複数選択可）</legend>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ENTERPRISE_FEATURES.map((f) => {
                const on = features.includes(f);
                return (
                  <label key={f} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999, cursor: "pointer", fontSize: 13, border: `1.5px solid ${on ? TEAL : "#e2e8f0"}`, background: on ? `${TEAL}0b` : "#fff", color: on ? TEAL : "#334155", fontWeight: on ? 700 : 500 }}>
                    <input type="checkbox" checked={on} onChange={() => setFeatures((p) => on ? p.filter((x) => x !== f) : [...p, f])} style={{ accentColor: TEAL }} />
                    {f}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      )}

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelStyle}>内容{req}</span>
        <textarea required rows={7} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={PLACEHOLDER[topic]} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }} />
      </label>

      {error && <div role="alert" style={{ fontSize: 13, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 12px" }}>{error}</div>}
      <button type="submit" disabled={busy} style={{ padding: "14px 0", borderRadius: 999, border: "none", background: busy ? "#94a3b8" : TEAL, color: "#fff", fontSize: 15, fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: FONT }}>
        {busy ? "送信中..." : "送信する"}
      </button>
      <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
        送信すると<a href="/privacy" target="_blank" rel="noreferrer" style={{ color: TEAL }}>プライバシーポリシー</a>に同意したことになります。
      </div>
    </form>
  );
}
