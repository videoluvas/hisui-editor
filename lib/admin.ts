import { prisma } from "@/lib/prisma";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAIL ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return isAdminEmail(user?.email);
}
