import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSignedDownloadUrl } from "@/integrations/r2/client.server";
import {
  recordMaterialDownload,
  recordMaterialView,
  rateMaterial,
  getUserRating,
  requestWithdrawal as tursoRequestWithdrawal,
  claimAppInstallBonus as tursoClaimInstall,
  syncSubscriptionStatus as tursoSyncSubscriptionStatus,
  recordStudySession as tursoRecordStudy,
  createComplaint as tursoCreateComplaint,
  replyToComplaint as tursoReplyComplaint,
  createAnnouncement as tursoCreateAnnouncement,
  markNotificationRead as tursoMarkNotificationRead,
} from "@/integrations/turso/client.server";
import { MINIMUM_WITHDRAWAL_POINTS } from "@/lib/constants";
import { getCurrentUserIdOrNull, requireAdmin, requireCurrentUserId, requireSelfOrAdmin } from "@/lib/auth.server";

export const getDownloadUrlServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ materialId: z.string(), userId: z.string().optional() }).parse(d)
  )
  .handler(async ({ data }) => {
    const userId = await requireCurrentUserId();
    if (data.userId && data.userId !== userId) throw new Error("Forbidden");
    const material = await import("@/integrations/turso/client.server").then((db) => db.getMaterialById(data.materialId));
    if (!material) throw new Error("Material not found");
    if (material.status !== "verified" && material.user_id !== userId && !(await import("@/lib/auth.server").then(({ requireAdmin }) => requireAdmin()))) {
      throw new Error("This material is not available for download.");
    }
    const filePath = await recordMaterialDownload(data.materialId, userId);
    // If filePath is an external URL or missing, route to our resilient material streaming endpoint
    if (!filePath || filePath.startsWith("http://") || filePath.startsWith("https://")) {
      return { downloadUrl: `/api/materials?id=${data.materialId}&download=true` };
    }
    try {
      const downloadUrl = await getSignedDownloadUrl(filePath, 300);
      return { downloadUrl };
    } catch {
      return { downloadUrl: `/api/materials?id=${data.materialId}&download=true` };
    }
  });

export const getPreviewUrlServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ materialId: z.string() }).parse(d)
  )
  .handler(async ({ data }) => {
    await requireCurrentUserId();
    return { previewUrl: `/api/materials?id=${data.materialId}` };
  });

export const recordMaterialViewServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ materialId: z.string(), userId: z.string().optional() }).parse(d)
  )
  .handler(async ({ data }) => {
    const userId = await getCurrentUserIdOrNull();
    if (data.userId && data.userId !== userId) throw new Error("Forbidden");
    await recordMaterialView(data.materialId, userId ?? undefined);
    return { success: true };
  });

export const rateMaterialServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        materialId: z.string(),
        userId: z.string(),
        rating: z.number().min(1).max(5),
        review: z.string().optional(),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.userId);
    const res = await rateMaterial(data.materialId, data.userId, data.rating, data.review);
    return res;
  });

export const getUserRatingServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ materialId: z.string(), userId: z.string() }).parse(d)
  )
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.userId);
    const rating = await getUserRating(data.materialId, data.userId);
    return { rating };
  });

export const requestWithdrawalServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        userId: z.string(),
        points: z.number().int().positive().max(1_000_000),
        bankName: z.string().trim().min(1).max(80),
        accountNumber: z.string().trim().min(3).max(120),
        accountName: z.string().trim().min(1).max(120),
        payoutMethod: z.enum(["bank", "card", "giftcard"]).optional().default("bank"),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.userId);
    if (data.payoutMethod === "card") throw new Error("Card payouts are unavailable. Choose a bank transfer or gift card.");
    if (data.payoutMethod !== "giftcard" && data.points < MINIMUM_WITHDRAWAL_POINTS) {
      throw new Error(`Minimum withdrawal is ${MINIMUM_WITHDRAWAL_POINTS.toLocaleString()} SyllaPoints.`);
    }
    if (data.payoutMethod === "bank" && !/^\d{10}$/.test(data.accountNumber)) {
      throw new Error("Enter a valid 10-digit bank account number.");
    }

    const id = await tursoRequestWithdrawal(
      data.userId,
      data.points,
      data.bankName,
      data.accountNumber,
      data.accountName,
      data.payoutMethod
    );
    return { withdrawalId: id };
  });

