import { prisma } from "@/lib/prisma";
import { FREE_PLAN_CODE, FREE_PLAN_MESSAGE, hasAiAccess } from "@/lib/credits";

export type ModelAvailability = "free" | "paid" | "suspended";

let _cache: Record<string, ModelAvailability> | null = null;
let _cacheAt = 0;
const TTL = 60_000;

async function getAvailabilityMap(): Promise<Record<string, ModelAvailability>> {
  if (_cache && Date.now() - _cacheAt < TTL) return _cache;
  const rows = await prisma.modelConfig.findMany();
  _cache = Object.fromEntries(rows.map((r) => [r.modelId, r.availability as ModelAvailability]));
  _cacheAt = Date.now();
  return _cache;
}

export function invalidateModelCache(): void {
  _cache = null;
}

export async function checkModelAccess(
  modelId: string,
  userPlan: string | null,
): Promise<{ ok: boolean; code?: string; message?: string; status?: number }> {
  const map = await getAvailabilityMap();
  const avail = map[modelId] ?? "paid";
  if (avail === "suspended") {
    return { ok: false, message: "このモデルは現在利用停止中です", status: 503 };
  }
  if (!hasAiAccess(userPlan)) {
    return { ok: false, code: FREE_PLAN_CODE, message: FREE_PLAN_MESSAGE, status: 403 };
  }
  return { ok: true };
}
