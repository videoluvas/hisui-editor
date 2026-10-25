import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generateSessionToken, hashSessionToken, getSessionExpiresAt } from "@/lib/session.utils";
import { SIGNUP_COOKIE, UTM_COOKIE } from "@/lib/analytics";

// 最初に来たときの utm（ブラウザが cookie に残したもの）を読み、登録したことを GA に送る印を付ける
function signupTracking(method: string) {
  const jar = cookies();
  let utm: Record<string, string> | null = null;
  try {
    const raw = jar.get(UTM_COOKIE)?.value;
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") utm = Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === "string").slice(0, 10)) as Record<string, string>;
  } catch {}
  try { jar.set(SIGNUP_COOKIE, method, { path: "/", maxAge: 600, sameSite: "lax" }); } catch {}
  return utm;
}

// 新規ユーザーを作り、最初のワークスペースを用意する（パスワード登録・Google・Microsoft・メールリンクで共通）
// 生成クレジットは 0 から（ナレーションの無料回数は別枠）。最初のワークスペースはパワーポイント用（サンプルなし）
export async function createUserWithWorkspace(email: string, name?: string | null, iconUrl?: string | null, method = "email") {
  const signupUtm = signupTracking(method);
  const user = await prisma.user.create({ data: { email, name: name || null, iconUrl: iconUrl || null, credits: 0, ...(signupUtm ? { signupUtm } : {}) } });
  await prisma.workspace.create({
    data: { userId: user.id, name: "マイワークスペース", toolType: "pptx" },
  });
  return user;
}

export async function findOrCreateUserByEmail(email: string, name?: string | null, iconUrl?: string | null, method = "email_link") {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { user: existing, created: false };
  return { user: await createUserWithWorkspace(email, name, iconUrl, method), created: true };
}

export async function attachSession<T extends NextResponse>(response: T, userId: string): Promise<T> {
  const sessionToken = generateSessionToken();
  const expiresAt = getSessionExpiresAt(30);
  await prisma.session.create({
    data: { userId, sessionTokenHash: hashSessionToken(sessionToken), expiresAt, lastAccessedAt: new Date() },
  });
  response.cookies.set("session_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return response;
}