export const claimAppInstallBonusServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ userId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.userId);
    const claimed = await tursoClaimInstall(data.userId);
    return { claimed };
  });

export const upgradeToSyllaPlusServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        userId: z.string(),
        plan: z.enum(["weekly", "monthly", "yearly"]).optional().default("monthly"),
        paymentMethod: z.string().optional().default("bachs"),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.userId);
    throw new Error("Subscription upgrades are applied only after payment-provider verification.");
  });

export const syncSubscriptionStatusServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ userId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.userId);
    return await tursoSyncSubscriptionStatus(data.userId);
  });

export const recordStudySessionServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ userId: z.string(), minutes: z.number().int().min(1).max(240) }).parse(d))
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.userId);
    const res = await tursoRecordStudy(data.userId, data.minutes);
    return res;
  });

export const resolveBankAccountServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ accountNumber: z.string().length(10), bankCode: z.string().min(1) }).parse(d)
  )
  .handler(async ({ data }) => {
    await requireCurrentUserId();
    const paystackSecret = process.env['PAYSTACK_SECRET_KEY'];
    if (!paystackSecret) return { verified: false, error: "Bank verification is temporarily unavailable." };

    try {
      const res = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${data.accountNumber}&bank_code=${data.bankCode}`,
        {
          headers: {
            Authorization: `Bearer ${paystackSecret}`,
          },
        }
      );
      const json = await res.json();
      if (!res.ok || !json.status) {
        return {
          verified: false,
          error: json.message || "Could not resolve bank account details.",
        };
      }
      return {
        verified: true,
        accountName: json.data?.account_name as string,
        accountNumber: json.data?.account_number as string,
      };
    } catch (err) {
      console.error("Paystack account resolve error:", err);
      return {
        verified: false,
        error: "Verification service temporarily unreachable.",
      };
    }
  });

export const createComplaintServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ materialId: z.string(), userId: z.string(), complaintText: z.string().min(5) }).parse(d)
  )
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.userId);
    const id = await tursoCreateComplaint(data.materialId, data.userId, data.complaintText);
    return { complaintId: id };
  });

export const replyToComplaintServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        complaintId: z.string(),
        adminReply: z.string().min(1),
        newStatus: z.enum(["resolved", "rejected"]).optional(),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    await tursoReplyComplaint(data.complaintId, data.adminReply, data.newStatus);
    return { success: true };
  });

export const createAnnouncementServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        title: z.string().min(3),
        message: z.string().min(5),
        target: z.enum(["all", "app_only", "web_only"]).default("all"),
        adminId: z.string(),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const id = await tursoCreateAnnouncement(data.title, data.message, data.target, data.adminId);
    return { announcementId: id };
  });

export const markNotificationReadServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ notificationId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireCurrentUserId();
    const userId = await requireCurrentUserId();
    await tursoMarkNotificationRead(data.notificationId, userId);
    return { success: true };
  });

export const getLeaderboardServerFn = createServerFn({ method: "GET" })
  .handler(async () => {
    await requireCurrentUserId();
    const { getLeaderboard } = await import("@/integrations/turso/client.server");
    const list = await getLeaderboard(50);
    return { leaderboard: list };
  });

export const createBachsCheckoutSessionServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({
    userId: z.string(),
    email: z.string().optional(),
    amountNaira: z.number().optional(),
    plan: z.enum(["weekly", "monthly", "yearly"]).optional().default("monthly"),
  }).parse(d))
  .handler(async ({ data }) => {
    await requireSelfOrAdmin(data.userId);
    throw new Error("Subscription checkout is temporarily unavailable while payment verification is being configured.");
  });
