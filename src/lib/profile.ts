import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { Profile } from "@/integrations/turso/client";
import {
  getProfileServerFn,
  upsertProfileServerFn,
  isUserAdminServerFn,
} from "./profile.functions";

export { upsertProfileServerFn, type Profile };

export function useProfile() {
  const { user } = useAuth();

  const optimisticProfile: Profile | null = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || "Scholar",
      username: (user.user_metadata?.full_name || "scholar")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 15),
      institution: "",
      course: "",
      department: "",
      points: 200, // instant starting bonus
      streak_days: 1,
      sylla_plus: false,
      // Default placeholder to 3 so existing completed scholars never see a flash-open-close modal
      onboarding_step: 3,
      suspended: false,
      avatar_url: user.user_metadata?.avatar_url || null,
      study_plan: {},
      referral_code: `SYLLA-${user.id.slice(-6).toUpperCase()}`,
      referred_by: null,
      study_minutes: 0,
      app_installed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, [user]);

  return useQuery<Profile | null>({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60,
    placeholderData: optimisticProfile,
    queryFn: async () => {
      if (!user?.id) return null;
      let p = await getProfileServerFn({ data: { userId: user.id } });
      if (!p) {
        // Auto-provision profile in Turso immediately via server function
        p = await upsertProfileServerFn({
          data: {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name,
            onboarding_step: 0,
          },
        });
      }
      return p;
    },
  });
}

export function useIsAdmin() {
  const { user } = useAuth();
  return useQuery<boolean>({
    queryKey: ["is-admin", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      if (!user?.id) return false;
      return await isUserAdminServerFn({ data: { userId: user.id } });
    },
  });
}
