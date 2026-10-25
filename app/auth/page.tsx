"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/lib/useIsMobile";
import AuthQuickLogin from "@/components/AuthQuickLogin";
import Turnstile, { turnstileEnabled } from "@/components/Turnstile";
import { safeNext } from "@/lib/auth.next";

const TEAL = "#2aab8e";

type Tab = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [next, setNext] = useState("/");
  const [tsToken, setTsToken] = useState("");
  const [tsReset, setTsReset] = useState(0);

  // ログイン後は元のページ（取り込みの途中など）に戻る
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setNext(safeNext(q.get("next")) ?? "/");
    if (q.get("error")) setError(q.get("error"));
    if (q.get("tab") === "register") setTab("register");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(tab === "register" ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, name, turnstileToken: tsToken }),
      });
      setTsReset((n) => n + 1);
      const data = await res.json();
      if (!data.ok) { setError(data.message ?? "エラーが発生しました"); return; }
      router.push(next);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (next: Tab) => { setTab(next); setError(null); };

  return (
    <div style={{
      minHeight: "100vh", background: "#f5f5f5",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Noto Sans JP', sans-serif",
      padding: isMobile ? "20px 5vw" : "20px",
    }}>
      {/* Logo */}
      <img
        src="https://assets.hisui-ai.com/system/img/hisui_video_%E3%83%AD%E3%82%B4_01.png"
        alt="Hisui AI"
        style={{ height: 40, marginBottom: 32, objectFit: "contain" }}
      />

      {/* Card */}
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", width: "100%", maxWidth: 420, overflow: "hidden" }}>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0" }}>
          {([
            { id: "login",    label: "ログイン" },
            { id: "register", label: "無料アカウント作成" },
          ] as const).map((t) => (
            <button key={t.id} type="button" onClick={() => switchTab(t.id)} style={{
              flex: 1, height: 52, fontSize: 14, fontWeight: 700,
              border: "none", background: "none", cursor: "pointer",
              color: tab === t.id ? TEAL : "#aaa",
              borderBottom: tab === t.id ? `2px solid ${TEAL}` : "2px solid transparent",
              transition: "all 0.15s ease",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── ログインフォーム ── */}
        {tab === "login" && (
          <form onSubmit={handleSubmit} style={{ padding: isMobile ? "24px 16px 20px" : "32px 28px 28px" }}>
            <AuthQuickLogin next={next} color={TEAL} />
            <Field label="メールアドレス">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com" required autoComplete="email" style={inputStyle} />
            </Field>

            <Field label="パスワード">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required autoComplete="current-password" style={inputStyle} />
            </Field>

            <div style={{ marginBottom: 12 }}><Turnstile onToken={setTsToken} resetKey={tsReset} /></div>

            {error && (
              <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#c62828", marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || (turnstileEnabled && !tsToken)} style={{
              width: "100%", height: 48, background: loading || (turnstileEnabled && !tsToken) ? "#a8d5ca" : TEAL,
              color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", transition: "background 0.15s ease", marginTop: 4,
            }}>
              {loading ? "処理中..." : "ログイン"}
            </button>

            <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#999" }}>
              アカウントをお持ちでない方は{" "}
              <button type="button" onClick={() => switchTab("register")} style={linkStyle}>無料アカウント作成</button>
            </p>
          </form>
        )}

        {/* ── 無料アカウント作成 ── */}
        {tab === "register" && (
          <form onSubmit={handleSubmit} style={{ padding: isMobile ? "24px 16px 20px" : "28px 28px 24px" }}>
            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.75, marginBottom: 20 }}>
              無料プランですぐにお使いいただけます。<br />
              有料プランへの切り替えはログイン後にご案内します。
            </div>

            <AuthQuickLogin next={next} color={TEAL} />

            <Field label="お名前（任意）">
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="山田 太郎" autoComplete="name" style={inputStyle} />
            </Field>

            <Field label="メールアドレス">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com" required autoComplete="email" style={inputStyle} />
            </Field>

            <Field label="パスワード（8文字以上）">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={8} autoComplete="new-password" style={inputStyle} />
            </Field>

            <div style={{ marginBottom: 12 }}><Turnstile onToken={setTsToken} resetKey={tsReset} /></div>

            {error && (
              <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#c62828", marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || (turnstileEnabled && !tsToken)} style={{
              width: "100%", height: 48, background: loading || (turnstileEnabled && !tsToken) ? "#a8d5ca" : TEAL,
              color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", transition: "background 0.15s ease", marginTop: 4,
            }}>
              {loading ? "処理中..." : "無料で始める"}
            </button>

            <p style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
              登録すると<Link href="/terms" style={{ color: TEAL }}>利用規約</Link>と
              <Link href="/privacy" style={{ color: TEAL }}>プライバシーポリシー</Link>に同意したものとみなされます。
            </p>

            <p style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "#94a3b8" }}>
              すでにアカウントをお持ちの方は{" "}
              <button type="button" onClick={() => switchTab("login")} style={linkStyle}>ログイン</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#444", display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 44, padding: "0 14px", fontSize: 14,
  border: "1px solid #e0e0e0", borderRadius: 8, outline: "none",
  boxSizing: "border-box", background: "#fafafa", color: "#222",
};

const linkStyle: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  color: TEAL, fontSize: 13, fontWeight: 600, padding: 0, textDecoration: "underline",
};
