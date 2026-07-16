export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  try {
    const existing = await prisma.decoPreset.findFirst({
      where: { id: params.id, userId: session.userId },
    });
    if (!existing) return NextResponse.json({ ok: false, message: "見つかりません" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim() || existing.name;
    if (body.settings !== undefined) data.settings = body.settings;

    const preset = await prisma.decoPreset.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({
      ok: true,
      preset: { id: preset.id, name: preset.name, settings: preset.settings, sortOrder: preset.sortOrder },
    });
  } catch (e) {
    console.error("[deco-preset PATCH]", e);
    return NextResponse.json({ ok: false, message: `サーバーエラー: ${e}` }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  try {
    const existing = await prisma.decoPreset.findFirst({
      where: { id: params.id, userId: session.userId },
    });
    if (!existing) return NextResponse.json({ ok: false, message: "見つかりません" }, { status: 404 });

    await prisma.decoPreset.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[deco-preset DELETE]", e);
    return NextResponse.json({ ok: false, message: `サーバーエラー: ${e}` }, { status: 500 });
  }
}
