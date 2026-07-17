import { NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({}, { status: 401 });

  const rows = await prisma.modelConfig.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.modelId, r.availability]));
  return NextResponse.json(map);
}
