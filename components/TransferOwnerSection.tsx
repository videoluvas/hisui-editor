"use client";

import { useState } from "react";
import { requestTransfer, type TransferResourceType } from "@/lib/transfer.api";

const FONT = "'Noto Sans JP', sans-serif";
const TEAL = "#169385";

export function TransferOwnerSection({
  resourceType,
  resourceId,
  resourceName,
}: {
  resourceType: TransferResourceType;
  resourceId:   string;
  resourceName: string;
}) {
  const [email,   setEmail]   = useState("");
  const [sending, setSending] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSend = async () => {
    const toEmail = email.trim().toLowerCase();
    if (!toEmail || !toEmail.includes("@")) {
      setError("正しいメールアドレスを入力してください");
      return;
    }
    setSending(true); setError(null);
    const res = await requestTransfer({ resourceType, resourceId, toEmail });
    setSending(false);
    if (res.ok) {
      setDone(true);
    } else {
      setError(res.message ?? "エラーが発生しました");
    }
  };

  const typeLabel =
    resourceType === "workspace"  ? "ワークスペース" :
    resourceType === "storyboard" ? "コンテ" : "プロジェクト";

  if (done) {
    return (
      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#15803d", fontFamily: FONT }}>
        ✓ 移譲依頼メールを送信しました。相手が承認するとデータが移行されます。
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 11, color: "#64748b", fontFamily: FONT, lineHeight: 1.6 }}>
        移譲先のメールアドレスを入力すると確認メールが送られます。承認後、{typeLabel}に含まれる全データがそのアカウントに移行されます。
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          placeholder="移譲先のメールアドレス"
          type="email"
          style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafd", fontSize: 12, color: "#1e293b", fontFamily: FONT, padding: "7px 10px", outline: "none", boxSizing: "border-box" as const, minWidth: 0 }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !email.trim()}
          style={{ padding: "7px 12px", fontSize: 12, fontWeight: 700, borderRadius: 8, border: "none", background: !email.trim() || sending ? "#e2e8f0" : TEAL, color: !email.trim() || sending ? "#94a3b8" : "#fff", cursor: !email.trim() || sending ? "not-allowed" : "pointer", fontFamily: FONT, whiteSpace: "nowrap" as const, flexShrink: 0 }}
        >
          {sending ? "送信中..." : "依頼を送る"}
        </button>
      </div>
      {error && (
        <div style={{ fontSize: 11, color: "#ef4444", fontFamily: FONT }}>{error}</div>
      )}
    </div>
  );
}
