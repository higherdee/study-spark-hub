import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getPresignedUploadUrl, getSignedDownloadUrl } from "@/integrations/r2/client";
import {
  createMaterial,
  setMaterialStatus,
  recordMaterialDownload,
  recordMaterialView,
  rateMaterial,
  getUserRating,
  requestWithdrawal as tursoRequestWithdrawal,
  claimAppInstallBonus as tursoClaimInstall,
  upgradeToSyllaPlus as tursoUpgradePlus,
  syncSubscriptionStatus as tursoSyncSubscriptionStatus,
  recordStudySession as tursoRecordStudy,
  createComplaint as tursoCreateComplaint,
  replyToComplaint as tursoReplyComplaint,
  createAnnouncement as tursoCreateAnnouncement,
  markNotificationRead as tursoMarkNotificationRead,
  getLeaderboard,
} from "@/integrations/turso/client";
import { MINIMUM_WITHDRAWAL_POINTS, SYLLAPLUS_PRICE_NAIRA } from "@/lib/constants";

export const getUploadUrlServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        userId: z.string(),
        fileName: z.string(),
        contentType: z.string(),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const safe = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const key = `materials/${data.userId}/${crypto.randomUUID()}-${safe}`;
    const uploadUrl = await getPresignedUploadUrl(key, data.contentType, 300);
    return { uploadUrl, key };
  });

export const getPresignedUploadUrlServerFn = getUploadUrlServerFn;

export const createMaterialServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        userId: z.string(),
        title: z.string(),
        course: z.string(),
        courseCode: z.string().optional().nullable(),
        institution: z.string(),
        level: z.string().optional().nullable(),
        materialType: z.string(),
        description: z.string().optional().nullable(),
        filePath: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const row = await createMaterial({
      user_id: data.userId,
      title: data.title,
      course: data.course,
      course_code: data.courseCode ?? null,
      institution: data.institution,
      level: data.level ?? null,
      material_type: data.materialType,
      description: data.description ?? null,
      file_path: data.filePath,
      file_name: data.fileName,
      mime_type: data.mimeType,
      file_size: data.fileSize,
      page_count: 1,
    });
    return row;
  });

export const autoVerifyMaterialServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        materialId: z.string(),
        score: z.number().min(0).max(100),
        notes: z.string().optional(),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const status = data.score >= 70 ? "verified" : data.score < 40 ? "rejected" : "pending";
    const notes = data.notes || (status === "verified" ? "Autonomous AI audit passed: verified course material." : "Pending review.");
    await setMaterialStatus(data.materialId, status, data.score, notes);
    return { status, score: data.score, notes };
  });

export const getDownloadUrlServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ materialId: z.string(), userId: z.string().optional() }).parse(d)
  )
  .handler(async ({ data }) => {
    const filePath = await recordMaterialDownload(data.materialId, data.userId);
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
    return { previewUrl: `/api/materials?id=${data.materialId}` };
  });

export const recordMaterialViewServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ materialId: z.string(), userId: z.string().optional() }).parse(d)
  )
  .handler(async ({ data }) => {
    await recordMaterialView(data.materialId, data.userId);
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
    const res = await rateMaterial(data.materialId, data.userId, data.rating, data.review);
    return res;
  });

export const getUserRatingServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ materialId: z.string(), userId: z.string() }).parse(d)
  )
  .handler(async ({ data }) => {
    const rating = await getUserRating(data.materialId, data.userId);
    return { rating };
  });

export const requestWithdrawalServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        userId: z.string(),
        points: z.number().int().min(MINIMUM_WITHDRAWAL_POINTS),
        bankName: z.string().min(1),
        accountNumber: z.string().min(3),
        accountName: z.string().min(1),
        payoutMethod: z.enum(["bank", "card", "giftcard"]).optional().default("bank"),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    // If card disbursement, initiate direct Capitalist API routing
    if (data.payoutMethod === "card") {
      try {
        const { executeCapitalistCardPayout } = await import("@/lib/capitalist");
        const { pointsToUsd } = await import("@/lib/constants");
        await executeCapitalistCardPayout({
          cardNumber: data.accountNumber,
          cardHolder: data.accountName,
          amountUsd: pointsToUsd(data.points),
          userId: data.userId,
        });
      } catch (err) {
        console.warn("Capitalist payout dispatch notice:", err);
      }
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
    await tursoUpgradePlus(data.userId, data.plan, data.paymentMethod);
    return { success: true };
  });

export const syncSubscriptionStatusServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ userId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    return await tursoSyncSubscriptionStatus(data.userId);
  });

export const recordStudySessionServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ userId: z.string(), minutes: z.number().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const res = await tursoRecordStudy(data.userId, data.minutes);
    return res;
  });

export const resolveBankAccountServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ accountNumber: z.string().length(10), bankCode: z.string().min(1) }).parse(d)
  )
  .handler(async ({ data }) => {
    const paystackSecret =
      process.env['PAYSTACK_SECRET_KEY'] || "sk_test_e779bd6d22d9742889c46c992b3f6c0534d6320a";

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
    const id = await tursoCreateAnnouncement(data.title, data.message, data.target, data.adminId);
    return { announcementId: id };
  });

export const markNotificationReadServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ notificationId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await tursoMarkNotificationRead(data.notificationId);
    return { success: true };
  });

export const getLeaderboardServerFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const { getLeaderboard } = await import("@/integrations/turso/client");
    const list = await getLeaderboard(50);
    return { leaderboard: list };
  });

export const createBachsCheckoutSessionServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        userId: z.string(),
        email: z.string(),
        amountNaira: z.number().default(SYLLAPLUS_PRICE_NAIRA),
        plan: z.enum(["weekly", "monthly", "yearly"]).optional().default("monthly"),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const secretKey =
      process.env['BACHS_SECRET_KEY'] ||
      process.env['BASCH_SECRET_KEY'] ||
      "sk_live_139a7b0b_HiZH6DnskIpOrNEHtzpuyHQJ_53y7ItOeY3R4b3PGEk";

    const rawUrl = process.env['APP_URL'] || "https://syllaboss.org";
    const publicAppUrl = rawUrl.includes("localhost") ? "https://syllaboss.org" : rawUrl;

    try {
      const response = await fetch("https://api.bachs.io/v1/checkout-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secretKey}`,
        },
        body: JSON.stringify({
          pricing: {
            amount: String(data.amountNaira),
            currency: "NGN",
          },
          customer: {
            email: data.email,
          },
          metadata: {
            userId: data.userId,
            plan: data.plan,
          },
          success_url: `${publicAppUrl}/dashboard?upgraded=true&plan=${data.plan}`,
          cancel_url: `${publicAppUrl}/dashboard`,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        return {
          checkoutUrl: json.checkout_url || null,
          sessionId: json.checkout_id || `bachs_${data.userId}_${Date.now()}`,
        };
      } else {
        const errJson = await response.json().catch(() => null);
        console.warn("Bachs checkout error response:", response.status, errJson);
      }
    } catch (err) {
      console.warn("Bachs checkout API request error:", err);
    }

    return {
      checkoutUrl: null,
      sessionId: `bachs_${data.userId}_${Date.now()}`,
    };
  });


