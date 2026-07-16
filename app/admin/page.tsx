"use client";

import { useCallback, useEffect, useState } from "react";

const FONT = "'Noto Sans JP', sans-serif";
const CYAN = "#5184F0";
const TEAL = "#169385";

// ─── Types ────────────────────────────────────────────────────────────────────

type LogEntry = {
  id: string; level: string; source: string;
  userId: string | null; userEmail: string | null;
  message: string; detail: Record<string, unknown> | null; createdAt: string;
};

type Stats = {
  totalUsers: number; errorsToday: number; errors7d: number;
  latestError: { message: string; source: string; level: string; createdAt: string } | null;
  errorsBySource: { source: string; count: number }[];
};

type AdminUser = {
  id: string; name: string | null; email: string | null; plan: string | null;
  credits: number;
  createdAt: string;
};

type PageState = "loading" | "unauthorized" | "forbidden" | "loaded";
type Tab = "logs" | "users" | "invite" | "samples";

type SampleStoryboard = {
  id: string; title: string | null; isDefaultSample: boolean; createdAt: string;
  _count: { scenes: number };
};
type SampleProject = {
  id: string; title: string; isDefaultSample: boolean; createdAt: string;
  thumbnailUrl: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEVEL_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  error: { bg: "#fee2e2", color: "#dc2626", label: "ERROR" },
  warn:  { bg: "#fef9c3", color: "#d97706", label: "WARN"  },
  info:  { bg: "#dbeafe", color: "#2563eb", label: "INFO"  },
};

const PLAN_COLORS: Record<string, { bg: string; fg: string }> = {
  Free: { bg: "#f1f5f9", fg: "#64748b" },
  Pro:  { bg: `${TEAL}18`, fg: TEAL },
};

function planColor(plan: string | null) {
  return PLAN_COLORS[plan ?? "Free"] ?? PLAN_COLORS.Free;
}

function fmtTime(iso: string) {
  const d = new Date(iso), now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return d.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: string }) {
  const s = LEVEL_STYLE[level] ?? { bg: "#f1f5f9", color: "#64748b", label: level.toUpperCase() };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: "16px 20px", border: `1px solid ${color}22` }}>
      <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color }}>{value.toLocaleString()}</p>
    </div>
  );
}

// ─── User row with inline plan switcher ───────────────────────────────────────

