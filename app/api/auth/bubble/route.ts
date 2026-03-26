export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyEditorAuth } from "@/lib/auth.shared";
import {
  generateSessionToken,
  hashSessionToken,
  getSessionExpiresAt,
} from "@/lib/auth.backend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const authCode = String(body.auth_code ?? "").trim();
    const bubbleUserId = String(body.user_id ?? "").trim();

    if (!authCode || !bubbleUserId) {
      return NextResponse.json(
        {
          ok: false,
          message: "auth_code または user_id が不足しています。",
        },
        { status: 400 }
      );
    }

    const bubbleUser = await verifyEditorAuth(authCode, bubbleUserId);

    if (!bubbleUser.ok || !bubbleUser.user_id) {
      return NextResponse.json(
        {
          ok: false,
          message: bubbleUser.message || "Bubble認証に失敗しました。",
        },
        { status: 401 }
      );
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

    const sessionToken = generateSessionToken();
    const sessionTokenHash = hashSessionToken(sessionToken);
    const expiresAt = getSessionExpiresAt(30);

    await prisma.session.create({
      data: {
        userId: user.id,
        sessionTokenHash,
        expiresAt,
        lastAccessedAt: new Date(),
      },
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        bubbleUserId: user.bubbleUserId,
        name: user.name,
        plan: user.plan,
        iconUrl: user.iconUrl,
      },
    });

    response.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    console.error("Bubble auth route error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "サーバーエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}