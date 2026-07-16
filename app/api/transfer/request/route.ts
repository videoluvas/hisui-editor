export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { sendOwnerTransferEmail } from "@/lib/email";

type ResourceType = "workspace" | "storyboard" | "project";

async function getResourceName(type: ResourceType, id: string, userId: string): Promise<string | null> {
  if (type === "workspace") {
    const ws = await prisma.workspace.findFirst({ where: { id, userId }, select: { name: true } });
    return ws?.name ?? null;
  }
  if (type === "storyboard") {
    const sb = await prisma.storyboardMain.findFirst({ where: { id, userId }, select: { title: true } });
    return sb?.title ?? "無題のコンテ";
  }
  if (type === "project") {
    const pj = await prisma.project.findFirst({ where: { id, userId }, select: { title: true } });
    return pj?.title ?? null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    resourceType?: string;
    resourceId?: string;
    toEmail?: string;
  };

  const resourceType = body.resourceType as ResourceType;
  const resourceId = String(body.resourceId ?? "").trim();
  const toEmail = String(body.toEmail ?? "").trim().toLowerCase();

  if (!["workspace", "storyboard", "project"].includes(resourceType))
    return NextResponse.json({ ok: false, message: "resourceType が不正です" }, { status: 400 });
  if (!resourceId)
    return NextResponse.json({ ok: false, message: "resourceId が必要です" }, { status: 400 });
  if (!toEmail || !toEmail.includes("@"))
    return NextResponse.json({ ok: false, message: "メールアドレスが不正です" }, { status: 400 });
  if (toEmail === (session.user.email ?? "").toLowerCase())
    return NextResponse.json({ ok: false, message: "自分自身には移譲できません" }, { status: 400 });

  const resourceName = await getResourceName(resourceType, resourceId, session.userId);
  if (!resourceName)
    return NextResponse.json({ ok: false, message: "リソースが見つかりません（権限がないか存在しません）" }, { status: 404 });

  // 既存の未承認トークンを無効化（同一リソースへの重複防止）
  await prisma.ownershipTransferToken.deleteMany({
    where: { resourceId, resourceType, acceptedAt: null },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

  await prisma.ownershipTransferToken.create({
    data: {
      resourceType,
      resourceId,
      resourceName,
      fromUserId: session.userId,
      fromUserName: session.user.name,
      toEmail,
      tokenHash,
      expiresAt,
    },
  });

  await sendOwnerTransferEmail({
    toEmail,
    fromUserName: session.user.name,
    resourceType,
    resourceName,
    token: rawToken,
  });

  return NextResponse.json({ ok: true });
}