function UserRow({ user, onUpdate, onDelete }: {
  user: AdminUser;
  onUpdate: (u: AdminUser) => void;
  onDelete: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [grantAmount, setGrantAmount] = useState("");
  const [msg, setMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [entering, setEntering] = useState(false);
  const patch = async (payload: Record<string, unknown>) => {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, ...payload }),
      });
      const data = await res.json();
      if (data.ok) { onUpdate(data.user); setMsg("✓"); setTimeout(() => setMsg(""), 2000); }
      else setMsg(data.message ?? "エラー");
    } finally { setBusy(false); }
  };

  const togglePlan = () => patch({ plan: user.plan === "Pro" ? "Free" : "Pro" });

  const handleEnter = async () => {
    setEntering(true);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.ok) {
        window.open("/", "_blank");
      } else {
        alert(data.message ?? "エラーが発生しました");
      }
    } finally {
      setEntering(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.ok) {
        onDelete(user.id);
      } else {
        alert(data.message ?? "削除に失敗しました");
        setConfirmDelete(false);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleGrant = () => {
    const amount = parseInt(grantAmount) || 0;
    if (!amount) return;
    patch({ grantCredits: amount });
    setGrantAmount("");
  };

  const handleInit = () => patch({ initCredits: true });

  const pc = planColor(user.plan);

  return (
    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
      {/* ユーザー */}
      <td style={{ padding: "10px 14px", maxWidth: 200 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.name ?? "—"}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.email ?? "—"}
        </div>
        <div style={{ fontSize: 10, color: "#cbd5e1", marginTop: 2 }}>{fmtDate(user.createdAt)}</div>
      </td>

      {/* プラン切り替え */}
      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: pc.bg, color: pc.fg }}>
            {user.plan ?? "Free"}
          </span>
          <button
            onClick={togglePlan}
            disabled={busy}
            style={{
              fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, border: "none",
              cursor: busy ? "default" : "pointer",
              background: user.plan === "Pro" ? "#fee2e2" : `${TEAL}18`,
              color:      user.plan === "Pro" ? "#dc2626" : TEAL,
            }}
          >
            {user.plan === "Pro" ? "→ Free" : "→ Pro"}
          </button>
        </div>
      </td>

      {/* クレジット残高 */}
      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: user.credits < 500 ? "#dc2626" : "#334155" }}>
          {user.credits.toLocaleString()} cr
        </span>
      </td>

      {/* クレジット付与 */}
      <td style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            value={grantAmount}
            onChange={(e) => setGrantAmount(e.target.value)}
            placeholder="+cr"
            type="number"
            style={{ width: 72, fontSize: 11, padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 6, outline: "none", color: "#334155" }}
          />
          <button
            onClick={handleGrant}
            disabled={busy || !grantAmount}
            style={{
              fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, border: "none",
              background: CYAN, color: "#fff", cursor: "pointer", whiteSpace: "nowrap",
              opacity: !grantAmount ? 0.4 : 1,
            }}
          >付与</button>
          <button
            onClick={handleInit}
            disabled={busy}
            title="プランのデフォルト値にリセット"
            style={{
              fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0",
              background: "#f8fafc", color: "#64748b", cursor: "pointer", whiteSpace: "nowrap",
            }}
          >初期化</button>
          {msg && <span style={{ fontSize: 11, color: msg.startsWith("✓") ? TEAL : "#dc2626" }}>{msg}</span>}
        </div>
      </td>

      {/* アクション */}
      <td style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={handleEnter}
              disabled={entering}
              title="このユーザーのセッションでツールを開く（新タブ）"
              style={{
                fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, border: "none",
                background: `${TEAL}18`, color: TEAL,
                cursor: entering ? "default" : "pointer", opacity: entering ? 0.6 : 1, whiteSpace: "nowrap",
              }}
            >{entering ? "..." : "↗ 入る"}</button>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, border: "none",
                  background: "#fee2e2", color: "#dc2626", cursor: "pointer", whiteSpace: "nowrap",
                }}
              >削除</button>
            ) : (
              <div style={{ display: "flex", gap: 4, alignItems: "center", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8, padding: "4px 8px" }}>
                <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 700, whiteSpace: "nowrap" }}>削除する？</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 5, border: "none", background: "#dc2626", color: "#fff", cursor: deleting ? "default" : "pointer" }}
                >{deleting ? "..." : "YES"}</button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, border: "none", background: "#f1f5f9", color: "#64748b", cursor: "pointer" }}
                >NO</button>
              </div>
            )}
          </div>

        </div>
      </td>
    </tr>
  );
}

