export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { logGeneration } from "@/lib/log.generation";

async function isAdmin(userId: string): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length === 0) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return !!user?.email && adminEmails.includes(user.email.toLowerCase());
}

const PLAN_DEFAULTS: Record<string, { imgMax: number; scriptMax: number }> = {
  Free: { imgMax: 15,  scriptMax: 5   },
  Pro:  { imgMax: 200, scriptMax: 100 },
};

// ── GET: ユーザー一覧 ──────────────────────────────────────────────────────────
export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await isAdmin(session.userId))) return NextResponse.json({ ok: false }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      creditImg: true,
      creditImgMax: true,
      creditScript: true,
      creditScriptMax: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, users });
}

// ── PATCH: プラン・クレジット変更 ──────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await isAdmin(session.userId))) return NextResponse.json({ ok: false }, { status: 403 });

  const body = await req.json().catch(() => ({})) as {
    userId: string;
    plan?: string;
    grantImg?: number;
    grantScript?: number;
  };

  if (!body.userId) return NextResponse.json({ ok: false, message: "userId が必要です" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id: body.userId },
    select: { id: true, plan: true, creditImg: true, creditImgMax: true, creditScript: true, creditScriptMax: true },
  });
  if (!target) return NextResponse.json({ ok: false, message: "ユーザーが見つかりません" }, { status: 404 });

  const data: Record<string, unknown> = {};

  // プラン変更
  if (body.plan !== undefined && body.plan !== target.plan) {
    const defaults = PLAN_DEFAULTS[body.plan] ?? PLAN_DEFAULTS.Free;
    data.plan          = body.plan;
    data.creditImgMax  = defaults.imgMax;
    data.creditScriptMax = defaults.scriptMax;
    // 残高をプラン上限にリセット（増加方向のみ）
    data.creditImg    = Math.max(target.creditImg,    defaults.imgMax);
    data.creditScript = Math.max(target.creditScript, defaults.scriptMax);
  }

  // クレジット付与
  if (body.grantImg && body.grantImg !== 0) {
    const cur = typeof data.creditImg    === "number" ? data.creditImg    : target.creditImg;
    const max = typeof data.creditImgMax === "number" ? data.creditImgMax : target.creditImgMax;
    data.creditImg = Math.min(cur + body.grantImg, max * 3);
  }
  if (body.grantScript && body.grantScript !== 0) {
    const cur = typeof data.creditScript    === "number" ? data.creditScript    : target.creditScript;
    const max = typeof data.creditScriptMax === "number" ? data.creditScriptMax : target.creditScriptMax;
    data.creditScript = Math.min(cur + body.grantScript, max * 3);
  }

  if (Object.keys(data).length === 0)
    return NextResponse.json({ ok: false, message: "変更内容がありません" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: body.userId },
    data: data as Parameters<typeof prisma.user.update>[0]["data"],
    select: { id: true, plan: true, creditImg: true, creditImgMax: true, creditScript: true, creditScriptMax: true },
  });

  // クレジット付与ログ
  if (body.grantImg) {
    await prisma.logCredit.create({
      data: { userId: body.userId, creditType: "img", delta: body.grantImg, balanceAfter: updated.creditImg, reason: "manual_grant" },
    }).catch(() => {});
  }
  if (body.grantScript) {
    await prisma.logCredit.create({
      data: { userId: body.userId, creditType: "script", delta: body.grantScript, balanceAfter: updated.creditScript, reason: "manual_grant" },
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, user: updated });
}
