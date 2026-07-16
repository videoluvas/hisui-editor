"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getTransferInfo, acceptTransfer, type TransferInfo, type TransferResourceType } from "@/lib/transfer.api";
import { listWorkspaces, type WorkspaceItem } from "@/lib/workspace.api";

const FONT  = "'Noto Sans JP', sans-serif";
const TEAL  = "#169385";

const TYPE_LABEL: Record<TransferResourceType, string> = {
  workspace:  "ワークスペース",
  storyboard: "コンテ",
  project:    "動画プロジェクト",
};

type AuthState = { loggedIn: boolean; email: string | null };
type PageState = "loading" | "invalid" | "not-logged-in" | "wrong-email" | "ready" | "accepting" | "done" | "error";

export default function TransferPage() {
  const params  = useParams<{ token: string }>();
  const token   = params.token;

  const [pageState,  setPageState]  = useState<PageState>("loading");
  const [transfer,   setTransfer]   = useState<TransferInfo | null>(null);
  const [auth,       setAuth]       = useState<AuthState>({ loggedIn: false, email: null });
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [targetWs,   setTargetWs]   = useState<string>("");
  const [errorMsg,   setErrorMsg]   = useState<string>("");

  useEffect(() => {
    (async () => {
      const [infoRes, meRes] = await Promise.all([
        getTransferInfo(token),
        fetch("/api/user/dashboard", { credentials: "include", cache: "no-store" }).then((r) => r.json()).catch(() => ({ ok: false })),
      ]);

      if (!infoRes.ok || !infoRes.transfer) {
        setErrorMsg(infoRes.message ?? "リンクが無効です");
        setPageState("invalid");
        return;
      }

      const trf = infoRes.transfer;
      setTransfer(trf);

      const loggedIn = meRes.ok && !!meRes.user?.email;
      const email    = meRes.user?.email ?? null;
      setAuth({ loggedIn, email });

      if (!loggedIn) {
        setPageState("not-logged-in");
        return;
      }

      if ((email ?? "").toLowerCase() !== trf.toEmail.toLowerCase()) {
        setPageState("wrong-email");
        return;
      }

      if (trf.resourceType !== "workspace") {
        const wsRes = await listWorkspaces();
        if (wsRes.ok) {
          setWorkspaces(wsRes.workspaces);
          if (wsRes.workspaces.length > 0) setTargetWs(wsRes.workspaces[0].id);
        }
      }

      setPageState("ready");
    })();
  }, [token]);

  const handleAccept = async () => {
    if (!transfer) return;
    const needsWs = transfer.resourceType !== "workspace";
    if (needsWs && !targetWs) {
      setErrorMsg("ワークスペースを選択してください");
      return;
    }
    setPageState("accepting");
    const res = await acceptTransfer(token, needsWs ? targetWs : undefined);
    if (res.ok) {
      setPageState("done");
    } else {
      setErrorMsg(res.message ?? "エラーが発生しました");
      setPageState("error");
    }
  };

  const callbackUrl = encodeURIComponent(`/transfer/${token}`);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: FONT }}>
      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 8px 40px rgba(0,0,0,0.10)", width: "100%", maxWidth: 480, overflow: "hidden" }}>

        {/* ヘッダー */}
        <div style={{ background: `linear-gradient(135deg, ${TEAL}, #0d5c54)`, padding: "24px 28px" }}>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, letterSpacing: "-0.3px" }}>✦ Hisui AI</div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 }}>管理ユーザーの移譲</div>
        </div>

        <div style={{ padding: "28px 28px 32px" }}>

          {/* ── ローディング ── */}
          {pageState === "loading" && (
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "20px 0" }}>確認中...</div>
          )}

          {/* ── 無効なリンク ── */}
          {pageState === "invalid" && (
            <>
              <div style={{ fontSize: 20, marginBottom: 8 }}>⚠️</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>リンクが無効または期限切れです</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>{errorMsg}</div>
            </>
          )}

          {/* ── 未ログイン ── */}
          {pageState === "not-logged-in" && transfer && (
            <>
              <TransferDetail transfer={transfer} />
              <div style={{ marginTop: 20, padding: "14px 16px", background: "#fefce8", border: "1px solid #fde047", borderRadius: 10, fontSize: 13, color: "#713f12" }}>
                承認するには <strong>{transfer.toEmail}</strong> のアカウントでログインしてください。
              </div>
              <a href={`/auth?callbackUrl=${callbackUrl}`}
                style={{ display: "block", marginTop: 16, padding: "12px 0", background: TEAL, color: "#fff", textAlign: "center", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                ログイン / 新規登録
              </a>
            </>
          )}

          {/* ── メール不一致 ── */}
          {pageState === "wrong-email" && transfer && (
            <>
              <TransferDetail transfer={transfer} />
              <div style={{ marginTop: 20, padding: "14px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, fontSize: 13, color: "#991b1b" }}>
                このリンクは <strong>{transfer.toEmail}</strong> 宛てです。<br />
                現在 <strong>{auth.email}</strong> でログイン中です。正しいアカウントに切り替えてください。
              </div>
              <a href={`/auth?callbackUrl=${callbackUrl}`}
                style={{ display: "block", marginTop: 16, padding: "12px 0", background: "#64748b", color: "#fff", textAlign: "center", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                別のアカウントでログイン
              </a>
            </>
          )}

          {/* ── 承認フォーム ── */}
          {(pageState === "ready" || pageState === "accepting") && transfer && (
            <>
              <TransferDetail transfer={transfer} />

              {transfer.resourceType !== "workspace" && (
                <div style={{ marginTop: 20 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>
                    振り分け先ワークスペース
                  </label>
                  {workspaces.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>ワークスペースがありません。先にワークスペースを作成してください。</div>
                  ) : (
                    <select
                      value={targetWs}
                      onChange={(e) => setTargetWs(e.target.value)}
                      style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafd", fontSize: 13, color: "#1e293b", fontFamily: FONT, padding: "8px 10px", outline: "none", cursor: "pointer" }}
                    >
                      {workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>{ws.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {errorMsg && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, color: "#dc2626" }}>
                  {errorMsg}
                </div>
              )}

              <div style={{ marginTop: 20, padding: "12px 14px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, fontSize: 12, color: "#92400e" }}>
                承認すると、この操作は取り消せません。全てのデータがあなたのアカウントに移行されます。
              </div>

              <button
                onClick={handleAccept}
                disabled={pageState === "accepting" || (transfer.resourceType !== "workspace" && workspaces.length === 0)}
                style={{ display: "block", width: "100%", marginTop: 16, padding: "14px 0", background: pageState === "accepting" ? `${TEAL}88` : TEAL, color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 14, border: "none", cursor: pageState === "accepting" ? "not-allowed" : "pointer", fontFamily: FONT }}
              >
                {pageState === "accepting" ? "処理中..." : "移譲を承認する"}
              </button>
            </>
          )}

          {/* ── 完了 ── */}
          {pageState === "done" && transfer && (
            <>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f0fdf4", border: "2px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 14px" }}>✓</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>移譲が完了しました</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
                  {TYPE_LABEL[transfer.resourceType]}「{transfer.resourceName}」があなたのアカウントに移行されました。
                </div>
              </div>
              <a href="/"
                style={{ display: "block", padding: "12px 0", background: TEAL, color: "#fff", textAlign: "center", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                エディタを開く
              </a>
            </>
          )}

          {/* ── エラー ── */}
          {pageState === "error" && (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>エラーが発生しました</div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>{errorMsg}</div>
              <button onClick={() => setPageState("ready")} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
                戻る
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

function TransferDetail({ transfer }: { transfer: TransferInfo }) {
  const typeLabel = TYPE_LABEL[transfer.resourceType];
  const expires = new Date(transfer.expiresAt).toLocaleString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 18px", border: "1px solid #e2e8f0" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, fontFamily: FONT }}>
        移譲依頼の内容
      </div>
      {[
        { label: "種別",     value: typeLabel },
        { label: "名前",     value: transfer.resourceName },
        { label: "移譲元",  value: transfer.fromUserName ?? "（不明）" },
        { label: "移譲先",  value: transfer.toEmail },
        { label: "有効期限", value: expires },
      ].map(({ label, value }) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
          <span style={{ color: "#64748b", fontFamily: FONT }}>{label}</span>
          <span style={{ fontWeight: 600, color: "#1e293b", fontFamily: FONT, textAlign: "right", maxWidth: "65%", wordBreak: "break-all" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}
