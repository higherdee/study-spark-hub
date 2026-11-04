import { readFile, writeFile } from "node:fs/promises";
import { Bachs } from "@bachs/sdk";

process.loadEnvFile(".env.local");
const key = process.env.BACHS_LIVE_SECRET_KEY || "";
if (!key.startsWith("sk_live_")) throw new Error("A Bachs live key is required.");
const client = new Bachs({ apiKey: key, environment: "production", timeoutMs: 15000, maxRetries: 1, logLevel: "off" });
const path = new URL("../src/data/billing-catalog.json", import.meta.url);
const catalog = JSON.parse(await readFile(path, "utf8"));
// The existing dated FX snapshot already contains the USD equivalents of the
// approved NGN bases. Keep this conversion fixed until prices are reviewed.
const reference = catalog.markets.GH;
if (reference.currency !== "USD") throw new Error("The regional USD reference is unavailable.");
const products = [];
for await (const product of client.products.listAll({ limit: 100 })) products.push(product);
catalog.environments.live.bachs ||= {};
catalog.history.live.bachs ||= {};
catalog.environments.live.bachsInternational ||= {};
catalog.environments.live.bachs ||= {};
catalog.history.live.bachs ||= {};
catalog.environments.live.bachsInternational ||= {};
for (const [tier, plan, interval] of [["regional", "weekly", "week"], ["regional", "monthly", "month"], ["regional", "yearly", "year"], ["international", "monthly", "month"], ["international", "yearly", "year"]]) {
  const minor = tier === "regional" ? reference[plan] : { monthly: 1299, yearly: 10999 }[plan];
  if (!Number.isSafeInteger(minor) || minor <= 0) throw new Error("Invalid regional price.");
  const amount = (minor / 100).toFixed(2);
  const name = `SyllaPlus ${tier} ${plan}`;
  const matches = products.filter((p) => !p.archived_at && p.name === name && p.price?.currency === "USD" && p.price?.price_type === "fixed" && Number(p.price.amount) === Number(amount) && p.billing_cycle?.interval === interval && p.billing_cycle?.frequency === 1);
  if (matches.length > 1) throw new Error(`Multiple matching ${plan} products require review.`);
  const product = matches[0] || await client.products.create({ name, description: "Syllaboss study membership. Charged immediately; seven extra days before the first renewal once per account.", price: { currency: "USD", price_type: "fixed", amount }, billing_cycle: { interval, frequency: 1 }, metadata: { app: "syllaboss", tier, plan, ngn_base_minor: { weekly: 199900, monthly: 699900, yearly: 6899900 }[plan], fx_updated_at: catalog.fxUpdatedAt } }, { idempotencyKey: `syllaboss-live-${tier}-${plan}-${minor}-v1` });
  catalog.environments.live[tier === "regional" ? "bachs" : "bachsInternational"][plan] = product.id;
  catalog.history.live.bachs[product.id] = plan;
  // Actual recurring charges are USD in every regional market. Preserve the
  // existing local equivalent fields for the pricing display.
  if (tier === "regional") for (const market of Object.values(catalog.markets)) {
    market.currency = "USD";
    market[plan] = minor;
  }
  await writeFile(path, JSON.stringify(catalog, null, 2) + "\n");
  console.log(`Bachs live ${plan} product configured: USD ${amount}.`);
}
console.log("Live catalog saved. No payments were created.");
