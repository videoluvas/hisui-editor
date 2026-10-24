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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, turnstileToken: tsToken }),
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
            { id: "register", label: "アカウント発行" },
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
              <button type="button" onClick={() => switchTab("register")} style={linkStyle}>お問い合わせ</button>
            </p>
          </form>
        )}

        {/* ── アカウント発行 ── */}
        {tab === "register" && (
          <div style={{ padding: isMobile ? "24px 16px 20px" : "28px 28px 24px" }}>
            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.75, marginBottom: 20 }}>
              ヒスイAIは法人・チーム向けの動画編集ツールです。<br />
              お問い合わせページからご連絡いただくと、担当者よりご案内いたします。
            </div>

            <Link href="/contact?topic=enterprise" style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "100%", height: 48, background: TEAL, color: "#fff",
              borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: "none",
            }}>
              お問い合わせページへ
            </Link>

            <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#94a3b8" }}>
              すでにアカウントをお持ちの方は{" "}
              <button type="button" onClick={() => switchTab("login")} style={linkStyle}>ログイン</button>
            </p>
          </div>
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
