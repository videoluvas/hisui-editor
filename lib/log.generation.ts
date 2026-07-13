import { prisma } from "@/lib/prisma";

export type GenLogType = "img" | "script" | "video" | "audio";

export async function logGeneration(userId: string, type: GenLogType): Promise<void> {
  try {
    if (type === "img") {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: userId },
          data:  { creditImg: { decrement: 1 } },
          select: { creditImg: true },
        });
        await tx.logCredit.create({
          data: { userId, creditType: "img", delta: -1, balanceAfter: user.creditImg, reason: "generation_used" },
        });
      });
    } else if (type === "script") {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: userId },
          data:  { creditScript: { decrement: 1 } },
          select: { creditScript: true },
        });
        await tx.logCredit.create({
          data: { userId, creditType: "script", delta: -1, balanceAfter: user.creditScript, reason: "generation_used" },
        });
      });
    } else {
      await prisma.logCredit.create({
        data: { userId, creditType: type, delta: -1, balanceAfter: 0, reason: "generation_used" },
      });
    }
  } catch {
    // ログ失敗は無視
  }
}

export async function refundGeneration(userId: string, type: GenLogType): Promise<void> {
  try {
    if (type === "img") {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: userId },
          data:  { creditImg: { increment: 1 } },
          select: { creditImg: true },
        });
        await tx.logCredit.create({
          data: { userId, creditType: "img", delta: 1, balanceAfter: user.creditImg, reason: "refund_error" },
        });
      });
    } else if (type === "script") {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: userId },
          data:  { creditScript: { increment: 1 } },
          select: { creditScript: true },
        });
        await tx.logCredit.create({
          data: { userId, creditType: "script", delta: 1, balanceAfter: user.creditScript, reason: "refund_error" },
        });
      });
    } else {
      await prisma.logCredit.create({
        data: { userId, creditType: type, delta: 1, balanceAfter: 0, reason: "refund_error" },
      });
    }
  } catch {
    // ログ失敗は無視
  }
}
