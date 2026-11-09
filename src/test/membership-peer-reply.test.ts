import { beforeAll, expect, it, vi } from "vitest";
vi.mock("@/integrations/turso/client.server", async () => {
  const { createClient } = await import("@libsql/client");
  return { turso: createClient({ url: "file::memory:" }) };
});
import { turso } from "@/integrations/turso/client.server";
import { readPeerReply } from "@/lib/peer-reply.server";
beforeAll(async () => {
  await turso.executeMultiple(
    "CREATE TABLE profiles(id TEXT,username TEXT);CREATE TABLE direct_messages(id TEXT,conversation_id TEXT,sender_id TEXT,content TEXT);CREATE TABLE direct_conversations(id TEXT,user1_id TEXT,user2_id TEXT);CREATE TABLE group_messages(id TEXT,group_id TEXT,user_id TEXT,content TEXT);CREATE TABLE study_group_members(group_id TEXT,user_id TEXT);INSERT INTO profiles VALUES('a','public_handle');INSERT INTO direct_conversations VALUES('dm','a','b');INSERT INTO direct_messages VALUES('one','dm','a','A useful message');INSERT INTO study_group_members VALUES('group','b');",
  );
  await turso.execute({
    sql: "INSERT INTO group_messages VALUES(?,?,?,?)",
    args: [
      "two",
      "group",
      "a",
      JSON.stringify({ text: "Photo caption", syllabossAttachment: { id: "private" } }),
    ],
  });
});
it("reads direct and group quotes using public usernames and plain captions", async () => {
  expect(await readPeerReply("b", "dm", "one")).toEqual({
    id: "one",
    sender: "@public_handle",
    preview: "A useful message",
  });
  expect(await readPeerReply("b", "group", "two")).toEqual({
    id: "two",
    sender: "@public_handle",
    preview: "Photo caption",
  });
});
it("rejects quotes from another conversation or a non-member", async () => {
  await expect(readPeerReply("outsider", "dm", "one")).rejects.toThrow("unavailable");
  await expect(readPeerReply("b", "another-dm", "one")).rejects.toThrow("unavailable");
  await expect(readPeerReply("outsider", "group", "two")).rejects.toThrow("unavailable");
});
