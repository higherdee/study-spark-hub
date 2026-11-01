import { readFile, writeFile } from "node:fs/promises";
import { BILLING_PRICES, REGIONAL_MARKETS, PLAN_IDS } from "../src/lib/billing/catalog.ts";

process.loadEnvFile(".env.local");
const environment = process.argv.includes("--live") ? "live" : "sandbox";
const apply = process.argv.includes("--apply");
if (apply) throw new Error("The legacy Paystack catalog setup is retired. Use setup-paddle-sandbox.mjs for Paddle testing; Bachs catalog setup is being connected separately.");
if (apply && environment === "live" && !process.argv.includes("--confirm-live-catalog")) throw new Error("Review the dry run, then explicitly confirm the live catalog.");
const path = new URL("../src/data/billing-catalog.json", import.meta.url);
const catalog = JSON.parse(await readFile(path, "utf8"));
const currencies = { NG: "NGN", GH: "GHS", KE: "KES", ZA: "ZAR", EG: "EGP", RW: "RWF", UG: "UGX", TZ: "TZS", ET: "ETB", CM: "XAF", SN: "XOF", CI: "XOF", MA: "MAD", DZ: "DZD", TN: "TND", IN: "INR", PK: "PKR", NP: "NPR" };
const supportedPaddleCurrencies = new Set(["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CLP", "HKD", "SGD", "SEK", "ARS", "BRL", "CNY", "COP", "CZK", "DKK", "HUF", "ILS", "INR", "KRW", "MXN", "NOK", "NZD", "PEN", "PLN", "RUB", "THB", "TRY", "TWD", "UAH", "VND", "ZAR"]);
const response = await fetch("https://open.er-api.com/v6/latest/NGN", { signal: AbortSignal.timeout(20000) });
const fx = await response.json();
if (!response.ok || fx.result !== "success" || fx.base_code !== "NGN" || !fx.rates.USD || Date.now() / 1000 - fx.time_last_update_unix > 172800) throw new Error("A current, verified exchange-rate snapshot is required.");
const minorDigits = (currency) => ["JPY", "KRW", "CLP", "VND", "RWF", "UGX", "XAF", "XOF"].includes(currency) ? 0 : currency === "TND" ? 3 : 2;
for (const code of Object.keys(REGIONAL_MARKETS)) {
  const local = currencies[code];
  const currency = code === "NG" ? "NGN" : supportedPaddleCurrencies.has(local) ? local : "USD";
  if (!fx.rates[currency] || !fx.rates[local]) throw new Error("Required regional exchange rate is missing.");
  const values = { currency, equivalentCurrency: local };
  for (const plan of PLAN_IDS) {
    values[plan] = Math.round(BILLING_PRICES.regional[plan] / 100 * fx.rates[currency] * 10 ** minorDigits(currency));
    values[`equivalent${plan[0].toUpperCase()}${plan.slice(1)}`] = Math.round(BILLING_PRICES.regional[plan] / 100 * fx.rates[local] * 10 ** minorDigits(local));
  }
  catalog.markets[code] = values;
}
catalog.fxUpdatedAt = new Date(fx.time_last_update_unix * 1000).toISOString();
catalog.fxAttribution = "https://www.exchangerate-api.com";
console.log(JSON.stringify({ environment, apply, pricing: BILLING_PRICES, firstRenewalBonusDays: 7, localizedMarkets: catalog.markets }, null, 2));

async function api(provider, resource, body) {
  const key = provider === "paddle" ? process.env[environment === "live" ? "PADDLE_LIVE_API_KEY" : "PADDLE_SANDBOX_API_KEY"] : process.env[environment === "live" ? "PAYSTACK_LIVE_SECRET_KEY" : "PAYSTACK_TEST_SECRET_KEY"] || process.env.PAYSTACK_SECRET_KEY;
  const base = provider === "paddle" ? environment === "live" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com" : "https://api.paystack.co";
  const response = await fetch(base + resource, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(25000) });
  const result = await response.json();
  if (!response.ok || provider === "paystack" && !result.status) throw new Error(`${provider} request failed (${response.status}); inspect the account permissions and configuration.`);
  return result.data;
}

if (apply) {
  const paystackKey = process.env[environment === "live" ? "PAYSTACK_LIVE_SECRET_KEY" : "PAYSTACK_TEST_SECRET_KEY"] || process.env.PAYSTACK_SECRET_KEY || "";
  if (paystackKey.startsWith(environment === "live" ? "sk_live_" : "sk_test_")) {
    const existing = await api("paystack", "/plan?perPage=100");
    for (const plan of PLAN_IDS) {
      const interval = plan === "yearly" ? "annually" : plan;
      const name = `SyllaPlus Regional ${plan}`;
      const body = { name, interval, amount: BILLING_PRICES.regional[plan], currency: "NGN", send_invoices: true, send_sms: false };
      const found = existing.find((price) => price.name === name && price.interval === interval && price.amount === body.amount && price.currency === body.currency);
      const price = found || await api("paystack", "/plan", body);
      catalog.environments[environment].paystack[plan] = price.plan_code;
      catalog.history[environment].paystack[price.plan_code] = plan;
      console.log("Paystack plan ready:", plan, price.plan_code);
      await writeFile(path, JSON.stringify(catalog, null, 2) + "\n");
    }
  } else console.log("Paystack skipped: a matching environment key is required.");
  const paddleKey = process.env[environment === "live" ? "PADDLE_LIVE_API_KEY" : "PADDLE_SANDBOX_API_KEY"] || "";
  if (paddleKey.startsWith(environment === "live" ? "pdl_live_apikey_" : "pdl_sdbx_apikey_")) {
    const products = await api("paddle", "/products?per_page=200");
    const product = products.find((item) => item.name === "SyllaPlus" && item.status === "active") || await api("paddle", "/products", { name: "SyllaPlus", tax_category: "saas", description: "Syllaboss study membership" });
    const existing = await api("paddle", `/prices?product_id=${product.id}&per_page=200`);
    for (const plan of PLAN_IDS) {
      const description = `SyllaPlus ${plan} — October 2026`;
      const overrides = Object.keys(REGIONAL_MARKETS).map((code) => {
        const market = catalog.markets[code];
        const currency = market.currency === "NGN" ? "USD" : market.currency;
        const amount = market.currency === "NGN" ? Math.round(BILLING_PRICES.regional[plan] / 100 * fx.rates.USD * 100) : market[plan];
        return { country_codes: [code], unit_price: { amount: String(amount), currency_code: currency } };
      });
      const amount = plan === "weekly" ? Math.round(BILLING_PRICES.regional.weekly / 100 * fx.rates.USD * 100) : BILLING_PRICES.international[plan];
      const body = { product_id: product.id, description, billing_cycle: { interval: { weekly: "week", monthly: "month", yearly: "year" }[plan], frequency: 1 }, trial_period: null,
        unit_price: { amount: String(amount), currency_code: "USD" }, unit_price_overrides: overrides };
      const price = existing.find((price) => price.description === description && price.unit_price.amount === String(amount) && !price.trial_period) || await api("paddle", "/prices", body);
      catalog.environments[environment].paddle[plan] = price.id;
      catalog.history[environment].paddle[price.id] = plan;
      console.log("Paddle price ready:", plan, price.id);
      await writeFile(path, JSON.stringify(catalog, null, 2) + "\n");
    }
  } else console.log("Paddle skipped: a valid matching-environment server key is required.");
} else console.log("Dry run only: no provider records were created.");
if (apply) await writeFile(path, JSON.stringify(catalog, null, 2) + "\n");
