export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  const tokenHash = crypto.createHash("sha256").update(params.token).digest("hex");

  const record = await prisma.ownershipTransferToken.findUnique({ where: { tokenHash } });

  if (!record)
    return NextResponse.json({ ok: false, message: "リンクが無効です" }, { status: 404 });
  if (record.acceptedAt)
    return NextResponse.json({ ok: false, message: "この移譲依頼はすでに完了しています" }, { status: 410 });
  if (record.expiresAt < new Date())
    return NextResponse.json({ ok: false, message: "このリンクの有効期限が切れています" }, { status: 410 });

  return NextResponse.json({
    ok: true,
    transfer: {
      resourceType: record.resourceType,
      resourceId:   record.resourceId,
      resourceName: record.resourceName,
      fromUserName: record.fromUserName,
      toEmail:      record.toEmail,
      expiresAt:    record.expiresAt.toISOString(),
    },
  });
}
