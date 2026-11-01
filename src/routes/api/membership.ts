import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { billingIdentity } from "@/lib/billing/service.server";
import { getProfile, upsertProfile } from "@/integrations/turso/client.server";
import { preferencePatch } from "@/lib/membership/preferences";
import { completeMaterialGate, ensureMembershipTables, membershipSnapshot, startMaterialGate } from "@/lib/membership/policy.server";
import { MembershipLimitError } from "@/lib/membership/policy";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export const Route = createFileRoute("/api/membership")({ server: { handlers: {
  GET: async ({ request }) => {
    try {
      const userId = await billingIdentity(request);
      const resource = new URL(request.url).searchParams.get("resource");
      if (resource === "admin-promos") { const { listPromos } = await import("@/lib/membership/promos.server"); return json({ promos: await listPromos(userId) }); }
      if (resource === "preferences") return json({ preferences: (await getProfile(userId))?.study_plan?.["preferences"] || {} });
      if (resource === "reviews") {
        const { materialReviews } = await import("@/lib/material-reviews.functions");
        return json(await materialReviews(userId, new URL(request.url).searchParams.get("materialId") || ""));
      }
      if (resource === "focus") { const { focusSnapshot } = await import("@/lib/focus.server"); return json(await focusSnapshot(userId)); }
      return json(await membershipSnapshot(userId));
    }
    catch (error) { return failure(error); }
  },
  POST: async ({ request }) => {
    try {
      const userId = await billingIdentity(request);
      if ((await getProfile(userId))?.suspended) return json({ error: "This account cannot access materials." }, 403);
      const input = await request.json();
      if (input?.action === "save-promo") { const { savePromo } = await import("@/lib/membership/promos.server"); return json(await savePromo(userId, input.promo)); }
      if (input?.action === "redeem-promo") { const { redeemPromo } = await import("@/lib/membership/promos.server"); return json(await redeemPromo(userId, { code: input.code, requestId: input.requestId })); }
      if (input?.action === "preferences") {
        const preferences = preferencePatch.parse(input.preferences);
        await upsertProfile({ id: userId, study_plan: { preferences } });
        return json({ preferences });
      }
      if (input?.action === "study-heartbeat") {
        const { focusHeartbeat } = await import("@/lib/focus.server");
        return json(await focusHeartbeat(userId, z.boolean().parse(input.active)));
      }
      if (input?.action === "start-material") {
        const parsed = z.object({ action: z.literal("start-material"), materialId: z.string().min(1).max(100), intent: z.enum(["preview", "download"]) }).strict().parse(input);
        return json(await startMaterialGate(userId, parsed.materialId, parsed.intent));
      }
      if (input?.action === "complete-material") return json(await completeMaterialGate(userId, z.string().uuid().parse(input.id)));
      if (input?.action === "accept-terms") {
        const terms = z.object({ action: z.literal("accept-terms"), version: z.literal("2026-10-31"), accepted: z.literal(true) }).strict().parse(input);
        await ensureMembershipTables();
        const { turso } = await import("@/integrations/turso/client.server");
        await turso.execute({ sql: "INSERT INTO membership_consents(user_id,version,accepted_at) VALUES(?,?,datetime('now')) ON CONFLICT(user_id) DO UPDATE SET version=excluded.version,accepted_at=excluded.accepted_at", args: [userId, terms.version] });
        return json({ accepted: true });
      }
      return json({ error: "Unknown membership action." }, 400);
    } catch (error) { return failure(error); }
  },
} } });
function failure(error: unknown) {
  if (error instanceof Error && /^(This promo code|Admin access required|Promo code not found)/.test(error.message)) return json({ error: error.message }, error.message.startsWith("Admin") ? 403 : 400);
  if (error instanceof MembershipLimitError) return Response.json({ error: error.message, upgrade: /SyllaPlus|Free accounts|1,000/i.test(error.message) }, { status: error.status, headers: { "Cache-Control": "no-store", ...(error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {}) } });
  if (error instanceof z.ZodError) return json({ error: "Check the request and try again." }, 400);
  return json({ error: "Sign in and try again. Your membership could not be checked." }, 401);
}
