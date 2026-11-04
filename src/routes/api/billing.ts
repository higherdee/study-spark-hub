import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { waitUntil } from "@vercel/functions";
import { PLAN_IDS, normalizeCountry } from "@/lib/billing/catalog";
import { billingEnvironment, checkoutProductId, checkoutQuote, providerConfigured } from "@/lib/billing/providers.server";
import { BillingError, billingIdentity, billingSummary, cancelRenewal, managementUrl, publicCheckoutConfiguration, startCheckout } from "@/lib/billing/service.server";
import { checkoutByReference, findCheckout } from "@/lib/billing/store.server";
import { drainBillingEvents, synchronizePaddle, verifyBachsCheckout, verifyPaystackPayment } from "@/lib/billing/events.server";

const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/billing")({
  server: { handlers: {
    GET: async ({ request }) => {
      try {
        const url = new URL(request.url);
        const country = normalizeCountry(url.searchParams.get("country") || request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry"));
        if (url.searchParams.get("resource") === "catalog") {
          const configuration = publicCheckoutConfiguration();
          const plans = country ? PLAN_IDS.flatMap((plan) => {
            try {
              const quote = checkoutQuote(country, plan);
              return [{ ...quote, ready: process.env["BILLING_ENABLED"] === "true" && Boolean(checkoutProductId(quote)) && providerConfigured(quote.provider), bonusDays: 7 }];
            } catch { return []; }
          }) : [];
          return json({ ...configuration, country, plans });
        }
        const userId = await billingIdentity(request);
        const reference = url.searchParams.get("checkout");
        const transaction = url.searchParams.get("transaction");
        if (reference || transaction) {
          const checkout = reference ? await findCheckout(reference, userId) : await checkoutByReference("paddle", billingEnvironment(), transaction!);
          if (!checkout || checkout.userId !== userId || checkout.environment !== billingEnvironment()) return json({ error: "Checkout not found." }, 404);
          if (checkout.providerReference && checkout.state !== "paid") {
            const reconcile = async () => {
              try {
                if (checkout.provider === "bachs") await verifyBachsCheckout(checkout.providerReference!, checkout.environment);
                else if (checkout.provider === "paystack") await verifyPaystackPayment(checkout.providerReference!, checkout.environment);
                else {
                  const { paddle } = await import("@/lib/billing/providers.server");
                  const transaction = await paddle(checkout.environment).transactions.get(checkout.providerReference!);
                  if (transaction.status === "completed" && transaction.subscriptionId) await synchronizePaddle(transaction.subscriptionId, checkout.environment);
                }
              } catch { /* A closed or still-pending checkout is not a failed payment. */ }
            };
            waitUntil(reconcile());
          }
        }
        return json(await billingSummary(userId, country));
      } catch (error) { return billingFailure(error); }
    },
    POST: async ({ request }) => {
      try {
        const userId = await billingIdentity(request);
        const input = await request.json().catch(() => null);
        if (input?.action === "checkout") {
          const parsed = z.object({ action: z.literal("checkout"), id: z.string().uuid(), plan: z.enum(PLAN_IDS), country: z.string().length(2), acceptedTerms: z.literal(true), recurringConsent: z.literal(true) }).strict().safeParse(input);
          if (!parsed.success) return json({ error: "Choose your country and plan, and agree to the payment terms before continuing." }, 400);
          return json(await startCheckout(userId, parsed.data));
        }
        if (input?.action === "manage") return json({ url: await managementUrl(userId) });
        if (input?.action === "cancel" && input.confirmed === true) return json(await cancelRenewal(userId));
        if (input?.action === "refresh") {
          const environment = billingEnvironment();
          waitUntil(Promise.all([drainBillingEvents("bachs", environment), drainBillingEvents("paddle", environment), drainBillingEvents("paystack", environment)]));
          return json(await billingSummary(userId));
        }
        return json({ error: "Unknown membership action." }, 400);
      } catch (error) { return billingFailure(error); }
    },
  } },
});

function billingFailure(error: unknown) {
  if (error instanceof BillingError) return json({ error: error.message }, error.status);
  console.error("Membership request could not complete");
  return json({ error: "Your membership could not be updated right now. Please retry. If a payment was completed, it will be verified automatically." }, 503);
}
