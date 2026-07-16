"use client";

import { useEffect, useMemo, useState } from "react";
import { TEAL } from "@/components/icons";
import ProfileSettingsModal from "@/components/ProfileSettingsModal";
import { CREDIT_ACTION_LABEL } from "@/lib/credits";
import type { CreditAction } from "@/lib/credits";

const FONT = "'Noto Sans JP', sans-serif";
const GRAD = "linear-gradient(90deg, #5184F0, #169385)";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashUser = {
  id: string;
  name: string | null;
  email: string | null;
  plan: string | null;
  iconUrl: string | null;
  credits: number;
};

type CreditLog = {
  id: string;
  workspaceId: string | null;
  creditType: string;
  delta: number;
  balanceAfter: number;
  reason: string | null;
  createdAt: string;
};

type ErrorLog = {
  id: string;
  level: string;
  source: string;
  message: string;
  detail: Record<string, unknown> | null;
  createdAt: string;
};

type CheckoutLog = {
  id: string;
  amount: number | null;
  currency: string | null;
  status: string;
  createdAt: string;
};

type WorkspaceConsumption = {
  id: string;
  name: string;
  consumed: number;
};

type DashboardData = {
  user: DashUser;
  creditLogs: CreditLog[];
  errorLogs: ErrorLog[];
  checkoutLogs: CheckoutLog[];
  workspaceConsumption: WorkspaceConsumption[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const dtFmt = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit",
});

function fmtDate(s: string) {
  try { return dtFmt.format(new Date(s)); } catch { return s; }
}

function fmtCredits(n: number): string {
  return n.toLocaleString("ja-JP") + " クレジット";
}

function fmtCurrency(amount: number | null, currency: string | null) {
  if (amount == null) return "—";
  const cur = (currency ?? "jpy").toUpperCase();
  try { return new Intl.NumberFormat("ja-JP", { style: "currency", currency: cur }).format(amount); }
  catch { return `${amount} ${cur}`; }
}

function actionLabel(creditType: string): string {
  return CREDIT_ACTION_LABEL[creditType as CreditAction] ?? creditType;
}

const REASON_COLOR: Record<string, string> = {
  refund_error: "#22c55e",
  grant:        "#22c55e",
  manual_grant: "#22c55e",
};

const LEVEL_COLOR: Record<string, { bg: string; fg: string; label: string }> = {
  error: { bg: "#fef2f2", fg: "#ef4444", label: "エラー" },
  warn:  { bg: "#fffbeb", fg: "#f59e0b", label: "警告" },
  info:  { bg: "#f0f9ff", fg: "#0284c7", label: "情報" },
};

const SOURCE_LABEL: Record<string, string> = {
  "editor-generate-image":        "画像生成",
  "editor-generate-video":        "動画生成",
  "editor-generate-video-status": "動画生成",
  "editor-generate-narration":    "ナレーション生成",
  "generate-image":               "画像生成（コンテ）",
  "generate-video":               "動画生成（コンテ）",
  "generate-narration":           "ナレーション生成（コンテ）",
  "generate-script":              "台本生成",
  "export":                       "エクスポート",
};

const CHECKOUT_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: "処理中",     color: "#f59e0b" },
  completed: { label: "完了",       color: "#22c55e" },
  paid:      { label: "支払済",     color: "#22c55e" },
  failed:    { label: "失敗",       color: "#ef4444" },
  canceled:  { label: "キャンセル", color: "#94a3b8" },
};

function planLabel(plan: string | null): string {
  if (!plan || plan === "Free") return "無料プラン";
  return plan;
}

