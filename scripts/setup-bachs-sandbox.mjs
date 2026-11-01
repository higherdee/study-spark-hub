import { readFile, writeFile } from "node:fs/promises";
import { Bachs } from "@bachs/sdk";

process.loadEnvFile(".env.local");
const key = process.env.BACHS_SANDBOX_SECRET_KEY || "";
if (!key.startsWith("sk_sandbox_")) throw new Error("A Bachs sandbox key is required.");
const client = new Bachs({ apiKey: key, environment: "sandbox", timeoutMs: 15000, maxRetries: 1, logLevel: "off" });
const path = new URL("../src/data/billing-catalog.json", import.meta.url);
const catalog = JSON.parse(await readFile(path, "utf8"));
// The existing dated FX snapshot already contains the USD equivalents of the
// approved NGN bases. Keep this conversion fixed until prices are reviewed.
const reference = catalog.markets.GH;
if (reference.currency !== "USD") throw new Error("The regional USD reference is unavailable.");
const products = [];
for await (const product of client.products.listAll({ limit: 100 })) products.push(product);
catalog.environments.sandbox.bachs ||= {};
catalog.history.sandbox.bachs ||= {};
catalog.environments.live.bachs ||= {};
catalog.history.live.bachs ||= {};
for (const [plan, interval] of [["weekly", "week"], ["monthly", "month"], ["yearly", "year"]]) {
  const minor = reference[plan];
  if (!Number.isSafeInteger(minor) || minor <= 0) throw new Error("Invalid regional price.");
  const amount = (minor / 100).toFixed(2);
  const name = `SyllaPlus regional ${plan}`;
  const matches = products.filter((p) => !p.archived_at && p.name === name && p.price?.currency === "USD" && p.price?.price_type === "fixed" && Number(p.price.amount) === Number(amount) && p.billing_cycle?.interval === interval && p.billing_cycle?.frequency === 1);
  if (matches.length > 1) throw new Error(`Multiple matching ${plan} products require review.`);
  const product = matches[0] || await client.products.create({ name, description: "Syllaboss regional study membership. Charged immediately; seven extra days before the first renewal once per account.", price: { currency: "USD", price_type: "fixed", amount }, billing_cycle: { interval, frequency: 1 }, metadata: { app: "syllaboss", tier: "regional", plan, ngn_base_minor: { weekly: 199900, monthly: 699900, yearly: 6899900 }[plan], fx_updated_at: catalog.fxUpdatedAt } }, { idempotencyKey: `syllaboss-regional-${plan}-${minor}-v1` });
  catalog.environments.sandbox.bachs[plan] = product.id;
  catalog.history.sandbox.bachs[product.id] = plan;
  // Actual recurring charges are USD in every regional market. Preserve the
  // existing local equivalent fields for the pricing display.
  for (const market of Object.values(catalog.markets)) {
    market.currency = "USD";
    market[plan] = minor;
  }
  await writeFile(path, JSON.stringify(catalog, null, 2) + "\n");
  console.log(`Bachs sandbox ${plan} product configured: USD ${amount}.`);
}
console.log("Sandbox catalog saved. No live products or payments were changed.");
