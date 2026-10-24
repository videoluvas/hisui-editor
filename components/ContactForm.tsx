"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";

const TEAL = "#169385";
const FONT = "'Noto Sans JP', sans-serif";

const PLAN_TOPIC: Record<string, string> = {
  Business: "Business プランの申し込み",
  Pro: "Pro プランの申し込み",
  special: "特別プランの相談",
};
const TOPICS = ["使い方について", "Business プランの申し込み", "Pro プランの申し込み", "特別プランの相談", "不具合の報告", "その他"];

const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 12px", fontSize: 14, borderRadius: 10, border: "1px solid #e2e8f0", outline: "none", color: "#1e293b", fontFamily: FONT, boxSizing: "border-box", background: "#fff" };
const labelStyle: React.CSSProperties = { fontSize: 12, color: "#475569", fontWeight: 700 };

export default function ContactForm() {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get("plan");
    if (plan && PLAN_TOPIC[plan]) setTopic(PLAN_TOPIC[plan]);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName: companyName.trim() || "（個人）", name, email, message: `【${topic}】\n${message}` }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) ?? { ok: false, message: "通信エラーが発生しました" };
    setBusy(false);
    if (!data.ok) { setError(data.message ?? "送信できませんでした"); return; }
    track("contact_submit", { topic });
    setDone(true);
  }

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0", fontFamily: FONT }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: TEAL, marginBottom: 10 }}>送信しました</div>
        <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.9 }}>
          確認のメールを {email} にお送りしました。<br />
          担当者より 1〜2 営業日以内にご連絡します。
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelStyle}>お問い合わせの種類</span>
        <select value={topic} onChange={(e) => setTopic(e.target.value)} style={inputStyle}>
          {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelStyle}>会社名・団体名（任意）</span>
        <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} autoComplete="organization" style={inputStyle} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelStyle}>お名前</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" style={inputStyle} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelStyle}>メールアドレス</span>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" style={inputStyle} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelStyle}>内容</span>
        <textarea required rows={6} value={message} onChange={(e) => setMessage(e.target.value)} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }} />
      </label>
      {error && <div role="alert" style={{ fontSize: 13, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 12px" }}>{error}</div>}
      <button type="submit" disabled={busy} style={{ padding: "13px 0", borderRadius: 999, border: "none", background: busy ? "#94a3b8" : TEAL, color: "#fff", fontSize: 15, fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: FONT }}>
        {busy ? "送信中..." : "送信する"}
      </button>
      <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
        送信すると<a href="/privacy" target="_blank" rel="noreferrer" style={{ color: TEAL }}>プライバシーポリシー</a>に同意したことになります。
      </div>
    </form>
  );
}
