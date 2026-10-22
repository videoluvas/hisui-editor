import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ─── Cloudflare Turnstile（ロボット対策） ─────────────────────────────────────
// TURNSTILE_SECRET_KEY が未設定なら確認を飛ばす（キーを入れる前の開発環境でも動くように）

export async function verifyTurnstile(token: unknown, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || !token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

// ─── 回数制限（プロセス内のメモリで数える。本番は PM2 の 1 プロセス） ─────────

const hits = new Map<string, number[]>();

export function overLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  }
  return recent.length > limit;
}

export function clientIp(req: NextRequest): string | null {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip");
}

// ロボット確認と回数制限をまとめて行う。問題があればそのまま返すレスポンス、なければ null
export async function guardAuth(
  req: NextRequest,
  token: unknown,
  limits: { key: string; limit: number; windowMs: number }[],
): Promise<NextResponse | null> {
  for (const l of limits) {
    if (overLimit(l.key, l.limit, l.windowMs))
      return NextResponse.json({ ok: false, message: "短時間に操作が多すぎます。しばらく待ってからお試しください" }, { status: 429 });
  }
  if (!(await verifyTurnstile(token, clientIp(req))))
    return NextResponse.json({ ok: false, message: "確認に失敗しました。ページを再読み込みしてお試しください", code: "TURNSTILE" }, { status: 400 });
  return null;
}

const MIN = 60 * 1000;
export const LIMITS = {
  emailLinkPerEmail: { limit: 3, windowMs: 10 * MIN },
  emailLinkPerIp:    { limit: 10, windowMs: 10 * MIN },
  registerPerIp:     { limit: 5, windowMs: 60 * MIN },
  loginPerIp:        { limit: 20, windowMs: 10 * MIN },
  loginPerEmail:     { limit: 10, windowMs: 10 * MIN },
};
