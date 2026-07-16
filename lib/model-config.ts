import { prisma } from "@/lib/prisma";

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
): Promise<{ ok: boolean; message?: string; status?: number }> {
  const map = await getAvailabilityMap();
  const avail = map[modelId] ?? "paid";
  if (avail === "suspended") {
    return { ok: false, message: "このモデルは現在利用停止中です", status: 503 };
  }
  if (avail === "paid" && (!userPlan || userPlan === "Free")) {
    return { ok: false, message: "このモデルはBusiness/Proプランでご利用いただけます", status: 403 };
  }
  return { ok: true };
}
