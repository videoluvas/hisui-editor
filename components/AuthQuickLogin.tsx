"use client";

import { useEffect, useState } from "react";
import Turnstile, { turnstileEnabled } from "@/components/Turnstile";

const FONT = "'Noto Sans JP', sans-serif";

type Providers = { google: boolean; microsoft: boolean; emailLink: boolean };

const providerBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 10, height: 46, borderRadius: 10,
  border: "1px solid #dadce0", background: "#fff", color: "#1f1f1f", fontSize: 14, fontWeight: 600,
  textDecoration: "none", fontFamily: FONT, boxSizing: "border-box",
};

// ログイン画面用：Google / Microsoft（画面ごと移動）とメールのログインリンク。設定済みのものだけ表示する
export default function AuthQuickLogin({ next, color }: { next: string; color: string }) {
  const [providers, setProviders] = useState<Providers | null>(null);
  const [email, setEmail]   = useState("");
  const [sent, setSent]     = useState(false);
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState("");
  const [tsToken, setTsToken] = useState("");
  const [tsReset, setTsReset] = useState(0);

  useEffect(() => {
    fetch("/api/auth/providers").then((r) => r.json()).then(setProviders).catch(() => setProviders(null));
  }, []);

  if (!providers || (!providers.google && !providers.microsoft && !providers.emailLink)) return null;
  const q = `?next=${encodeURIComponent(next)}`;

  async function sendLink() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("メールアドレスを確認してください"); return; }
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/email-link", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, next, turnstileToken: tsToken }),
    }).catch(() => null);
    setTsReset((n) => n + 1);
    const data = (await res?.json().catch(() => null)) ?? { ok: false };
    setBusy(false);
    if (!data.ok) { setError(data.message ?? "メールを送信できませんでした"); return; }
    setSent(true);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
      {providers.google && (
        <a href={`/api/auth/oauth/google/start${q}`} style={providerBtn}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
          Google で続ける
        </a>
      )}
      {providers.microsoft && (
        <a href={`/api/auth/oauth/microsoft/start${q}`} style={providerBtn}>
          <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden="true"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
          Microsoft で続ける
        </a>
      )}
      {providers.emailLink && (sent ? (
        <div style={{ fontSize: 13, color: "#334155", background: `${color}10`, border: `1px solid ${color}44`, borderRadius: 10, padding: "12px 14px", lineHeight: 1.8 }}>
          <b>{email}</b> にログイン用のリンクを送りました。15 分以内に開いてください。
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6 }}>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void sendLink(); } }} placeholder="メールアドレス"
            style={{ flex: 1, minWidth: 0, height: 46, padding: "0 12px", fontSize: 14, borderRadius: 10, border: "1px solid #e0e0e0", outline: "none", fontFamily: FONT, boxSizing: "border-box" }} />
          <button type="button" onClick={() => void sendLink()} disabled={busy || (turnstileEnabled && !tsToken)}
            style={{ padding: "0 14px", height: 46, borderRadius: 10, border: "none", background: busy ? "#94a3b8" : color, color: "#fff", fontSize: 13, fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: FONT, whiteSpace: "nowrap" }}>
            リンクを受け取る
          </button>
        </div>
      ))}
      {providers.emailLink && !sent && <Turnstile onToken={setTsToken} resetKey={tsReset} />}
      {error && <div role="alert" style={{ fontSize: 12, color: "#b91c1c" }}>{error}</div>}
      <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>アカウントがない方は、そのまま無料で登録されます。</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#cbd5e1", fontSize: 11, marginTop: 4 }}>
        <span style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
        またはパスワードでログイン
        <span style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
      </div>
    </div>
  );
}
