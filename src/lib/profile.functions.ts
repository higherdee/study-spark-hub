import { createServerFn } from "@tanstack/react-start";
import { getProfile, upsertProfile, isUserAdmin, turso, type Profile } from "@/integrations/turso/client.server";
import { requireCurrentUserId, requireSelfOrAdmin } from "@/lib/auth.server";

export const getAdminDashboardDataServerFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const { requireAdmin } = await import("@/lib/auth.server");
    await requireAdmin();
    const [profiles, materials, withdrawals] = await Promise.all([
      turso.execute("SELECT id, created_at, referral_source, institution, points, onboarding_step FROM profiles"),
      turso.execute("SELECT id, created_at, status, material_type, course, page_count, points_awarded, downloads, verification_score FROM materials"),
      turso.execute("SELECT created_at, status, amount_naira, points FROM withdrawals"),
    ]);
    return { profiles: profiles.rows, materials: materials.rows, withdrawals: withdrawals.rows };
  });

export const getAdminUsersServerFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const { requireAdmin } = await import("@/lib/auth.server");
    await requireAdmin();
    const [profiles, roles, materials] = await Promise.all([
      turso.execute("SELECT * FROM profiles ORDER BY created_at DESC LIMIT 1000"),
      turso.execute("SELECT user_id FROM user_roles WHERE role = 'admin'"),
      turso.execute("SELECT user_id, status FROM materials LIMIT 5000"),
    ]);
    return { profiles: profiles.rows, adminIds: roles.rows.map((r) => String(r['user_id'])), materials: materials.rows };
  });

export const getAdminWithdrawalsServerFn = createServerFn({ method: "GET" })
  .validator((data: { status: "pending" | "paid" | "rejected" | "all" }) => data)
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/auth.server");
    await requireAdmin();
    const result = data.status === "all"
      ? await turso.execute("SELECT * FROM withdrawals ORDER BY created_at DESC LIMIT 500")
      : await turso.execute({
          sql: "SELECT * FROM withdrawals WHERE status = ? ORDER BY created_at DESC LIMIT 500",
          args: [data.status],
        });
    return result.rows;
  });

export const getProfileServerFn = createServerFn({ method: "GET" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }): Promise<Profile | null> => {
    await requireSelfOrAdmin(data.userId);
    return await getProfile(data.userId);
  });

export const upsertProfileServerFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      id: string;
      email?: string | null | undefined;
      full_name?: string | null | undefined;
      username?: string | null | undefined;
      avatar_url?: string | null | undefined;
      institution?: string | null | undefined;
      course?: string | null | undefined;
      department?: string | null | undefined;
      level?: string | null | undefined;
      phone?: string | null | undefined;
      referral_source?: string | null | undefined;
      study_plan?: Record<string, unknown> | undefined;
      onboarding_step?: number | undefined;
      referred_by?: string | null | undefined;
    }) => d
  )
  .handler(async ({ data }): Promise<Profile> => {
    await requireSelfOrAdmin(data.id);
    return await upsertProfile(data);
  });

export const isUserAdminServerFn = createServerFn({ method: "GET" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }): Promise<boolean> => {
    const userId = await requireCurrentUserId();
    return userId === data.userId && await isUserAdmin(userId);
  });

