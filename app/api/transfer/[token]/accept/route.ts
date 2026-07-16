export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { targetWorkspaceId?: string };
  const tokenHash = crypto.createHash("sha256").update(params.token).digest("hex");

  const record = await prisma.ownershipTransferToken.findUnique({ where: { tokenHash } });
  if (!record)
    return NextResponse.json({ ok: false, message: "リンクが無効です" }, { status: 404 });
  if (record.acceptedAt)
    return NextResponse.json({ ok: false, message: "この移譲依頼はすでに完了しています" }, { status: 410 });
  if (record.expiresAt < new Date())
    return NextResponse.json({ ok: false, message: "このリンクの有効期限が切れています" }, { status: 410 });

  const userEmail = (session.user.email ?? "").toLowerCase();
  if (userEmail !== record.toEmail.toLowerCase())
    return NextResponse.json({ ok: false, message: `このリンクは ${record.toEmail} 宛てです。正しいアカウントでログインしてください。` }, { status: 403 });

  const newUserId = session.userId;
  const { resourceType, resourceId } = record;

  await prisma.$transaction(async (tx) => {
    if (resourceType === "workspace") {
      await tx.workspace.update({ where: { id: resourceId }, data: { userId: newUserId } });
      await tx.project.updateMany({ where: { workspaceId: resourceId }, data: { userId: newUserId } });
      await tx.storyboardMain.updateMany({ where: { workspaceId: resourceId }, data: { userId: newUserId } });
      await tx.file.updateMany({ where: { workspaceId: resourceId }, data: { userId: newUserId } });

    } else if (resourceType === "storyboard") {
      const targetWsId = body.targetWorkspaceId ?? null;
      if (targetWsId) {
        const ws = await tx.workspace.findFirst({ where: { id: targetWsId, userId: newUserId } });
        if (!ws) throw new Error("WORKSPACE_NOT_FOUND");
      }
      await tx.storyboardMain.update({
        where: { id: resourceId },
        data: { userId: newUserId, workspaceId: targetWsId },
      });

    } else if (resourceType === "project") {
      const targetWsId = body.targetWorkspaceId ?? null;
      if (targetWsId) {
        const ws = await tx.workspace.findFirst({ where: { id: targetWsId, userId: newUserId } });
        if (!ws) throw new Error("WORKSPACE_NOT_FOUND");
      }
      await tx.project.update({
        where: { id: resourceId },
        data: { userId: newUserId, workspaceId: targetWsId },
      });
      await tx.file.updateMany({ where: { projectId: resourceId }, data: { userId: newUserId } });
    }

    await tx.ownershipTransferToken.update({
      where: { tokenHash },
      data: { acceptedAt: new Date() },
    });
  });

  return NextResponse.json({ ok: true });
}
