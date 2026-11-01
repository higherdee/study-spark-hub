import { createFileRoute } from "@tanstack/react-router";
import { waitUntil } from "@vercel/functions";
import { paddle, webhookSecret } from "@/lib/billing/providers.server";
import { verifyPaystackSignature } from "@/lib/billing/signatures.server";
import { billingEventProcessed, enqueueEvent } from "@/lib/billing/store.server";
import { drainBillingEvents, paymentEventId, queuedEvent } from "@/lib/billing/events.server";
import { bachsWebhookEvent } from "@/lib/billing/bachs.server";

export const Route = createFileRoute("/api/billing-webhook")({ server: { handlers: {
  POST: async ({ request }) => {
    const url = new URL(request.url);
    const provider = url.searchParams.get("provider");
    const environment = url.searchParams.get("environment");
    if ((provider !== "bachs" && provider !== "paddle" && provider !== "paystack") || (environment !== "live" && environment !== "sandbox")) return new Response("Unknown billing endpoint", { status: 404 });
    const secret = webhookSecret(provider, environment);
    if (!secret) return new Response("Webhook is not configured", { status: 503 });
    if (Number(request.headers.get("content-length") || 0) > 512000) return new Response("Payload too large", { status: 413 });
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 512000) return new Response("Payload too large", { status: 413 });
    try {
      let signedBachs: ReturnType<typeof bachsWebhookEvent> | undefined;
      if (provider === "bachs") {
        try { signedBachs = bachsWebhookEvent(raw, request.headers, environment); }
        catch { return new Response("Invalid signature", { status: 401 }); }
      }
      const valid = provider === "bachs" ? !!signedBachs : provider === "paddle"
        ? await paddle(environment).webhooks.isSignatureValid(raw, secret, request.headers.get("paddle-signature") || "")
        : verifyPaystackSignature(raw, request.headers.get("x-paystack-signature") || "", secret);
      if (!valid) return new Response("Invalid signature", { status: 401 });
      const event = signedBachs || JSON.parse(raw);
      if (!event || typeof event !== "object" || !event.data) return new Response("Invalid event", { status: 400 });
      if (provider === "paystack" && event.data.domain && event.data.domain !== (environment === "live" ? "live" : "test")) return new Response("Wrong payment environment", { status: 400 });
      const kind = String(provider === "bachs" ? event.type : provider === "paddle" ? event.event_type : event.event);
      const relevant = provider === "bachs" ? ["subscription.", "payment.", "checkout."].some((prefix) => kind.startsWith(prefix)) : provider === "paddle" ? kind.startsWith("subscription.") || kind === "transaction.completed" : kind.startsWith("subscription.") || ["charge.success", "invoice.payment_failed", "invoice.update"].includes(kind);
      if (!relevant) return Response.json({ received: true });
      const id = paymentEventId(provider, raw, event);
      await enqueueEvent(provider, environment, id, JSON.stringify(queuedEvent(provider, event)));
      const work = drainBillingEvents(provider, environment);
      waitUntil(work);
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([work, new Promise<void>((resolve) => { timer = setTimeout(resolve, provider === "paddle" ? 3000 : 7000); })]);
      } finally { if (timer) clearTimeout(timer); }
      // Ask the provider to retry if processing is still pending or failed.
      // The durable inbox and processing leases make duplicate delivery safe.
      if (!await billingEventProcessed(provider, environment, id)) return new Response("Payment verification pending; retry delivery", { status: 503 });
      return Response.json({ received: true });
    } catch {
      return new Response("Webhook could not be processed; retry delivery", { status: 503 });
    }
  },
} } });
