export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";

async function isAdmin(userId: string): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (adminEmails.length === 0) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return !!user?.email && adminEmails.includes(user.email.toLowerCase());
}

export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await isAdmin(session.userId))) return NextResponse.json({ ok: false }, { status: 403 });

  const [storyboards, projects] = await Promise.all([
    prisma.storyboardMain.findMany({
      where: { userId: session.userId },
      select: {
        id: true, title: true, isDefaultSample: true, createdAt: true,
        _count: { select: { scenes: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { userId: session.userId },
      select: {
        id: true, title: true, isDefaultSample: true, createdAt: true,
        thumbnailUrl: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ ok: true, storyboards, projects });
}

export async function PATCH(req: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await isAdmin(session.userId))) return NextResponse.json({ ok: false }, { status: 403 });

  const { type, id, isDefaultSample } = await req.json();

  if (type === "storyboard") {
    const sb = await prisma.storyboardMain.findUnique({ where: { id }, select: { userId: true } });
    if (!sb || sb.userId !== session.userId) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
    await prisma.storyboardMain.update({ where: { id }, data: { isDefaultSample } });
  } else if (type === "project") {
    const pj = await prisma.project.findUnique({ where: { id }, select: { userId: true } });
    if (!pj || pj.userId !== session.userId) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
    await prisma.project.update({ where: { id }, data: { isDefaultSample } });
  } else {
    return NextResponse.json({ ok: false, message: "Invalid type" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
