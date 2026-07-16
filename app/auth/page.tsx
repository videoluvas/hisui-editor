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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.message ?? "エラーが発生しました"); return; }
      router.push("/");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (next: Tab) => { setTab(next); setError(null); setContactDone(false); };

  // ── お問い合わせフォーム ──
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactDone, setContactDone] = useState(false);

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    setContactLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, name: contactName, email: contactEmail, message: contactMessage }),
      });
      const data = await res.json() as { ok: boolean; message?: string };
      if (!data.ok) throw new Error(data.message ?? "送信に失敗しました");
      setContactDone(true);
    } catch (err) {
      setContactError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setContactLoading(false);
    }
  };

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
            <Field label="メールアドレス">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com" required autoComplete="email" style={inputStyle} />
            </Field>

            <Field label="パスワード">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required autoComplete="current-password" style={inputStyle} />
            </Field>

            {error && (
              <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#c62828", marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%", height: 48, background: loading ? "#a8d5ca" : TEAL,
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

        {/* ── アカウント発行フォーム ── */}
        {tab === "register" && (
          <div style={{ padding: isMobile ? "24px 16px 20px" : "28px 28px 24px" }}>
            {contactDone ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "12px 0 8px" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${TEAL}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>お問い合わせを受け付けました</div>
                  <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.8 }}>
                    確認メールをお送りしました。<br />
                    1〜2営業日以内に担当者よりご連絡いたします。
                  </div>
                </div>
                <button type="button" onClick={() => switchTab("login")} style={{ ...linkStyle, fontSize: 12 }}>
                  ログインページへ戻る
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.75, marginBottom: 20 }}>
                  ヒスイAIは法人・チーム向けの動画編集ツールです。<br />
                  フォームを送信いただくと、担当者よりご連絡いたします。
                </div>

                <form onSubmit={handleContact}>
                  <Field label="会社名 / 組織名">
                    <input value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="株式会社〇〇" required style={inputStyle} />
                  </Field>

                  <Field label="担当者名">
                    <input value={contactName} onChange={(e) => setContactName(e.target.value)}
                      placeholder="山田 太郎" required style={inputStyle} />
                  </Field>

                  <Field label="メールアドレス">
                    <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="example@company.com" required autoComplete="email" style={inputStyle} />
                  </Field>

                  <Field label="ご利用用途・ご要望（任意）">
                    <textarea
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="例：SNS向け動画を週次で制作予定。5名程度のチームで利用したい。"
                      rows={3}
                      style={{ ...inputStyle, height: "auto", resize: "none", lineHeight: 1.6, paddingTop: 10, paddingBottom: 10 }}
                    />
                  </Field>

                  {contactError && (
                    <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#c62828", marginBottom: 16 }}>
                      {contactError}
                    </div>
                  )}

                  <button type="submit" disabled={contactLoading} style={{
                    width: "100%", height: 48, background: contactLoading ? "#a8d5ca" : TEAL,
                    color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
                    cursor: contactLoading ? "not-allowed" : "pointer", transition: "background 0.15s ease",
                  }}>
                    {contactLoading ? "送信中..." : "お問い合わせを送信する"}
                  </button>

                  <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#94a3b8" }}>
                    すでにアカウントをお持ちの方は{" "}
                    <button type="button" onClick={() => switchTab("login")} style={linkStyle}>ログイン</button>
                  </p>
                </form>
              </>
            )}
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
