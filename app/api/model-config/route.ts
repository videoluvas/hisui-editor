import { NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";
import { hasAiAccess } from "@/lib/credits";

export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({}, { status: 401 });

  const [rows, user] = await Promise.all([
    prisma.modelConfig.findMany(),
    prisma.user.findUnique({ where: { id: session.userId }, select: { plan: true } }),
  ]);
  // 法人プラン以外は AI 生成をすべて有料扱いにする（画面でロック表示）
  const free = !hasAiAccess(user?.plan);
  const map = Object.fromEntries(rows.map((r) => [r.modelId, free && r.availability === "free" ? "paid" : r.availability]));
  return NextResponse.json(map);
}
