"use client";

import { useState } from "react";
import { RETRY_THEN_CONTACT, SUPPORT_EMAIL, contactUrl } from "@/lib/errorGuide";
import type { ErrorGuide } from "@/lib/errorGuide";

const FONT = "'Noto Sans JP', sans-serif";

// 失敗したときの案内：何が起きたか → 何をすればよいか → 次の操作 → 問い合わせ先（エラーコード・受付番号付き）
export default function ErrorGuideBox({ guide, code, detail, refId, where, accent, actions, compact = false }: {
  guide: ErrorGuide;
  code: string;
  detail?: string | null;
  refId?: string | null;
  where: string;
  accent: string;
  actions?: { label: string; onClick: () => void; primary?: boolean }[];
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const fs = compact ? 11 : 12;
  const info = `エラーコード：${code}${refId ? `\n受付番号：${refId}` : ""}`;
  const copy = () => {
    navigator.clipboard.writeText(info).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  };

  return (
    <div role="alert" style={{ display: "flex", flexDirection: "column", gap: compact ? 8 : 10, fontFamily: FONT }}>
      <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: compact ? "8px 10px" : "10px 12px", lineHeight: 1.6 }}>
        <div style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: "#b91c1c" }}>{guide.title}</div>
        {detail && detail !== guide.title && <div style={{ fontSize: fs, color: "#b91c1c", marginTop: 4 }}>{detail}</div>}
      </div>

      <div style={{ fontSize: fs, color: "#334155", lineHeight: 1.7 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>こうしてください</div>
        <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 3 }}>
          {guide.steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
        {guide.note && <div style={{ marginTop: 6, color: "#64748b" }}>※ {guide.note}</div>}
      </div>

      {actions && actions.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {actions.map((a) => (
            <button key={a.label} type="button" onClick={a.onClick}
              style={{ flex: a.primary ? "1 1 160px" : "0 1 auto", padding: compact ? "7px 12px" : "10px 14px", borderRadius: compact ? 7 : 10, border: a.primary ? "none" : `1px solid ${compact ? accent : "#e2e8f0"}`, background: a.primary ? accent : "#fff", color: a.primary ? "#fff" : compact ? accent : "#334155", fontSize: compact ? 12 : 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
              {a.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: compact ? "8px 10px" : "10px 12px", fontSize: fs, color: "#64748b", lineHeight: 1.7 }}>
        <div>{RETRY_THEN_CONTACT}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
          <a href={contactUrl(code, refId, where)} target="_blank" rel="noreferrer" style={{ color: accent, fontWeight: 700 }}>問い合わせる ↗</a>
          <span>または <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`【不具合】${where}（${code}）`)}&body=${encodeURIComponent(`${info}\n\n`)}`} style={{ color: accent }}>{SUPPORT_EMAIL}</a></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: compact ? 10 : 11, color: "#94a3b8" }}>
          <span style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{code}{refId ? ` / ${refId}` : ""}</span>
          <button type="button" onClick={copy} style={{ border: "none", background: "none", color: copied ? "#059669" : accent, fontSize: compact ? 10 : 11, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: FONT, whiteSpace: "nowrap" }}>
            {copied ? "✓ コピーしました" : "コピー"}
          </button>
        </div>
      </div>
    </div>
  );
}