function planColors(plan: string | null): { bg: string; color: string } {
  if (!plan || plan === "Free") return { bg: "#f1f5f9", color: "#64748b" };
  return { bg: `${TEAL}18`, color: TEAL };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function CreditBadge({ delta }: { delta: number }) {
  const isGrant = delta > 0;
  const color = isGrant ? "#22c55e" : "#ef4444";
  return (
    <span style={{ fontSize: 13, fontWeight: 700, color, flexShrink: 0 }}>
      {isGrant ? `+${delta.toLocaleString()}` : delta.toLocaleString()} cr
    </span>
  );
}

function CreditEntry({ log }: { log: CreditLog }) {
  const isGrant = log.delta > 0;
  const color = REASON_COLOR[log.reason ?? ""] ?? (isGrant ? "#22c55e" : "#ef4444");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: "#f8fafc", marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: "#475569", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {actionLabel(log.creditType)}
      </span>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>
          {log.delta > 0 ? `+${log.delta.toLocaleString()}` : log.delta.toLocaleString()} cr
        </span>
        <div style={{ fontSize: 10, color: "#94a3b8" }}>{fmtDate(log.createdAt)}</div>
      </div>
    </div>
  );
}

function ErrorEntry({ log }: { log: ErrorLog }) {
  const [open, setOpen] = useState(false);
  const lv = LEVEL_COLOR[log.level] ?? LEVEL_COLOR.error;
  const srcLabel = SOURCE_LABEL[log.source] ?? log.source;
  const hasDetail = !!log.detail && Object.keys(log.detail).length > 0;
  return (
    <div style={{ borderRadius: 8, background: lv.bg, border: `1px solid ${lv.fg}22`, marginBottom: 4, overflow: "hidden" }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", cursor: hasDetail ? "pointer" : "default" }}
        onClick={() => hasDetail && setOpen((v) => !v)}
      >
        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, flexShrink: 0, background: `${lv.fg}22`, color: lv.fg }}>
          {lv.label}
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b", flexShrink: 0 }}>{srcLabel}</span>
        <span style={{ fontSize: 11, color: "#475569", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {log.message}
        </span>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>{fmtDate(log.createdAt)}</div>
          {hasDetail && <div style={{ fontSize: 9, color: lv.fg }}>{open ? "▲" : "▼"}</div>}
        </div>
      </div>
      {open && hasDetail && (
        <div style={{ padding: "0 10px 8px", fontSize: 10, color: "#64748b", fontFamily: "monospace", background: `${lv.fg}08`, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          {JSON.stringify(log.detail, null, 2)}
        </div>
      )}
    </div>
  );
}

type Tab = "log" | "checkout";

// ─── Main component ────────────────────────────────────────────────────────────

export default function UserDashboardModal({
  onClose,
  onLogout,
  userIconUrl,
  userName,
  onProfileUpdated,
}: {
  onClose: () => void;
  onLogout: () => void;
  userIconUrl?: string | null;
  userName?: string | null;
  onProfileUpdated?: (name: string | null, iconUrl: string | null) => void;
}) {
  const [data, setData]         = useState<DashboardData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>("log");
  const [filter, setFilter]     = useState<"all" | "credit" | "error">("all");
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/user/dashboard", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((res) => { if (res.ok) setData(res); })
      .finally(() => setLoading(false));
  }, []);

  const user = data?.user;
  const pc = planColors(user?.plan ?? null);

  const unified = useMemo(() => {
    const credits = (data?.creditLogs ?? []).map((d) => ({ kind: "credit" as const, data: d, ts: new Date(d.createdAt).getTime() }));
    const errors  = (data?.errorLogs  ?? []).map((d) => ({ kind: "error"  as const, data: d, ts: new Date(d.createdAt).getTime() }));
    const all = [...credits, ...errors].sort((a, b) => b.ts - a.ts);
    if (filter === "credit") return credits.sort((a, b) => b.ts - a.ts);
    if (filter === "error")  return errors.sort((a, b) => b.ts - a.ts);
    return all;
  }, [data, filter]);

  const wsConsumption = data?.workspaceConsumption ?? [];
  const totalConsumed = wsConsumption.reduce((s, w) => s + w.consumed, 0);

  return (
    <>
      {profileOpen && (
        <ProfileSettingsModal
          onClose={() => setProfileOpen(false)}
          onUpdated={(name, iconUrl) => {
            setData((prev) => prev ? {
              ...prev,
              user: { ...prev.user, name: name ?? prev.user.name, iconUrl: iconUrl ?? prev.user.iconUrl },
            } : prev);
            onProfileUpdated?.(name, iconUrl);
            setProfileOpen(false);
          }}
        />
      )}

      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 300, backdropFilter: "blur(1px)" }} />

      <div style={{
        position: "fixed", right: 0, top: 0, bottom: 0, width: 360,
        background: "#fff", zIndex: 301,
        boxShadow: "-4px 0 32px rgba(0,0,0,0.12)",
        display: "flex", flexDirection: "column",
        fontFamily: FONT,
        animation: "dash-slide 0.22s cubic-bezier(0.22,1,0.36,1) both",
      }}>
        <style>{`@keyframes dash-slide{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>ユーザーダッシュボード</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94a3b8", lineHeight: 1, padding: "2px 6px", borderRadius: 6 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, color: "#94a3b8", fontSize: 13 }}>読み込み中...</div>
          ) : (
            <>
              {/* ── ユーザー情報 ── */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#f8fafc", borderRadius: 12, border: "1px solid #f1f5f9" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${TEAL}22`, border: `2px solid ${TEAL}`, display: "flex", alignItems: "center", justifyContent: "center", color: TEAL, fontSize: 22, overflow: "hidden", flexShrink: 0 }}>
                  {(user?.iconUrl ?? userIconUrl)
                    ? <img src={user?.iconUrl ?? userIconUrl ?? ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    : "✦"}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user?.name ?? userName ?? "ユーザー"}
                  </div>
                  {user?.email && (
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
                  )}
                  <span style={{ display: "inline-block", marginTop: 5, fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 99, background: pc.bg, color: pc.color }}>
                    {planLabel(user?.plan ?? null)}
                  </span>
                </div>
              </div>

              {/* ── プロフィール設定ボタン ── */}
              <button
                onClick={() => setProfileOpen(true)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10,
                  background: "#fff", cursor: "pointer", fontFamily: FONT,
                  transition: "background 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background="#f8fafc"; b.style.borderColor=`${TEAL}66`; }}
                onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background="#fff"; b.style.borderColor="#e2e8f0"; }}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="8" cy="5.5" r="2.5"/>
                  <path d="M2.5 13.5c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5"/>
                </svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>プロフィール設定</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#94a3b8" strokeWidth="1.6" style={{ marginLeft: "auto" }}>
                  <path d="M4 2l4 4-4 4"/>
                </svg>
              </button>

              {/* ── クレジット残高 ── */}
              <Section title="クレジット残高">
                <div style={{ borderRadius: 12, border: "1px solid #e8edf4", padding: "14px 16px", background: "#f8fafc" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{
                      fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em",
                      backgroundImage: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    }}>
                      {(user?.credits ?? 0).toLocaleString()}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#64748b" }}>クレジット</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                    累計消費: {totalConsumed.toLocaleString()} cr
                  </div>
                </div>
              </Section>

              {/* ── ワークスペース別消費 ── */}
              {wsConsumption.length > 0 && (
                <Section title="ワークスペース別消費">
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {wsConsumption.map((ws) => (
                      <div key={ws.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: TEAL, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "#334155", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ws.name}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: ws.consumed > 0 ? "#ef4444" : "#94a3b8", flexShrink: 0 }}>
                          {ws.consumed > 0 ? `-${ws.consumed.toLocaleString()}` : "0"} cr
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* ── タブ ── */}
              <div style={{ display: "flex", gap: 2, background: "#f0f0f0", borderRadius: 10, padding: 3, flexShrink: 0 }}>
                {([
                  { id: "log"      as Tab, label: "ログ"     },
                  { id: "checkout" as Tab, label: "支払い履歴" },
                ] as const).map((t) => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    style={{ flex: 1, height: 30, fontSize: 12, fontWeight: 600, borderRadius: 8, border: "none",
                      background: tab === t.id ? "#fff" : "transparent",
                      color: tab === t.id ? TEAL : "#999",
                      boxShadow: tab === t.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      cursor: "pointer", transition: "all 0.15s ease", fontFamily: FONT,
                    }}>{t.label}</button>
                ))}
              </div>

              {/* ── ログ タブ ── */}
              {tab === "log" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["all", "credit", "error"] as const).map((f) => (
                      <button key={f} onClick={() => setFilter(f)}
                        style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20, border: "none", cursor: "pointer", fontFamily: FONT,
                          background: filter === f ? TEAL : "#f1f5f9",
                          color:      filter === f ? "#fff" : "#64748b",
                        }}>
                        {f === "all" ? "すべて" : f === "credit" ? "クレジット" : "エラー・警告"}
                      </button>
                    ))}
                  </div>

                  {unified.length === 0 ? (
                    <EmptyMsg text={filter === "credit" ? "まだクレジットの利用履歴がありません" : filter === "error" ? "エラーログはありません" : "まだ生成・書き出しの履歴がありません"} />
                  ) : unified.map((entry) =>
                    entry.kind === "credit"
                      ? <CreditEntry key={entry.data.id} log={entry.data} />
                      : <ErrorEntry  key={entry.data.id} log={entry.data} />
                  )}
                </div>
              )}

              {/* ── 支払い履歴 ── */}
              {tab === "checkout" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {(data?.checkoutLogs ?? []).length === 0 ? (
                    <EmptyMsg text="支払い履歴はまだありません" />
                  ) : (data?.checkoutLogs ?? []).map((log) => {
                    const st = CHECKOUT_STATUS_LABEL[log.status] ?? { label: log.status, color: "#94a3b8" };
                    return (
                      <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: "#f8fafc", marginBottom: 4 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{fmtCurrency(log.amount, log.currency)}</div>
                          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{fmtDate(log.createdAt)}</div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: `${st.color}18`, color: st.color, flexShrink: 0 }}>
                          {st.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid #f1f5f9", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <a
            href="/manual"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              width: "100%", padding: "9px 0", fontSize: 13, fontWeight: 600,
              border: "1.5px solid #e2e8f0", borderRadius: 8, background: "#fff", color: "#475569",
              cursor: "pointer", fontFamily: FONT, textDecoration: "none",
              transition: "background 0.15s, color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => { const a = e.currentTarget as HTMLAnchorElement; a.style.background=`${TEAL}10`; a.style.color=TEAL; a.style.borderColor=`${TEAL}66`; }}
            onMouseLeave={(e) => { const a = e.currentTarget as HTMLAnchorElement; a.style.background="#fff"; a.style.color="#475569"; a.style.borderColor="#e2e8f0"; }}
          >
            <BookIcon /> マニュアルを開く
          </a>
          <button onClick={onLogout}
            style={{ width: "100%", padding: "9px 0", fontSize: 13, fontWeight: 600,
              border: "1.5px solid #e2e8f0", borderRadius: 8, background: "#fff", color: "#64748b",
              cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              transition: "background 0.15s, color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background="#fef2f2"; b.style.color="#ef4444"; b.style.borderColor="#fca5a5"; }}
            onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background="#fff"; b.style.color="#64748b"; b.style.borderColor="#e2e8f0"; }}
          >
            <LogoutIcon /> ログアウト
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Micro components ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, fontFamily: FONT }}>{title}</div>
      {children}
    </div>
  );
}

function EmptyMsg({ text = "データがありません" }: { text?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "20px 0", color: "#cbd5e1", fontSize: 12, fontFamily: FONT }}>{text}</div>
  );
}

function BookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5z"/>
      <path d="M5 2v12M5 7h6"/>
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/><path d="M11 11l3-3-3-3"/><path d="M14 8H6"/>
    </svg>
  );
}
