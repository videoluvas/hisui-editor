import { prisma } from "@/lib/prisma";

export type GenLogType = "img" | "script" | "video" | "audio" | "bgm";

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
    } else if (type === "video") {
      await prisma.$executeRaw`UPDATE users SET credit_video = credit_video - 1 WHERE id = ${userId}::uuid`;
      const [row] = await prisma.$queryRaw<[{ credit_video: number }]>`SELECT credit_video FROM users WHERE id = ${userId}::uuid`;
      await prisma.logCredit.create({
        data: { userId, creditType: "video", delta: -1, balanceAfter: row?.credit_video ?? 0, reason: "generation_used" },
      });
    } else if (type === "audio") {
      await prisma.$executeRaw`UPDATE users SET credit_audio = credit_audio - 1 WHERE id = ${userId}::uuid`;
      const [row] = await prisma.$queryRaw<[{ credit_audio: number }]>`SELECT credit_audio FROM users WHERE id = ${userId}::uuid`;
      await prisma.logCredit.create({
        data: { userId, creditType: "audio", delta: -1, balanceAfter: row?.credit_audio ?? 0, reason: "generation_used" },
      });
    } else if (type === "bgm") {
      await prisma.$executeRaw`UPDATE users SET credit_bgm = credit_bgm - 1 WHERE id = ${userId}::uuid`;
      const [row] = await prisma.$queryRaw<[{ credit_bgm: number }]>`SELECT credit_bgm FROM users WHERE id = ${userId}::uuid`;
      await prisma.logCredit.create({
        data: { userId, creditType: "bgm", delta: -1, balanceAfter: row?.credit_bgm ?? 0, reason: "generation_used" },
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
    } else if (type === "video") {
      await prisma.$executeRaw`UPDATE users SET credit_video = credit_video + 1 WHERE id = ${userId}::uuid`;
      const [row] = await prisma.$queryRaw<[{ credit_video: number }]>`SELECT credit_video FROM users WHERE id = ${userId}::uuid`;
      await prisma.logCredit.create({
        data: { userId, creditType: "video", delta: 1, balanceAfter: row?.credit_video ?? 0, reason: "refund_error" },
      });
    } else if (type === "audio") {
      await prisma.$executeRaw`UPDATE users SET credit_audio = credit_audio + 1 WHERE id = ${userId}::uuid`;
      const [row] = await prisma.$queryRaw<[{ credit_audio: number }]>`SELECT credit_audio FROM users WHERE id = ${userId}::uuid`;
      await prisma.logCredit.create({
        data: { userId, creditType: "audio", delta: 1, balanceAfter: row?.credit_audio ?? 0, reason: "refund_error" },
      });
    } else if (type === "bgm") {
      await prisma.$executeRaw`UPDATE users SET credit_bgm = credit_bgm + 1 WHERE id = ${userId}::uuid`;
      const [row] = await prisma.$queryRaw<[{ credit_bgm: number }]>`SELECT credit_bgm FROM users WHERE id = ${userId}::uuid`;
      await prisma.logCredit.create({
        data: { userId, creditType: "bgm", delta: 1, balanceAfter: row?.credit_bgm ?? 0, reason: "refund_error" },
      });
    }
  } catch {
    // ログ失敗は無視
  }
}
