import { turso } from "@/integrations/turso/client.server";
/** Quotes can only refer to a message the sender can read in this exact conversation. */
export async function readPeerReply(actor: string, target: string, messageId: string) {
  const original = (
    await turso.execute({
      sql: `SELECT m.id,m.content,p.username FROM direct_messages m JOIN profiles p ON p.id=m.sender_id
    WHERE m.id=? AND m.conversation_id=? AND EXISTS(SELECT 1 FROM direct_conversations c WHERE c.id=m.conversation_id AND (c.user1_id=? OR c.user2_id=?))
    UNION ALL SELECT m.id,m.content,p.username FROM group_messages m JOIN profiles p ON p.id=m.user_id
    WHERE m.id=? AND m.group_id=? AND EXISTS(SELECT 1 FROM study_group_members s WHERE s.group_id=m.group_id AND s.user_id=?) LIMIT 1`,
      args: [messageId, target, actor, actor, messageId, target, actor],
    })
  ).rows[0];
  if (!original) throw new Error("The message you are replying to is unavailable.");
  let content = String(original["content"]);
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed.text === "string") content = parsed.text;
  } catch {
    /* Plain message. */
  }
  return {
    id: messageId,
    sender: original["username"] ? `@${original["username"]}` : "Student",
    preview: content.slice(0, 180),
  };
}
