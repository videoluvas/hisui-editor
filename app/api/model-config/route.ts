import { NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";
import { isFreePlan } from "@/lib/credits";

export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({}, { status: 401 });

  const [rows, user] = await Promise.all([
    prisma.modelConfig.findMany(),
    prisma.user.findUnique({ where: { id: session.userId }, select: { plan: true } }),
  ]);
  // 無料プランは AI 生成をすべて有料扱いにする（画面でロック表示）
  const free = isFreePlan(user?.plan);
  const map = Object.fromEntries(rows.map((r) => [r.modelId, free && r.availability === "free" ? "paid" : r.availability]));
  return NextResponse.json(map);
}
