import {beforeAll,expect,it,vi} from "vitest";
vi.mock("@/integrations/turso/client.server",async()=>{const {createClient}=await import("@libsql/client");return {turso:createClient({url:"file::memory:"})}});
import {turso} from "@/integrations/turso/client.server";
import {ensureBillingTables} from "@/lib/billing/store.server";
import {ensurePromoTables} from "@/lib/membership/promos.server";
const provider=vi.hoisted(()=>({extend:vi.fn(async (_id:string,target:string)=>({trial_end:target}))}));
vi.mock("@/lib/billing/bachs.server",()=>({extendBachsFirstRenewal:provider.extend}));
import {grantPrepaidTime,alignPrepaidRenewal} from "@/lib/billing/prepaid.server";
beforeAll(async()=>{await ensureBillingTables();await ensurePromoTables();await turso.execute("INSERT INTO billing_subscriptions VALUES('bachs','live','sub','customer','member','monthly','regional','USD',520,'active','2026-11-01T00:00:00.000Z','2026-12-01T00:00:00.000Z',NULL,NULL,'2026-11-01T00:00:00.000Z')")});
it("stacks paid time after an existing expiry and cannot grant a retried payment twice",async()=>{
 const first=await grantPrepaidTime("member","payment-1","monthly","live","2026-11-08T00:00:00.000Z");expect(first).toBe("2027-01-01T00:00:00.000Z");
 expect(await grantPrepaidTime("member","payment-1","monthly","live","2026-11-08T00:00:00.000Z")).toBe(first);
 expect(await grantPrepaidTime("member","payment-2","weekly","live","2026-11-08T00:00:00.000Z")).toBe("2027-01-08T00:00:00.000Z");
 expect((await turso.execute("SELECT COUNT(*) n FROM membership_promo_claims WHERE user_id='member'")).rows[0]?.["n"]).toBe(2);
});
it("never grants live access from sandbox checkout",async()=>{await grantPrepaidTime("test-member","sandbox-payment","yearly","sandbox","2026-11-08T00:00:00.000Z");expect((await turso.execute("SELECT COUNT(*) n FROM membership_promo_claims WHERE user_id='test-member'")).rows[0]?.["n"]).toBe(0)});
it("starts expired membership time at verified payment completion",async()=>{expect(await grantPrepaidTime("new-member","payment-3","weekly","live","2026-11-08T00:00:00.000Z")).toBe("2026-11-15T00:00:00.000Z")});
it("moves the existing card renewal to the prepaid expiry only after provider confirmation",async()=>{
 await turso.execute("CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY,sylla_plus INTEGER,study_plan TEXT)");
 await turso.execute("INSERT INTO profiles VALUES('member',1,'{}')");
 await turso.execute("INSERT INTO billing_customers(provider,environment,customer_id,user_id) VALUES('bachs','live','customer','member')");
 await alignPrepaidRenewal("member");
 expect(provider.extend).toHaveBeenCalledWith("sub","2027-01-08T00:00:00.000Z","live");
 expect((await turso.execute("SELECT period_end FROM billing_subscriptions WHERE subscription_id='sub'")).rows[0]?.["period_end"]).toBe("2027-01-08T00:00:00.000Z");
 const calls=provider.extend.mock.calls.length;await alignPrepaidRenewal("member");expect(provider.extend.mock.calls.length).toBe(calls);
});
