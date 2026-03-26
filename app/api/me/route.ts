import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionTokenFromCookie,
  hashSessionToken,
} from "@/lib/auth.backend";

export async function GET() {
  try {
    const sessionToken = await getSessionTokenFromCookie();

    if (!sessionToken) {
      return NextResponse.json(
        {
          ok: false,
          message: "未ログインです",
        },
        { status: 401 }
      );
    }

    const sessionTokenHash = hashSessionToken(sessionToken);

    const session = await prisma.session.findUnique({
      where: {
        sessionTokenHash,
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        {
          ok: false,
          message: "セッションが見つかりません",
        },
        { status: 401 }
      );
    }

    if (session.expiresAt < new Date()) {
      return NextResponse.json(
        {
          ok: false,
          message: "セッションの有効期限が切れています",
        },
        { status: 401 }
      );
    }

    await prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        lastAccessedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: session.user.id,
        bubbleUserId: session.user.bubbleUserId,
        name: session.user.name,
        plan: session.user.plan,
        iconUrl: session.user.iconUrl,
      },
    });
  } catch (error) {
    console.error("GET /api/me error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "サーバーエラーが発生しました",
      },
      { status: 500 }
    );
  }
}