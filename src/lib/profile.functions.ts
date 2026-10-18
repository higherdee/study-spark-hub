import { createServerFn } from "@tanstack/react-start";
import { getProfile, upsertProfile, isUserAdmin, type Profile } from "@/integrations/turso/client";

export const getProfileServerFn = createServerFn({ method: "GET" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }): Promise<Profile | null> => {
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
    return await upsertProfile(data);
  });

export const isUserAdminServerFn = createServerFn({ method: "GET" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }): Promise<boolean> => {
    return await isUserAdmin(data.userId);
  });
