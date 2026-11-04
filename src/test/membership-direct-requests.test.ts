import { DatabaseSync } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({ execute: vi.fn(), batch: vi.fn() }));
vi.mock("@/integrations/turso/client.server", () => ({
  turso: storage,
  isUserAdmin: async (id: string) => id === "admin",
}));

import {
  acceptDirectRequest, directRequestState, getDirectMessages, getDirectUnreadTotal,
  markDirectMessagesRead, sendDirectMessage,
} from "@/integrations/turso/community.server";

describe("direct message requests", () => {
  it("enforces one introduction, authenticates acceptance, and transitions receipts", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec(`
      CREATE TABLE profiles(id TEXT PRIMARY KEY, username TEXT, full_name TEXT, avatar_url TEXT);
      CREATE TABLE materials(id TEXT PRIMARY KEY, title TEXT, course TEXT);
      CREATE TABLE user_roles(user_id TEXT, role TEXT);
      CREATE TABLE direct_conversations(id TEXT PRIMARY KEY,user1_id TEXT,user2_id TEXT,last_message_text TEXT,last_message_at TEXT);
      CREATE TABLE direct_messages(id TEXT PRIMARY KEY,conversation_id TEXT,sender_id TEXT,content TEXT,material_id TEXT,created_at TEXT,is_read INTEGER);
      INSERT INTO profiles VALUES ('a','ann','Private name',NULL),('b','ben','Another name',NULL),('admin','staff','Private administrator',NULL);
      INSERT INTO direct_conversations(id,user1_id,user2_id) VALUES ('chat','a','b'),('staff-chat','admin','b');
      INSERT INTO user_roles VALUES ('admin','admin');
    `);
    type Statement = string | { sql: string; args?: (string | number | null)[] };
    function run(statement: Statement) {
      const { sql, args = [] } = typeof statement === "string" ? { sql: statement } : statement;
      const query = db.prepare(sql);
      if (sql.trimStart().startsWith("SELECT")) return { rows: query.all(...args), rowsAffected: 0 };
      return { rows: [], rowsAffected: Number(query.run(...args).changes) };
    }
    storage.execute.mockImplementation(async (statement: Statement) => run(statement));
    storage.batch.mockImplementation(async (statements: Statement[]) => statements.map(run));
    const send = (senderId: string, conversationId = "chat") => sendDirectMessage({ conversationId, senderId, content: "Hello" });

    try {
      const first = await Promise.allSettled([send("a"), send("a")]);
      expect(first.map(result => result.status).sort()).toEqual(["fulfilled", "rejected"]);
      await expect(acceptDirectRequest("chat", "a")).rejects.toThrow("Only the recipient");
      await expect(acceptDirectRequest("chat", "stranger")).rejects.toThrow("not found");
      await expect(directRequestState("chat", "b")).resolves.toBe("incoming");
      expect((await getDirectMessages("chat", 80, "a"))[0]).toMatchObject({ sender_name: "@ann", receipt: "sent" });
      await expect(getDirectUnreadTotal("b")).resolves.toBe(1);
      expect((await getDirectMessages("chat", 80, "a"))[0]?.receipt).toBe("delivered");
      await markDirectMessagesRead("chat", "b");
      expect((await getDirectMessages("chat", 80, "a"))[0]?.receipt).toBe("read");
      await expect(getDirectUnreadTotal("b")).resolves.toBe(0);
      await acceptDirectRequest("chat", "b");
      await expect(send("a")).resolves.toMatchObject({ receipt: "sent" });
      await expect(send("admin", "staff-chat")).resolves.toMatchObject({ sender_verified: true });
      await expect(directRequestState("staff-chat", "b")).resolves.toBe("accepted");
    } finally { db.close(); }
  });
});
