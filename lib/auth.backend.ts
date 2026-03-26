import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyEditorAuth } from "@/lib/auth.shared";

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getSessionExpiresAt(days = 30): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  return expires;
}

export async function createEditorSession(input: {
  userId: string;
  days?: number;
}) {
  const sessionToken = generateSessionToken();
  const sessionTokenHash = hashSessionToken(sessionToken);
  const expiresAt = getSessionExpiresAt(input.days ?? 30);

  const session = await prisma.session.create({
    data: {
      userId: input.userId,
      sessionTokenHash,
      expiresAt,
      lastAccessedAt: new Date(),
    },
  });

  return {
    session,
    sessionToken,
    expiresAt,
  };
}

export async function setEditorSessionCookie(input: {
  sessionToken: string;
  expiresAt: Date;
}) {
  const cookieStore = await cookies();

  cookieStore.set("session_token", input.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: input.expiresAt,
  });
}

export async function clearEditorSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set("session_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function getSessionTokenFromCookie() {
  const cookieStore = await cookies();
  return cookieStore.get("session_token")?.value ?? null;
}

export async function getEditorSessionFromCookie() {
  const sessionToken = await getSessionTokenFromCookie();
  if (!sessionToken) return null;

  const sessionTokenHash = hashSessionToken(sessionToken);

  const session = await prisma.session.findUnique({
    where: {
      sessionTokenHash,
    },
    include: {
      user: true,
    },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    return null;
  }

  return session;
}

export async function touchEditorSession(sessionId: string) {
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      lastAccessedAt: new Date(),
    },
  });
}

export async function deleteEditorSessionByToken(sessionToken: string) {
  const sessionTokenHash = hashSessionToken(sessionToken);

  await prisma.session.deleteMany({
    where: {
      sessionTokenHash,
    },
  });
}

export async function verifyBubbleAuthAndUpsertUser(input: {
  authCode: string;
  bubbleUserId: string;
}) {
  const bubbleUser = await verifyEditorAuth(input.authCode, input.bubbleUserId);

  if (!bubbleUser.ok || !bubbleUser.user_id) {
    return {
      ok: false as const,
      message: bubbleUser.message || "Bubble認証に失敗しました。",
      bubbleUser: null,
      user: null,
    };
  }

  const user = await prisma.user.upsert({
    where: {
      bubbleUserId: bubbleUser.user_id,
    },
    update: {
      name: bubbleUser.name ?? null,
      plan: bubbleUser.plan ?? null,
      iconUrl: bubbleUser.P_image ?? null,
    },
    create: {
      bubbleUserId: bubbleUser.user_id,
      name: bubbleUser.name ?? null,
      plan: bubbleUser.plan ?? null,
      iconUrl: bubbleUser.P_image ?? null,
    },
  });

  return {
    ok: true as const,
    message: null,
    bubbleUser,
    user,
  };
}