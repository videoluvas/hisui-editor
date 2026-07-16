"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const TEAL = "#2aab8e";

const inputStyle: React.CSSProperties = {
  width: "100%", height: 44, padding: "0 14px", fontSize: 14,
  border: "1px solid #e0e0e0", borderRadius: 8, outline: "none",
  boxSizing: "border-box", background: "#fafafa", color: "#222",
};

function ConfirmForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirm) { setError("パスワードが一致しません"); return; }
    if (newPassword.length < 8) { setError("パスワードは8文字以上で入力してください"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.message ?? "エラーが発生しました"); return; }
      setDone(true);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#c62828", marginBottom: 12 }}>無効なリンクです</div>
        <Link href="/reset-password" style={{ fontSize: 13, color: TEAL, fontWeight: 600, textDecoration: "underline" }}>
          再設定メールを再送する
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: `${TEAL}18`, display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 16px",
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>パスワードを変更しました</div>
        <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, marginBottom: 24 }}>
          新しいパスワードでログインできます。
        </p>
        <Link href="/auth" style={{ fontSize: 13, color: TEAL, fontWeight: 600, textDecoration: "underline" }}>
          ログイン画面へ
        </Link>
      </div>
    );
  }

  return (
    <>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>新しいパスワードを設定</div>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24, lineHeight: 1.7 }}>
        8文字以上のパスワードを入力してください。
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#444", display: "block", marginBottom: 6 }}>
            新しいパスワード
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#444", display: "block", marginBottom: 6 }}>
            パスワード（確認）
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{
            background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: 8,
            padding: "10px 14px", fontSize: 13, color: "#c62828", marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%", height: 48,
            background: loading ? "#a8d5ca" : TEAL,
            color: "#fff", border: "none", borderRadius: 10,
            fontSize: 15, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s ease",
          }}
        >
          {loading ? "変更中..." : "パスワードを変更する"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordConfirmPage() {
  return (
    <div style={{
      minHeight: "100vh", background: "#f5f5f5",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Noto Sans JP', sans-serif", padding: "20px",
    }}>
      <img
        src="https://assets.hisui-ai.com/system/img/hisui_video_%E3%83%AD%E3%82%B4_01.png"
        alt="Hisui AI"
        style={{ height: 40, marginBottom: 32, objectFit: "contain" }}
      />

      <div style={{
        background: "#fff", borderRadius: 16,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        width: "100%", maxWidth: 420, padding: "32px 28px 28px",
      }}>
        <Suspense fallback={<div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13 }}>読み込み中...</div>}>
          <ConfirmForm />
        </Suspense>
      </div>
    </div>
  );
}
