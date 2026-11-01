import { readFile, writeFile } from "node:fs/promises";
import { Paddle, Environment, LogLevel } from "@paddle/paddle-node-sdk";

process.loadEnvFile(".env.local");
const key = process.env.PADDLE_SANDBOX_API_KEY || "";
if (!key.startsWith("pdl_sdbx_apikey_")) throw new Error("A verified Paddle sandbox key is required.");
const client = new Paddle(key, { environment: Environment.sandbox, logLevel: LogLevel.none });
const path = new URL("../src/data/billing-catalog.json", import.meta.url);
const catalog = JSON.parse(await readFile(path, "utf8"));
const products = await client.products.list({ perPage: 200 }).next();
const product = products.find((item) => item.name === "SyllaPlus" && item.status === "active") || await client.products.create({ name: "SyllaPlus", taxCategory: "saas", description: "Syllaboss study membership" });
const prices = await client.prices.list({ productId: [product.id], perPage: 200 }).next();
for (const [plan, amount] of [["monthly", "1299"], ["yearly", "10999"]]) {
  const interval = plan === "monthly" ? "month" : "year";
  const description = `SyllaPlus international ${plan}`;
  const price = prices.find((item) => item.description === description && item.status === "active" && item.unitPrice.amount === amount && item.unitPrice.currencyCode === "USD" && item.billingCycle?.interval === interval && item.billingCycle?.frequency === 1 && !item.trialPeriod && !item.unitPriceOverrides.length)
    || await client.prices.create({ productId: product.id, description, billingCycle: { interval, frequency: 1 }, trialPeriod: null, unitPrice: { amount, currencyCode: "USD" } });
  catalog.environments.sandbox.paddle[plan] = price.id;
  catalog.history.sandbox.paddle[price.id] = plan;
  await writeFile(path, JSON.stringify(catalog, null, 2) + "\n");
  console.log(`Paddle sandbox ${plan} price configured.`);
}
const tokens = await client.clientTokens.list({ perPage: 200 }).next();
const token = tokens.find((item) => item.name === "Syllaboss sandbox checkout" && item.status === "active")
  || await client.clientTokens.create({ name: "Syllaboss sandbox checkout", description: "Paddle.js checkout for Syllaboss sandbox tests" });
if (!token.token.startsWith("test_")) throw new Error("Unexpected checkout token environment.");
const envPath = new URL("../.env.local", import.meta.url);
let env = await readFile(envPath, "utf8");
env = /^PADDLE_SANDBOX_CLIENT_TOKEN=/m.test(env) ? env.replace(/^PADDLE_SANDBOX_CLIENT_TOKEN=.*$/m, `PADDLE_SANDBOX_CLIENT_TOKEN=${token.token}`) : `${env}\nPADDLE_SANDBOX_CLIENT_TOKEN=${token.token}\n`;
await writeFile(envPath, env);
console.log("Paddle sandbox checkout token saved privately. No real payments were made.");
