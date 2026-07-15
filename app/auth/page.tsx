"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/lib/useIsMobile";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = tab === "login" ? { email, password } : { email, password, name };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.message ?? "エラーが発生しました");
        return;
      }

      router.push("/");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Noto Sans JP', sans-serif",
        padding: isMobile ? "20px 5vw" : "20px",
      }}
    >
      {/* Logo */}
      <img
        src="https://assets.hisui-ai.com/system/img/hisui_video_%E3%83%AD%E3%82%B4_01.png"
        alt="Hisui AI"
        style={{ height: 40, marginBottom: 32, objectFit: "contain" }}
      />

      {/* Card */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          width: "100%",
          maxWidth: 420,
          overflow: "hidden",
        }}
      >
        {/* Tab */}
        <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0" }}>
          {([ { id: "login", label: "ログイン" }, { id: "register", label: "新規登録" } ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTab(t.id)}
              style={{
                flex: 1,
                height: 52,
                fontSize: 14,
                fontWeight: 700,
                border: "none",
                background: "none",
                cursor: "pointer",
                color: tab === t.id ? TEAL : "#aaa",
                borderBottom: tab === t.id ? `2px solid ${TEAL}` : "2px solid transparent",
                transition: "all 0.15s ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: isMobile ? "24px 16px 20px" : "32px 28px 28px" }}>
          {tab === "register" && (
            <Field label="お名前（任意）">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：山田 太郎"
                style={inputStyle}
              />
            </Field>
          )}

          <Field label="メールアドレス">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              autoComplete="email"
              style={inputStyle}
            />
          </Field>

          <Field label="パスワード" hint={tab === "register" ? "8文字以上" : undefined}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              style={inputStyle}
            />
          </Field>

          {error && (
            <div
              style={{
                background: "#fff0f0",
                border: "1px solid #ffcdd2",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                color: "#c62828",
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: 48,
              background: loading ? "#a8d5ca" : TEAL,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.15s ease",
              marginTop: 4,
            }}
          >
            {loading ? "処理中..." : tab === "login" ? "ログイン" : "アカウントを作成"}
          </button>

          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#999" }}>
            {tab === "login" ? (
              <>
                アカウントをお持ちでない方は{" "}
                <button type="button" onClick={() => switchTab("register")} style={linkStyle}>
                  新規登録
                </button>
              </>
            ) : (
              <>
                すでにアカウントをお持ちの方は{" "}
                <button type="button" onClick={() => switchTab("login")} style={linkStyle}>
                  ログイン
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>{label}</label>
        {hint && <span style={{ fontSize: 11, color: "#aaa" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  padding: "0 14px",
  fontSize: 14,
  border: "1px solid #e0e0e0",
  borderRadius: 8,
  outline: "none",
  boxSizing: "border-box",
  background: "#fafafa",
  color: "#222",
};

const linkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: TEAL,
  fontSize: 13,
  fontWeight: 600,
  padding: 0,
  textDecoration: "underline",
};
