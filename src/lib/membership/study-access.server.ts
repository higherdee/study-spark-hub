import { requireCurrentUserId } from "@/lib/auth.server";
import { getProfile, turso } from "@/integrations/turso/client.server";
import { enforceChatRetention } from "./policy.server";

export async function authorizeStudyData(data: Record<string, unknown>) {
  const userId = await requireCurrentUserId();
  if (data["userId"] && data["userId"] !== userId || (await getProfile(userId))?.suspended) throw new Error("This study account is unavailable.");
  await enforceChatRetention(userId);
  if (typeof data["threadId"] === "string") {
    const thread = await turso.execute({ sql: "SELECT id FROM chat_threads WHERE id=? AND user_id=?", args: [data["threadId"], userId] });
    if (!thread.rows.length) throw new Error("This conversation is unavailable or its free retention period has ended.");
  }
  return userId;
}
