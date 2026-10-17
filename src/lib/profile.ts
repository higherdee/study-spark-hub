import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getProfile, upsertProfile, isUserAdmin, type Profile } from "@/integrations/turso/client";

export { upsertProfile, type Profile };

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
      sylla_plus: 0,
      onboarding_step: 0,
      suspended: 0,
      avatar_url: user.user_metadata?.avatar_url || null,
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
      let p = await getProfile(user.id);
      if (!p) {
        // Auto-provision profile in Turso immediately
        p = await upsertProfile({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name,
          onboarding_step: 0,
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
      return await isUserAdmin(user.id);
    },
  });
}
