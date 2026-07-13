export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";

export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  try {
    const presets = await (prisma as any).decoPreset.findMany({
      where: { userId: session.userId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      ok: true,
      presets: presets.map((p: any) => ({
        id: p.id,
        name: p.name,
        settings: p.settings,
        sortOrder: p.sortOrder,
      })),
    });
  } catch (e) {
    console.error("[deco-preset GET]", e);
    return NextResponse.json({ ok: false, message: `サーバーエラー: ${e}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ ok: false, message: "名前は必須です" }, { status: 400 });

    const count = await (prisma as any).decoPreset.count({ where: { userId: session.userId } });

    const preset = await (prisma as any).decoPreset.create({
      data: {
        userId: session.userId,
        name,
        settings: body.settings ?? {},
        sortOrder: count,
      },
    });

    return NextResponse.json({
      ok: true,
      preset: { id: preset.id, name: preset.name, settings: preset.settings, sortOrder: preset.sortOrder },
    });
  } catch (e) {
    console.error("[deco-preset POST]", e);
    return NextResponse.json({ ok: false, message: `サーバーエラー: ${e}` }, { status: 500 });
  }
}
