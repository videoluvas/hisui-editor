"use client";

import { useEffect, useMemo, useState } from "react";
import { TEAL } from "@/components/icons";

const FONT = "'Noto Sans JP', sans-serif";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashUser = {
  id: string;
  name: string | null;
  email: string | null;
  plan: string | null;
  iconUrl: string | null;
  creditImg: number;
  creditImgMax: number;
  creditScript: number;
  creditScriptMax: number;
};

type CreditLog = {
  id: string;
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

type DashboardData = {
  user: DashUser;
  creditLogs: CreditLog[];
  errorLogs: ErrorLog[];
  checkoutLogs: CheckoutLog[];
};

type UnifiedEntry =
  | { kind: "credit"; data: CreditLog; ts: number }
  | { kind: "error";  data: ErrorLog;  ts: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const dtFmt = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit",
});

function fmtDate(s: string) {
  try { return dtFmt.format(new Date(s)); } catch { return s; }
}

function fmtCurrency(amount: number | null, currency: string | null) {
  if (amount == null) return "—";
  const cur = (currency ?? "jpy").toUpperCase();
  try { return new Intl.NumberFormat("ja-JP", { style: "currency", currency: cur }).format(amount); }
  catch { return `${amount} ${cur}`; }
}

const CREDIT_TYPE_LABEL: Record<string, string> = {
  img:   "画像生成",
  script:"台本生成",
  video: "動画生成",
  audio: "ナレーション生成",
};

const CREDIT_TYPE_COLOR: Record<string, { bg: string; fg: string }> = {
  img:   { bg: `${TEAL}18`,    fg: TEAL },
  script:{ bg: "#7F5AF018",    fg: "#7F5AF0" },
  video: { bg: "#f59e0b18",    fg: "#f59e0b" },
  audio: { bg: "#22c55e18",    fg: "#22c55e" },
};

const REASON_LABEL: Record<string, string> = {
  generation_used: "利用",
  plan_upgrade:    "プランアップグレード",
  manual_grant:    "付与",
  refund:          "返金",
  refund_error:    "エラー返金",
};

const REASON_COLOR: Record<string, string> = {
  generation_used: "#ef4444",
  plan_upgrade:    TEAL,
  manual_grant:    "#22c55e",
  refund:          "#22c55e",
  refund_error:    "#22c55e",
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

function CreditBar({ label, used, max }: { label: string; used: number; max: number }) {
  const usedCount = max - used;
  const ratio = max > 0 ? used / max : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5, fontFamily: FONT }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{label}</span>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>
          残り <strong style={{ color: used < 0 ? "#ef4444" : "#1e293b", fontWeight: 700 }}>{used}</strong> / {max}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99,
          width: `${Math.max(0, Math.min(100, ratio * 100))}%`,
          background: ratio > 0.5 ? TEAL : ratio > 0.2 ? "#f59e0b" : "#ef4444",
          transition: "width 0.4s ease",
        }} />
      </div>
      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3, fontFamily: FONT, textAlign: "right" }}>
        {usedCount} 回使用済
      </div>
    </div>
  );
}

function CreditEntry({ log }: { log: CreditLog }) {
  const ct = CREDIT_TYPE_COLOR[log.creditType] ?? { bg: "#f1f5f9", fg: "#94a3b8" };
  const reason = log.reason ?? "generation_used";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: "#f8fafc", marginBottom: 4 }}>
      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, flexShrink: 0, background: ct.bg, color: ct.fg, letterSpacing: "0.02em" }}>
        {CREDIT_TYPE_LABEL[log.creditType] ?? log.creditType}
      </span>
      <span style={{ fontSize: 11, color: "#475569", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {REASON_LABEL[reason] ?? reason}
      </span>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: REASON_COLOR[reason] ?? (log.delta < 0 ? "#ef4444" : "#22c55e") }}>
          {log.delta > 0 ? `+${log.delta}` : log.delta}
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
}: {
  onClose: () => void;
  onLogout: () => void;
  userIconUrl?: string | null;
  userName?: string | null;
}) {
  const [data, setData]     = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState<Tab>("log");
  const [filter, setFilter] = useState<"all" | "credit" | "error">("all");

  useEffect(() => {
    fetch("/api/user/dashboard", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((res) => { if (res.ok) setData(res); })
      .finally(() => setLoading(false));
  }, []);

  const user = data?.user;
  const pc = planColors(user?.plan ?? null);

  const unified: UnifiedEntry[] = useMemo(() => {
    const credits: UnifiedEntry[] = (data?.creditLogs ?? []).map((d) => ({ kind: "credit", data: d, ts: new Date(d.createdAt).getTime() }));
    const errors:  UnifiedEntry[] = (data?.errorLogs  ?? []).map((d) => ({ kind: "error",  data: d, ts: new Date(d.createdAt).getTime() }));
    const all = [...credits, ...errors].sort((a, b) => b.ts - a.ts);
    if (filter === "credit") return credits.sort((a, b) => b.ts - a.ts);
    if (filter === "error")  return errors.sort((a, b) => b.ts - a.ts);
    return all;
  }, [data, filter]);

  return (
    <>
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

              {/* ── 生成クレジット ── */}
              <Section title="生成クレジット">
                {user ? (
                  <>
                    <CreditBar label="画像生成" used={user.creditImg}    max={user.creditImgMax} />
                    <CreditBar label="台本生成" used={user.creditScript} max={user.creditScriptMax} />
                  </>
                ) : <EmptyMsg />}
              </Section>

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
                  {/* フィルター */}
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

                  {/* 統合ログ */}
                  {unified.length === 0 ? (
                    <EmptyMsg text="ログがありません" />
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
                    <EmptyMsg text="支払い履歴がありません" />
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
        <div style={{ padding: "12px 18px", borderTop: "1px solid #f1f5f9", flexShrink: 0 }}>
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

function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/><path d="M11 11l3-3-3-3"/><path d="M14 8H6"/>
    </svg>
  );
}
