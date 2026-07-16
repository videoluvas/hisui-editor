export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const user = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: { credits: true },
  });
  if (!user) return NextResponse.json({ ok: false }, { status: 404 });

  return NextResponse.json({ ok: true, credits: user.credits });
}
