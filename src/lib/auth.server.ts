import { verifyToken } from "@clerk/backend";
import { getRequestHeader } from "@tanstack/react-start/server";
import { CLERK_SECRET_KEY } from "@/integrations/clerk";
import { isUserAdmin } from "@/integrations/turso/client.server";

export async function requireCurrentUserId(): Promise<string> {
  const token = getRequestHeader("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !CLERK_SECRET_KEY) throw new Error("Unauthorized");
  try {
    const claims = await verifyToken(token, { secretKey: CLERK_SECRET_KEY });
    if (!claims.sub) throw new Error("Unauthorized");
    return claims.sub;
  } catch {
    throw new Error("Unauthorized");
  }
}

export async function getCurrentUserIdOrNull(): Promise<string | null> {
  try {
    return await requireCurrentUserId();
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<string> {
  const userId = await requireCurrentUserId();
  if (!(await isUserAdmin(userId))) throw new Error("Forbidden");
  return userId;
}

export async function requireSelfOrAdmin(targetUserId: string): Promise<string> {
  const userId = await requireCurrentUserId();
  if (userId !== targetUserId && !(await isUserAdmin(userId))) throw new Error("Forbidden");
  return userId;
}
