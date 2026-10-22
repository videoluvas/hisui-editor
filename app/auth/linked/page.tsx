"use client";

import { useEffect, useState } from "react";
import { safeNext } from "@/lib/auth.next";

const TEAL = "#169385";
const FONT = "'Noto Sans JP', sans-serif";

export default function LinkedPage() {
  const [error, setError] = useState(false);
  const [next, setNext]   = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const n = safeNext(q.get("next"));
    setError(q.has("error"));
    setNext(n);
    // 取り込みの途中だった場合は、そのページへ戻って続きから再開する
    if (!q.has("error") && n) {
      const t = setTimeout(() => window.location.replace(n), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: FONT }}>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", maxWidth: 420, width: "100%", padding: "32px 28px", textAlign: "center", display: "flex", flexDirection: "column", gap: 14, boxSizing: "border-box" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: error ? "#b91c1c" : TEAL }}>
          {error ? "リンクの有効期限が切れています" : "ログインしました"}
        </div>
        <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.8 }}>
          {error
            ? "ログイン用リンクは 15 分で無効になります。もう一度リンクを送ってください。"
            : next
              ? "取り込みの続きに戻ります。元の画面（タブ）が開いている場合は、そちらでもそのまま進められます。"
              : "元の画面（タブ）が開いている場合は、そちらに戻るとそのまま続きから進められます。"}
        </div>
        <a href={error ? `/auth${next ? `?next=${encodeURIComponent(next)}` : ""}` : next ?? "/"} style={{ padding: "11px 0", borderRadius: 10, background: TEAL, color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
          {error ? "ログイン画面へ" : next ? "続きから再開する" : "編集画面を開く"}
        </a>
      </div>
    </div>
  );
}
