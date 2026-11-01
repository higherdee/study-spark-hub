import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ paid: false }));
vi.mock("@/integrations/turso/client.server", async () => {
  const { createClient } = await import("@libsql/client");
  return { turso: createClient({ url: "file::memory:" }), recordMaterialDownload: vi.fn() };
});
vi.mock("@/lib/billing/service.server", () => ({ membershipStatus: async () => ({ sylla_plus: state.paid }) }));
import { turso } from "@/integrations/turso/client.server";
import { generationCount } from "@/lib/membership/policy";
import { beginAiRequest, completeMaterialGate, enforceChatRetention, ensureMembershipTables, membershipAccess, requireLibraryAiAccess, settleAiRequest, startMaterialGate, validateMaterialGrant } from "@/lib/membership/policy.server";

const now = Date.parse("2030-06-01T12:00:00Z");
beforeAll(async () => {
  await ensureMembershipTables();
  await turso.executeMultiple("CREATE TABLE materials(id TEXT PRIMARY KEY,user_id TEXT,status TEXT); CREATE TABLE chat_threads(id TEXT PRIMARY KEY,user_id TEXT,updated_at TEXT); CREATE TABLE chat_messages(id TEXT PRIMARY KEY,thread_id TEXT,user_id TEXT,created_at TEXT);");
});
beforeEach(async () => {
  state.paid = false;
  await turso.executeMultiple("DELETE FROM membership_ai_daily; DELETE FROM membership_ai_rate; DELETE FROM membership_ai_requests; DELETE FROM membership_material_grants; DELETE FROM membership_downloads; DELETE FROM membership_retention; DELETE FROM materials; DELETE FROM chat_messages; DELETE FROM chat_threads;");
  for (let n = 0; n < 8; n++) await turso.execute({ sql: "INSERT INTO materials(id,user_id,status) VALUES(?,?,'verified')", args: [`m${n}`, "uploader"] });
});
describe("Notebook free-tier enforcement", () => {
  it("reserves the daily AI budget and settles actual response usage only once", async () => {
    const first = await beginAiRequest("owner", now);
    expect(first.limit).toBe(1000);
    await settleAiRequest(first, 250);
    await settleAiRequest(first, 0);
    const second = await beginAiRequest("owner", now + 61_000);
    expect(second.limit).toBe(750);
    await settleAiRequest(second, 750);
    await expect(beginAiRequest("owner", now + 122_000)).rejects.toThrow("1,000");
  });
  it("keeps the one-minute limit across midnight while resetting daily tokens", async () => {
    const beforeMidnight = Date.parse("2030-06-01T23:59:59Z");
    await settleAiRequest(await beginAiRequest("owner", beforeMidnight), 1000);
    await expect(beginAiRequest("owner", beforeMidnight + 2000)).rejects.toThrow("per minute");
    expect((await beginAiRequest("owner", beforeMidnight + 61_000)).limit).toBe(1000);
  });
  it("does not refund unverified usage or allow free library AI imports", async () => {
    await settleAiRequest(await beginAiRequest("owner", now));
    await expect(beginAiRequest("owner", now + 61_000)).rejects.toThrow("1,000");
    await expect(requireLibraryAiAccess("owner")).rejects.toThrow("SyllaPlus");
    expect(() => generationCount(6, false)).toThrow("five");
    expect(generationCount(5, false)).toBe(5);
    expect(generationCount(50, true)).toBe(50);
  });
  it("does not apply free restrictions to paid access or payment grace", async () => {
    state.paid = true;
    expect((await beginAiRequest("owner", now)).paid).toBe(true);
    expect((await beginAiRequest("owner", now)).limit).toBe(8000);
    await expect(requireLibraryAiAccess("owner")).resolves.toBeUndefined();
    expect((await startMaterialGate("owner", "m0", "download", now)).seconds).toBe(0);
  });
  it("verifies promotion time, ownership, material and intent on the server", async () => {
    const gate = await startMaterialGate("owner", "m0", "download", now);
    expect(gate.seconds).toBe(30);
    await expect(completeMaterialGate("owner", gate.id, now + 29_000)).rejects.toThrow("finish the promotion");
    await expect(completeMaterialGate("intruder", gate.id, now + 31_000)).rejects.toThrow("expired");
    await completeMaterialGate("owner", gate.id, now + 31_000);
    expect(await validateMaterialGrant("m0", "download", gate.id, now + 32_000)).toBe(true);
    expect(await validateMaterialGrant("m1", "download", gate.id, now + 32_000)).toBe(false);
    expect(await validateMaterialGrant("m0", "preview", gate.id, now + 32_000)).toBe(false);
    expect(await validateMaterialGrant("m0", "download", gate.id, now + 16 * 60_000)).toBe(false);
  });
  it("allows six materials a month, makes retries safe, and rejects the seventh", async () => {
    for (let n = 0; n < 6; n++) {
      const gate = await startMaterialGate("owner", `m${n}`, "download", now);
      await completeMaterialGate("owner", gate.id, now + 31_000);
      await completeMaterialGate("owner", gate.id, now + 32_000);
    }
    const seventh = await startMaterialGate("owner", "m6", "download", now);
    await expect(completeMaterialGate("owner", seventh.id, now + 31_000)).rejects.toThrow("six materials");
    expect(Number((await turso.execute("SELECT COUNT(*) AS n FROM membership_downloads")).rows[0]!["n"])).toBe(6);
  });
  it("gives existing chats notice, then deletes only this free user's old messages", async () => {
    await turso.executeMultiple("INSERT INTO chat_threads VALUES('thread','owner',datetime('now')); INSERT INTO chat_messages VALUES('old','thread','owner',datetime('now','-10 days')); INSERT INTO chat_messages VALUES('new','thread','owner',datetime('now','-2 days')); INSERT INTO chat_messages VALUES('other','other-thread','other',datetime('now','-10 days'));");
    await enforceChatRetention("owner");
    expect((await turso.execute("SELECT id FROM chat_messages WHERE id='old'")).rows).toHaveLength(1);
    await turso.execute("UPDATE membership_retention SET free_since=datetime('now','-8 days') WHERE user_id='owner'");
    await enforceChatRetention("owner");
    expect((await turso.execute("SELECT id FROM chat_messages ORDER BY id")).rows.map((row) => row["id"])).toEqual(["new", "other"]);
  });
  it("preserves paid histories and starts a fresh transition after paid access ends", async () => {
    state.paid = true;
    await membershipAccess("owner");
    state.paid = false;
    await membershipAccess("owner");
    const row = (await turso.execute("SELECT paid,free_since FROM membership_retention WHERE user_id='owner'")).rows[0]!;
    expect(row["paid"]).toBe(0);
    expect(row["free_since"]).toBeTruthy();
    expect((await enforceChatRetention("owner")).startsAt).toBeTruthy();
  });
});