function SampleToggleRow({ label, sub, date, checked, onToggle }: {
  label: string; sub?: string; date: string; checked: boolean;
  onToggle: (v: boolean) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [TEAL_LOCAL] = useState("#169385");

  const handle = async () => {
    setBusy(true);
    await onToggle(!checked);
    setBusy(false);
  };

  return (
    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
      <td style={{ padding: "10px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "#94a3b8" }}>{sub}</div>}
      </td>
      {sub !== undefined && <td style={{ padding: "10px 16px", fontSize: 12, color: "#64748b" }}>{sub}</td>}
      <td style={{ padding: "10px 16px", fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{date}</td>
      <td style={{ padding: "10px 16px" }}>
        <button
          onClick={handle}
          disabled={busy}
          style={{
            padding: "4px 14px", fontSize: 12, fontWeight: 700, borderRadius: 6, border: "none",
            cursor: busy ? "default" : "pointer",
            background: checked ? `${TEAL_LOCAL}18` : "#f1f5f9",
            color: checked ? TEAL_LOCAL : "#94a3b8",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {checked ? "✓ デフォルト" : "デフォルトに設定"}
        </button>
      </td>
    </tr>
  );
}

function CreditCell({ cur, max, color }: { cur: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
  return (
    <div style={{ minWidth: 90 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: cur < 0 ? "#dc2626" : "#334155" }}>
        {cur} <span style={{ fontSize: 10, fontWeight: 400, color: "#94a3b8" }}>/ {max}</span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: "#e2e8f0", overflow: "hidden", marginTop: 3 }}>
        <div style={{ height: "100%", borderRadius: 99, width: `${pct}%`, background: pct > 40 ? color : pct > 15 ? "#f59e0b" : "#ef4444", transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [tab, setTab]             = useState<Tab>("logs");

  // logs
  const [stats, setStats]           = useState<Stats | null>(null);
  const [logs, setLogs]             = useState<LogEntry[]>([]);
  const [total, setTotal]           = useState(0);
  const [filterLevel, setFilterLevel]   = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [offset, setOffset]         = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 50;

  // users
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState("");

  // invite
  const [invEmail, setInvEmail]         = useState("");
  const [invName, setInvName]           = useState("");
  const [invCompany, setInvCompany]     = useState("");
  const [invPassword, setInvPassword]   = useState("");
  const [invLoading, setInvLoading]     = useState(false);
  const [invResult, setInvResult]       = useState<{ ok: boolean; email?: string; password?: string; message?: string } | null>(null);
  const [invHistory, setInvHistory]     = useState<{ email: string; name: string; password: string; sentAt: string }[]>([]);

  // samples
  const [sampleStoryboards, setSampleStoryboards] = useState<SampleStoryboard[]>([]);
  const [sampleProjects, setSampleProjects]       = useState<SampleProject[]>([]);
  const [samplesError, setSamplesError]           = useState<string | null>(null);
  const [samplesLoading, setSamplesLoading]       = useState(false);

  // login
  const [loginEmail, setLoginEmail]       = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError]       = useState("");
  const [loginLoading, setLoginLoading]   = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(""); setLoginLoading(true);
    try {
      const res  = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: loginEmail, password: loginPassword }) });
      const data = await res.json();
      if (!data.ok) { setLoginError(data.message ?? "ログインに失敗しました"); return; }
      await fetchStats();
    } catch { setLoginError("サーバーエラーが発生しました"); }
    finally  { setLoginLoading(false); }
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 401) { setPageState("unauthorized"); return; }
      if (res.status === 403) { setPageState("forbidden");    return; }
      const data = await res.json();
      if (data.ok) { setStats(data); setPageState("loaded"); setLastRefresh(new Date()); }
    } catch { /* ignore */ }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterLevel)  params.set("level",  filterLevel);
      if (filterSource) params.set("source", filterSource);
      params.set("limit", String(limit)); params.set("offset", String(offset));
      const res  = await fetch(`/api/admin/logs?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok) { setLogs(data.logs); setTotal(data.total); }
    } catch { /* ignore */ }
  }, [filterLevel, filterSource, offset]);

  const fetchUsers = useCallback(async () => {
    try {
      const res  = await fetch("/api/admin/users");
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok) setUsers(data.users);
    } catch { /* ignore */ }
  }, []);


  const fetchSamples = useCallback(async () => {
    setSamplesLoading(true);
    setSamplesError(null);
    try {
      const res  = await fetch("/api/admin/samples");
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        setSamplesError(`API エラー ${res.status}: ${body.message ?? res.statusText}`);
        return;
      }
      const data = await res.json();
      if (data.ok) {
        setSampleStoryboards(data.storyboards);
        setSampleProjects(data.projects);
      } else {
        setSamplesError(data.message ?? "取得に失敗しました");
      }
    } catch (e) {
      setSamplesError(e instanceof Error ? e.message : "通信エラー");
    } finally {
      setSamplesLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (pageState === "loaded") { fetchLogs(); fetchUsers(); fetchSamples(); } }, [pageState, fetchLogs, fetchUsers, fetchSamples]);
  useEffect(() => {
    if (pageState !== "loaded") return;
    const id = setInterval(() => { fetchStats(); fetchLogs(); }, 30_000);
    return () => clearInterval(id);
  }, [pageState, fetchStats, fetchLogs]);
  useEffect(() => { setOffset(0); }, [filterLevel, filterSource]);

  const totalPages  = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const filteredUsers = users.filter((u) =>
    !userSearch || (u.email ?? "").toLowerCase().includes(userSearch.toLowerCase()) || (u.name ?? "").includes(userSearch)
  );

  // ── 未ログイン ──────────────────────────────────────────────────────────────
  if (pageState === "loading") return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: FONT }}>
      <p style={{ color: "#94a3b8" }}>読み込み中...</p>
    </div>
  );

  if (pageState === "unauthorized") return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc", fontFamily: FONT }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", width: 360, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#1e293b" }}>管理画面</h1>
        <p style={{ margin: "0 0 28px", fontSize: 13, color: "#94a3b8" }}>管理者アカウントでログインしてください</p>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>メールアドレス</label>
            <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required placeholder="admin@example.com"
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", color: "#1e293b", background: "#f8fafc" }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>パスワード</label>
            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required placeholder="••••••••"
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", color: "#1e293b", background: "#f8fafc" }} />
          </div>
          {loginError && <p style={{ margin: "0 0 16px", fontSize: 12, color: "#dc2626", background: "#fee2e2", padding: "8px 12px", borderRadius: 8 }}>{loginError}</p>}
          <button type="submit" disabled={loginLoading}
            style={{ width: "100%", padding: "11px", fontSize: 14, fontWeight: 700, background: loginLoading ? "#94a3b8" : CYAN, color: "#fff", border: "none", borderRadius: 8, cursor: loginLoading ? "default" : "pointer" }}>
            {loginLoading ? "ログイン中..." : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );

  if (pageState === "forbidden") return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: FONT }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#dc2626", marginBottom: 8, fontWeight: 700, fontSize: 18 }}>アクセス権限がありません</p>
        <p style={{ color: "#94a3b8", marginBottom: 16, fontSize: 13 }}>管理者アカウントでログインしてください</p>
        <a href="/" style={{ color: CYAN }}>トップへ戻る</a>
      </div>
    </div>
  );

  const sourcesForFilter = [
    { value: "", label: "すべてのソース" },
    ...(stats?.errorsBySource ?? []).map((s) => ({ value: s.source, label: s.source })),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: FONT }}>

      {/* ヘッダー */}
      <div style={{ background: "#1e293b", color: "#f8fafc", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>⚙ 管理画面</span>
        <span style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#94a3b8" }}>
          {lastRefresh ? `更新: ${lastRefresh.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
          <button onClick={() => { fetchStats(); fetchLogs(); fetchUsers(); }}
            style={{ background: "none", border: "1px solid #334155", color: "#cbd5e1", padding: "3px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
            🔄 更新
          </button>
        </span>
      </div>

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "24px" }}>

        {/* 統計カード */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <StatCard label="エラー（本日）"  value={stats?.errorsToday ?? 0} color="#dc2626" bg="#fff1f2" />
          <StatCard label="エラー（7日間）" value={stats?.errors7d   ?? 0} color="#d97706" bg="#fffbeb" />
          <StatCard label="総ユーザー数"    value={stats?.totalUsers ?? 0} color={CYAN}     bg="#eff6ff" />
          <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #e2e8f0" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>最新エラー</p>
            {stats?.latestError ? (
              <>
                <p style={{ margin: 0, fontSize: 12, color: "#475569", fontWeight: 600, marginBottom: 4 }}>{stats.latestError.source}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>{fmtTime(stats.latestError.createdAt)}</p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: "#22c55e", fontWeight: 600 }}>エラーなし</p>
            )}
          </div>
        </div>

        {/* ソース別エラー */}
        {(stats?.errorsBySource ?? []).length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
            <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#334155" }}>ソース別エラー（7日間）</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {stats!.errorsBySource.map((s) => (
                <span key={s.source} style={{ background: "#f1f5f9", padding: "4px 12px", borderRadius: 99, fontSize: 12, color: "#475569" }}>
                  <span style={{ fontFamily: "monospace" }}>{s.source}</span>
                  <span style={{ marginLeft: 8, fontWeight: 700, color: "#dc2626" }}>{s.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* タブ切り替え */}
        <div style={{ display: "flex", gap: 2, background: "#e2e8f0", borderRadius: 10, padding: 3, width: "fit-content", marginBottom: 20 }}>
          {([
            { id: "logs" as Tab,    label: "エラーログ" },
            { id: "users" as Tab,   label: `ユーザー管理（${users.length}）` },
            { id: "invite" as Tab,  label: "ユーザー招待" },
            { id: "samples" as Tab, label: "サンプル管理" },
          ] as const).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "6px 20px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "none", cursor: "pointer", fontFamily: FONT,
                background: tab === t.id ? "#fff" : "transparent",
                color:      tab === t.id ? CYAN : "#64748b",
                boxShadow:  tab === t.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}>{t.label}</button>
          ))}
        </div>

        {/* ── エラーログタブ ── */}
        {tab === "logs" && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>エラーログ</span>
              <span style={{ color: "#cbd5e1", fontSize: 12 }}>全 {total} 件</span>
              <div style={{ flex: 1 }} />
              <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}
                style={{ fontSize: 12, padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", color: "#475569", background: "#f8fafc" }}>
                <option value="">すべてのレベル</option>
                <option value="error">error</option>
                <option value="warn">warn</option>
                <option value="info">info</option>
              </select>
              <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}
                style={{ fontSize: 12, padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", color: "#475569", background: "#f8fafc" }}>
                {sourcesForFilter.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["レベル", "ソース", "ユーザー", "メッセージ", "日時"].map((h) => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: "40px 16px", textAlign: "center", color: "#cbd5e1", fontSize: 13 }}>ログがありません</td></tr>
                  ) : logs.map((log) => (
                    <>
                      <tr key={log.id}
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                        style={{ borderBottom: "1px solid #f1f5f9", cursor: log.detail ? "pointer" : "default" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#f8fafc"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ""; }}
                      >
                        <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}><LevelBadge level={log.level} /></td>
                        <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>{log.source}</td>
                        <td style={{ padding: "10px 16px", fontSize: 12, color: "#64748b", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.userEmail ?? log.userId ?? "—"}</td>
                        <td style={{ padding: "10px 16px", color: "#334155", maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.message}>{log.message}</td>
                        <td style={{ padding: "10px 16px", fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>{fmtTime(log.createdAt)}</td>
                      </tr>
                      {expandedId === log.id && log.detail && (
                        <tr key={`${log.id}-d`} style={{ background: "#f8fafc" }}>
                          <td colSpan={5} style={{ padding: "0 16px 12px" }}>
                            <pre style={{ margin: 0, fontSize: 11, color: "#475569", background: "#f1f5f9", padding: "10px 14px", borderRadius: 8, overflowX: "auto", maxHeight: 200 }}>
                              {JSON.stringify(log.detail, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ padding: "14px 20px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
                <button disabled={currentPage <= 1} onClick={() => setOffset(Math.max(0, offset - limit))}
                  style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: currentPage <= 1 ? "#f8fafc" : "#fff", color: currentPage <= 1 ? "#cbd5e1" : "#475569", cursor: currentPage <= 1 ? "default" : "pointer", fontSize: 12 }}>← 前へ</button>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{currentPage} / {totalPages} ページ</span>
                <button disabled={currentPage >= totalPages} onClick={() => setOffset(offset + limit)}
                  style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: currentPage >= totalPages ? "#f8fafc" : "#fff", color: currentPage >= totalPages ? "#cbd5e1" : "#475569", cursor: currentPage >= totalPages ? "default" : "pointer", fontSize: 12 }}>次へ →</button>
              </div>
            )}
          </div>
        )}

        {/* ── ユーザー管理タブ ── */}
        {tab === "users" && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>ユーザー管理</span>
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="メール・名前で検索..."
                style={{ fontSize: 12, padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", color: "#475569", background: "#f8fafc", outline: "none", width: 200 }}
              />
              <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>
                {filteredUsers.length} 件
                {filteredUsers.filter(u => u.plan === "Pro").length > 0 && (
                  <span style={{ marginLeft: 8, color: TEAL, fontWeight: 600 }}>
                    Pro: {filteredUsers.filter(u => u.plan === "Pro").length}
                  </span>
                )}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["ユーザー", "プラン", "クレジット残高", "クレジット付与", "アクション"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: "40px 14px", textAlign: "center", color: "#cbd5e1", fontSize: 13 }}>ユーザーがいません</td></tr>
                  ) : filteredUsers.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      onUpdate={(updated) => setUsers((prev) => prev.map((x) => x.id === updated.id ? { ...x, ...updated } : x))}
                      onDelete={(id) => setUsers((prev) => prev.filter((x) => x.id !== id))}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ユーザー招待タブ ── */}
        {tab === "invite" && (
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>

            {/* 招待フォーム */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "24px 24px 20px", minWidth: 340, flex: "0 0 340px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 18, fontFamily: FONT }}>新規ユーザーを招待</div>

              {[
                { label: "メールアドレス *", value: invEmail, set: setInvEmail, type: "email", placeholder: "user@company.com" },
                { label: "お名前（任意）",   value: invName,    set: setInvName,    type: "text",  placeholder: "山田 太郎" },
                { label: "会社名（任意）",   value: invCompany, set: setInvCompany, type: "text",  placeholder: "株式会社〇〇" },
              ].map(({ label, value, set, type, placeholder }) => (
                <div key={label} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4, fontFamily: FONT }}>{label}</label>
                  <input
                    type={type} value={value} onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                    style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" as const, fontFamily: FONT }}
                  />
                </div>
              ))}

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4, fontFamily: FONT }}>
                  初期パスワード（空欄で自動生成）
                </label>
                <input
                  type="text" value={invPassword} onChange={(e) => setInvPassword(e.target.value)}
                  placeholder="空欄で自動生成"
                  style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" as const, fontFamily: FONT, letterSpacing: "0.05em" }}
                />
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4, fontFamily: FONT }}>メールに初期パスワードが記載されます</div>
              </div>

              {invResult && (
                <div style={{
                  padding: "10px 12px", borderRadius: 8, marginBottom: 14, fontSize: 12, fontFamily: FONT,
                  background: invResult.ok ? "#f0faf5" : "#fff0f0",
                  border: `1px solid ${invResult.ok ? "#a7f3d0" : "#ffcdd2"}`,
                  color: invResult.ok ? "#065f46" : "#c62828",
                }}>
                  {invResult.ok ? (
                    <>
                      <strong>{invResult.email}</strong> に招待メールを送信しました<br />
                      <span style={{ fontSize: 11, color: "#047857" }}>初期PW: <strong>{invResult.password}</strong></span>
                    </>
                  ) : invResult.message}
                </div>
              )}

              <button
                disabled={invLoading || !invEmail}
                onClick={async () => {
                  setInvLoading(true);
                  setInvResult(null);
                  const res = await fetch("/api/admin/invite", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: invEmail, name: invName, companyName: invCompany, customPassword: invPassword }),
                  });
                  const data = await res.json() as { ok: boolean; email?: string; password?: string; message?: string };
                  setInvResult(data);
                  if (data.ok && data.email && data.password) {
                    setInvHistory((h) => [{ email: data.email!, name: invName, password: data.password!, sentAt: new Date().toLocaleString("ja-JP") }, ...h]);
                    setInvEmail(""); setInvName(""); setInvCompany(""); setInvPassword("");
                  }
                  setInvLoading(false);
                }}
                style={{
                  width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 10, cursor: invLoading || !invEmail ? "not-allowed" : "pointer",
                  background: invLoading || !invEmail ? "#94a3b8" : `linear-gradient(135deg, ${TEAL}, #0d7a6e)`,
                  color: "#fff", fontFamily: FONT,
                }}
              >
                {invLoading ? "送信中..." : "招待メールを送信"}
              </button>
            </div>

            {/* 送信履歴 */}
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 12, fontFamily: FONT }}>
                今セッションの送信履歴
              </div>
              {invHistory.length === 0 ? (
                <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: FONT }}>まだ送信していません</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {invHistory.map((h, i) => (
                    <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 12, fontFamily: FONT }}>
                      <div style={{ fontWeight: 700, color: "#1e293b" }}>{h.email}</div>
                      {h.name && <div style={{ color: "#64748b", marginTop: 2 }}>{h.name}</div>}
                      <div style={{ color: "#94a3b8", marginTop: 3 }}>初期PW: <span style={{ fontWeight: 600, color: "#475569", letterSpacing: "0.04em" }}>{h.password}</span></div>
                      <div style={{ color: "#cbd5e1", marginTop: 2, fontSize: 11 }}>{h.sentAt}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── サンプル管理タブ ── */}
        {tab === "samples" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {samplesError && (
              <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#c62828", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ flex: 1 }}>⚠ {samplesError}</span>
                <button
                  onClick={fetchSamples}
                  style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 6, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer" }}
                >再試行</button>
              </div>
            )}

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>コンテ（ストーリーボード）</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>
                  デフォルト: {sampleStoryboards.filter(s => s.isDefaultSample).length} 件
                </span>
                <div style={{ flex: 1 }} />
                <button
                  onClick={fetchSamples}
                  disabled={samplesLoading}
                  style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", cursor: samplesLoading ? "default" : "pointer" }}
                >{samplesLoading ? "読込中..." : "🔄 更新"}</button>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["タイトル", "シーン数", "作成日", "デフォルトサンプル"].map((h) => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleStoryboards.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: "32px 16px", textAlign: "center", color: "#cbd5e1", fontSize: 13 }}>
                      {samplesLoading ? "読み込み中..." : samplesError ? "上記エラーを確認してください" : "管理者アカウントでコンテを作成してください"}
                    </td></tr>
                  ) : sampleStoryboards.map((sb) => (
                    <SampleToggleRow
                      key={sb.id}
                      label={sb.title ?? "無題"}
                      sub={`${sb._count.scenes} シーン`}
                      date={fmtDate(sb.createdAt)}
                      checked={sb.isDefaultSample}
                      onToggle={async (v) => {
                        await fetch("/api/admin/samples", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ type: "storyboard", id: sb.id, isDefaultSample: v }),
                        });
                        setSampleStoryboards((prev) => prev.map((x) => x.id === sb.id ? { ...x, isDefaultSample: v } : x));
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>動画編集プロジェクト</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>
                  デフォルト: {sampleProjects.filter(s => s.isDefaultSample).length} 件
                </span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["タイトル", "作成日", "デフォルトサンプル"].map((h) => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleProjects.length === 0 ? (
                    <tr><td colSpan={3} style={{ padding: "32px 16px", textAlign: "center", color: "#cbd5e1", fontSize: 13 }}>
                      {samplesLoading ? "読み込み中..." : samplesError ? "上記エラーを確認してください" : "管理者アカウントでプロジェクトを作成してください"}
                    </td></tr>
                  ) : sampleProjects.map((pj) => (
                    <SampleToggleRow
                      key={pj.id}
                      label={pj.title}
                      sub={undefined}
                      date={fmtDate(pj.createdAt)}
                      checked={pj.isDefaultSample}
                      onToggle={async (v) => {
                        await fetch("/api/admin/samples", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ type: "project", id: pj.id, isDefaultSample: v }),
                        });
                        setSampleProjects((prev) => prev.map((x) => x.id === pj.id ? { ...x, isDefaultSample: v } : x));
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#92400e", lineHeight: 1.7 }}>
              ⚠️ デフォルトサンプルは<strong>新規ユーザー登録時</strong>に自動コピーされます。既存ユーザーには適用されません。
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
