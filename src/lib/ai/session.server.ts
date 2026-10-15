import { verifyToken } from "@clerk/backend";
import { getRequest } from "@tanstack/react-start/server";

export async function requireAiSession(): Promise<string> {
  const secretKey = process.env["CLERK_SECRET_KEY"];
  if (!secretKey) throw new Error("Study services are not configured. Please contact support.");
  const token = getRequest()
    .headers.get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Please sign in to use Boss AI.");
  try {
    const session = await verifyToken(token, { secretKey });
    return session.sub;
  } catch {
    throw new Error("Your session has expired. Please sign in again.");
  }
}

/** Protect thread reads/writes and prevent caller-supplied user IDs from crossing accounts. */
export async function guardStudyRequest(data: unknown): Promise<string> {
  const userId = await requireAiSession();
  if (!data || typeof data !== "object") return userId;
  const input = data as Record<string, unknown>;
  if (typeof input["userId"] === "string" && input["userId"] !== userId) {
    throw new Error("You can only access your own study workspace.");
  }
  if (typeof input["threadId"] === "string" && input["threadId"]) {
    const { turso } = await import("@/integrations/turso/client");
    const result = await turso.execute({
      sql: "SELECT id FROM chat_threads WHERE id = ? AND user_id = ? LIMIT 1",
      args: [input["threadId"], userId],
    });
    if (!result.rows.length) throw new Error("Conversation not found in your workspace.");
  }
  return userId;
}
