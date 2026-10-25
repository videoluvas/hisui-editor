import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/log.error";

// Shotstack の書き出しURLは完了から24時間で消える
export const OUTPUT_URL_TTL_MS = 24 * 60 * 60 * 1000;

export type RenderStatus = { status: string; url: string | null; error: string | null };

function shotstackEnv(sandbox: boolean) {
  return sandbox
    ? { apiKey: process.env.SHOTSTACK_API_KEY!, apiUrl: process.env.SHOTSTACK_API_URL! }
    : { apiKey: process.env.SHOTSTACK_PROD_API_KEY ?? process.env.SHOTSTACK_API_KEY!, apiUrl: process.env.SHOTSTACK_PROD_API_URL ?? process.env.SHOTSTACK_API_URL! };
}

// 書き出しサーバーに状態を聞き、完了・失敗したら logs_output に記録する
export async function fetchRenderStatus(userId: string, renderId: string, sandbox: boolean): Promise<RenderStatus> {
  const { apiKey, apiUrl } = shotstackEnv(sandbox);
  const res = await fetch(`${apiUrl}/render/${renderId}`, { headers: { "x-api-key": apiKey } });
  const data = await res.json();
  const { status, url, error } = data.response;
  if (status === "done" || status === "failed") {
    await prisma.logOutput.updateMany({
      where: { renderId, userId, status: { notIn: ["done", "failed"] } },
      data: { status, outputUrl: url ?? null, completedAt: new Date() },
    }).catch((e) => console.error("logs_output update failed:", e));
  }
  // 失敗の理由を記録しておき、問い合わせの受付番号（renderId）から追えるようにする
  if (status === "failed") await logError("export-render", error ?? "render failed", { userId, detail: { renderId, sandbox } });
  return { status, url: url ?? null, error: error ?? null };
}

export function outputExpiresAt(log: { completedAt: Date | null; createdAt: Date }) {
  return new Date((log.completedAt ?? log.createdAt).getTime() + OUTPUT_URL_TTL_MS);
}
