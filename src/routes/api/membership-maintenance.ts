import { timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { runMembershipMaintenance } from "@/lib/membership/maintenance.server";
import { drainBillingEvents } from "@/lib/billing/events.server";
export const Route = createFileRoute("/api/membership-maintenance")({ server: { handlers: { GET: async ({ request }) => {
  const secret = process.env["CRON_SECRET"];
  const supplied = request.headers.get("authorization") || "";
  const expected = secret ? `Bearer ${secret}` : "";
  if (!secret || Buffer.byteLength(expected) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) return new Response("Unauthorized", { status: 401 });
  const result = await runMembershipMaintenance();
  // Retry verified, durable notifications in both isolated payment modes.
  for (const environment of ["sandbox", "live"] as const) for (const provider of ["bachs", "paddle"] as const) await drainBillingEvents(provider, environment);
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
} } } });
