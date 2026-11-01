import { beforeAll, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ admin: true }));
vi.mock("@/integrations/turso/client.server", async () => {
  const { createClient } = await import("@libsql/client");
  return { turso: createClient({ url: "file::memory:" }), isUserAdmin: async () => state.admin };
});
import { turso } from "@/integrations/turso/client.server";
import { ensurePromoTables, listPromos, promoBenefits, redeemPromo, savePromo } from "@/lib/membership/promos.server";
const now = Date.parse("2030-06-01T12:00:00Z");
const campaign = () => ({ code: "STUDY7", label: "Study campaign", effect: "plus_days" as const, value: 7, enabled: true, maxUses: 2, perUser: 1, startsAt: "2030-06-01T00:00:00Z", expiresAt: "2030-07-01T00:00:00Z" });
const redeem = (user: string, requestId = crypto.randomUUID()) => redeemPromo(user, { code: "study7", requestId }, now);
beforeAll(ensurePromoTables);
beforeEach(async () => { state.admin = true; await turso.executeMultiple("DELETE FROM membership_promo_claims; DELETE FROM membership_promos; DELETE FROM membership_promo_audit;"); });
it("requires server-verified admin privileges to list or change campaigns", async () => {
  state.admin = false; await expect(savePromo("student", campaign())).rejects.toThrow("Admin"); await expect(listPromos("student")).rejects.toThrow("Admin");
});
it("applies a reward exactly once on retry and enforces per-user and global caps", async () => {
  await savePromo("admin", campaign()); const requestId = crypto.randomUUID(); await redeem("a", requestId); await redeem("a", requestId);
  expect((await turso.execute("SELECT * FROM membership_promo_claims")).rows).toHaveLength(1);
  await expect(redeem("a")).rejects.toThrow("limit"); await redeem("b"); await expect(redeem("c")).rejects.toThrow("limit");
});
it("keeps claimed rewards unchanged after an administrator edits or disables a code", async () => {
  const { id } = await savePromo("admin", campaign()); await redeem("a"); await savePromo("admin", { ...campaign(), id, value: 30, enabled: false });
  expect((await promoBenefits("a", now)).plusUntil).toBe("2030-06-08T12:00:00.000Z");
  await expect(redeem("b")).rejects.toThrow("unavailable"); expect((await turso.execute("SELECT * FROM membership_promo_audit")).rows).toHaveLength(2);
});
it("expires token and download credits at UTC boundaries", async () => {
  const { id } = await savePromo("admin", { ...campaign(), effect: "ai_tokens", value: 500 }); await redeem("a");
  expect((await promoBenefits("a", now)).aiTokens).toBe(500); expect((await promoBenefits("a", Date.parse("2030-06-02T00:00:00Z"))).aiTokens).toBe(0);
  await savePromo("admin", { ...campaign(), id, effect: "downloads", value: 2 }); await redeem("b"); expect((await promoBenefits("b", now)).downloads).toBe(2);
  expect((await promoBenefits("b", Date.parse("2030-07-01T00:00:00Z"))).downloads).toBe(0);
});
it("rejects unavailable dates, malformed effects, and excessive access grants", async () => {
  await savePromo("admin", campaign()); await expect(redeemPromo("a", { code: "STUDY7", requestId: crypto.randomUUID() }, Date.parse("2030-07-01T00:00:00Z"))).rejects.toThrow("unavailable");
  await expect(savePromo("admin", { ...campaign(), value: 1000 })).rejects.toThrow(); await expect(savePromo("admin", { ...campaign(), effect: "run_script" })).rejects.toThrow();
});
