import { beforeAll, expect, it, vi } from "vitest";
vi.mock("@/integrations/turso/client.server", async () => {
  const { createClient } = await import("@libsql/client");
  return { turso: createClient({ url: "file::memory:" }), isUserAdmin: async () => false };
});
import { turso } from "@/integrations/turso/client.server";
import { issueMembershipGift } from "@/lib/membership/gifts.server";
import { redeemPromo, promoBenefits } from "@/lib/membership/promos.server";
const now = Date.parse("2030-06-01T12:00:00Z");
beforeAll(async () => {
  await turso.executeMultiple(`CREATE TABLE profiles(id TEXT PRIMARY KEY,email TEXT,full_name TEXT,username TEXT UNIQUE,points INTEGER,suspended INTEGER DEFAULT 0);
    CREATE TABLE points_ledger(id TEXT PRIMARY KEY,user_id TEXT,amount INTEGER,reason TEXT);
    CREATE TABLE direct_conversations(id TEXT PRIMARY KEY,user1_id TEXT,user2_id TEXT,last_message_text TEXT,last_message_at TEXT);
    CREATE TABLE direct_messages(id TEXT PRIMARY KEY,conversation_id TEXT,sender_id TEXT,content TEXT,is_read INTEGER);
    INSERT INTO profiles(id,points) VALUES('buyer',10000),('poor',1),('failure',10000);`);
});
it("debits once, delivers privately, and creates a checkout-only transferable gift expiring in three months", async () => {
  const requestId = crypto.randomUUID();
  const gift = await issueMembershipGift("buyer", requestId, 30, false, now);
  expect(gift.points).toBe(3000);
  expect((await issueMembershipGift("buyer", requestId, 30, false, now)).code).toBe(gift.code);
  expect((await turso.execute("SELECT points FROM profiles WHERE id='buyer'")).rows[0]?.["points"]).toBe(7000);
  expect((await turso.execute("SELECT * FROM points_ledger")).rows).toHaveLength(1);
  const messages = (await turso.execute("SELECT * FROM direct_messages")).rows;
  expect(messages).toHaveLength(1);
  expect(messages[0]?.["content"]).toContain(gift.code);
  expect(gift.expires_at).toBe("2030-09-01T12:00:00.000Z");
  const input = { code: gift.code, requestId: crypto.randomUUID() };
  await expect(redeemPromo("friend", input, now)).rejects.toThrow("checkout");
  await redeemPromo("friend", input, now, "checkout");
  expect((await promoBenefits("friend", now)).plusUntil).toBe("2030-07-01T12:00:00.000Z");
  await expect(redeemPromo("other", { ...input, requestId: crypto.randomUUID() }, now, "checkout")).rejects.toThrow("limit");
});
it("rejects an unaffordable gift without issuing a code or debit", async () => {
  await expect(issueMembershipGift("poor", crypto.randomUUID(), 7, false, now)).rejects.toThrow("Insufficient");
  expect((await turso.execute("SELECT points FROM profiles WHERE id='poor'")).rows[0]?.["points"]).toBe(1);
});
it("rolls back the entire debit and issuance if delivery fails", async () => {
  await turso.execute("CREATE TRIGGER fail_gift_delivery BEFORE INSERT ON direct_messages BEGIN SELECT RAISE(ABORT,'delivery unavailable'); END");
  await expect(issueMembershipGift("failure", crypto.randomUUID(), 7, false, now)).rejects.toThrow();
  expect((await turso.execute("SELECT points FROM profiles WHERE id='failure'")).rows[0]?.["points"]).toBe(10000);
  expect((await turso.execute("SELECT * FROM membership_gift_issues WHERE user_id='failure'")).rows).toHaveLength(0);
});
