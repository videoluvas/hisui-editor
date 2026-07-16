export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";

export async function POST(request: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const order: string[] = Array.isArray(body.order) ? body.order : [];
    if (order.length === 0) return NextResponse.json({ ok: false, message: "順序が空です" }, { status: 400 });

    await Promise.all(
      order.map((id, idx) =>
        prisma.decoPreset.updateMany({
          where: { id, userId: session.userId },
          data: { sortOrder: idx },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[deco-preset reorder]", e);
    return NextResponse.json({ ok: false, message: `サーバーエラー: ${e}` }, { status: 500 });
  }
}
