import { createServerFn } from "@tanstack/react-start";
import type * as Database from "./client.server";

type DatabaseModule = typeof import("./client.server");
type DbMethodName = {
  [K in keyof DatabaseModule]: DatabaseModule[K] extends (...args: any[]) => any ? K : never;
}[keyof DatabaseModule];
type AnyFunction = (...args: any[]) => any;
type Args<K extends DbMethodName> = DatabaseModule[K] extends AnyFunction ? Parameters<DatabaseModule[K]> : never;
type CallInput = { name: DbMethodName; args: unknown[] };

const ADMIN_METHODS = new Set<DbMethodName>([
  "setMaterialStatus", "replyToComplaint", "createAnnouncement", "adminToggleAdmin",
  "adminSetSuspended", "adminAdjustPoints", "adminProcessWithdrawal",
]);
const PUBLIC_METHODS = new Set<DbMethodName>([
  "getMaterials", "getTotalMaterialsCount", "getLeaderboard", "getAnnouncements",
]);

const callDatabaseServerFn = createServerFn({ method: "POST" })
  .validator((value: unknown) => {
    if (!value || typeof value !== "object" || !Array.isArray((value as CallInput).args)) throw new Error("Invalid request");
    return value as CallInput;
  })
  .handler(async ({ data }) => {
    const { requireAdmin, requireCurrentUserId, requireSelfOrAdmin } = await import("@/lib/auth.server");
    const name = data.name;
    const args = [...data.args];
    let actor: string | null = null;

    if (ADMIN_METHODS.has(name)) actor = await requireAdmin();
    else if (PUBLIC_METHODS.has(name)) {
      if (name === "getMaterials" || name === "getTotalMaterialsCount") {
        const params = args[0] as { userId?: string; status?: string } | undefined;
        if (params?.userId) actor = await requireSelfOrAdmin(params.userId);
        else if (params?.status && params.status !== "verified") actor = await requireAdmin();
      }
    } else if (name === "upsertProfile") {
      actor = await requireSelfOrAdmin(String((args[0] as { id?: unknown })?.id ?? ""));
    } else if (name === "createMaterial") {
      actor = await requireSelfOrAdmin(String((args[0] as { user_id?: unknown })?.user_id ?? ""));
    } else if (name === "getComplaints") {
      const params = args[0] as { userId?: string } | undefined;
      actor = params?.userId ? await requireSelfOrAdmin(params.userId) : await requireAdmin();
    } else if (name === "deleteMaterial") {
      actor = await requireSelfOrAdmin(String(args[1] ?? ""));
    } else if (name === "recordMaterialView" || name === "recordMaterialDownload") {
      actor = await requireCurrentUserId();
      if (args[1] && args[1] !== actor) throw new Error("Forbidden");
      args[1] = actor;
    } else if (name === "markNotificationRead") {
      actor = await requireCurrentUserId();
      args.push(actor);
    } else if (name === "getMaterialById") {
      actor = await requireCurrentUserId();
    } else if (name === "isUserAdmin") {
      actor = await requireCurrentUserId();
      if (String(args[0] ?? "") !== actor) throw new Error("Forbidden");
    } else {
      const userIdAtIndex: Partial<Record<DbMethodName, number>> = {
        getProfile: 0, createUserNotification: 0, upgradeToSyllaPlus: 0,
        syncSubscriptionStatus: 0, claimAppInstallBonus: 0, recordStudySession: 0,
        getUserNotifications: 0, getPointsLedger: 0, getWithdrawals: 0,
        rateMaterial: 1, getUserRating: 1, createComplaint: 1, requestWithdrawal: 0,
      };
      const index = userIdAtIndex[name];
      if (typeof index === "number") actor = await requireSelfOrAdmin(String(args[index] ?? ""));
      else throw new Error("This operation is unavailable until its authorization policy is configured.");
    }

    const db = await import("./client.server");
    if (name === "getMaterialById") {
      const material = await db.getMaterialById(String(args[0] ?? ""));
      if (!material) return null;
      if (material.status !== "verified" && material.user_id !== actor) await requireAdmin();
      return material;
    }
    if (name === "upgradeToSyllaPlus") throw new Error("Subscription changes require a verified payment-provider event.");
    const fn = db[name] as unknown as (...values: unknown[]) => unknown;
    return await fn(...args);
  });

function createDatabaseCall<K extends DbMethodName>(name: K) {
  return ((...args: Args<K>) => callDatabaseServerFn({ data: { name, args } })) as unknown as DatabaseModule[K];
}

export type { Profile, Material, PointsLedgerEntry, Withdrawal, Complaint, Announcement, UserNotification, LeaderboardEntry } from "./client.server";
export const getProfile = createDatabaseCall("getProfile");
export const upsertProfile = createDatabaseCall("upsertProfile");
export const createUserNotification = createDatabaseCall("createUserNotification");
export const upgradeToSyllaPlus = createDatabaseCall("upgradeToSyllaPlus");
export const syncSubscriptionStatus = createDatabaseCall("syncSubscriptionStatus");
export const claimAppInstallBonus = createDatabaseCall("claimAppInstallBonus");
export const recordStudySession = createDatabaseCall("recordStudySession");
export const getMaterials = createDatabaseCall("getMaterials");
export const getTotalMaterialsCount = createDatabaseCall("getTotalMaterialsCount");
export const getMaterialById = createDatabaseCall("getMaterialById");
export const createMaterial = createDatabaseCall("createMaterial");
export const deleteMaterial = createDatabaseCall("deleteMaterial");
export const setMaterialStatus = createDatabaseCall("setMaterialStatus");
export const recordMaterialView = createDatabaseCall("recordMaterialView");
export const recordMaterialDownload = createDatabaseCall("recordMaterialDownload");
export const rateMaterial = createDatabaseCall("rateMaterial");
export const getUserRating = createDatabaseCall("getUserRating");
export const createComplaint = createDatabaseCall("createComplaint");
export const getComplaints = createDatabaseCall("getComplaints");
export const replyToComplaint = createDatabaseCall("replyToComplaint");
export const createAnnouncement = createDatabaseCall("createAnnouncement");
export const getAnnouncements = createDatabaseCall("getAnnouncements");
export const getUserNotifications = createDatabaseCall("getUserNotifications");
export const markNotificationRead = createDatabaseCall("markNotificationRead");
export const requestWithdrawal = createDatabaseCall("requestWithdrawal");
export const getPointsLedger = createDatabaseCall("getPointsLedger");
export const getWithdrawals = createDatabaseCall("getWithdrawals");
export const isUserAdmin = createDatabaseCall("isUserAdmin");
export const adminToggleAdmin = createDatabaseCall("adminToggleAdmin");
export const adminSetSuspended = createDatabaseCall("adminSetSuspended");
export const adminAdjustPoints = createDatabaseCall("adminAdjustPoints");
export const getLeaderboard = createDatabaseCall("getLeaderboard");
export const adminProcessWithdrawal = createDatabaseCall("adminProcessWithdrawal");
