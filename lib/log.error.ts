import { prisma } from "@/lib/prisma";

type Level = "error" | "warn" | "info";

export async function logError(
  source: string,
  message: string,
  opts?: { userId?: string | null; detail?: Record<string, unknown>; level?: Level }
) {
  try {
    await prisma.logError.create({
      data: {
        source,
        message,
        level: opts?.level ?? "error",
        userId: opts?.userId ?? null,
        detail: opts?.detail ? (opts.detail as object) : undefined,
      },
    });
  } catch {
    // ロギング失敗でアプリをクラッシュさせない
  }
}
