import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getProfile, upsertProfile, isUserAdmin, type Profile } from "@/integrations/turso/client";

export function useProfile() {
  const { user } = useAuth();
  return useQuery<Profile | null>({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60, // 1 minute
    queryFn: async () => {
      if (!user?.id) return null;
      let p = await getProfile(user.id);
      if (!p) {
        // Auto-provision profile in Turso immediately so user never hangs waiting for background sync
        p = await upsertProfile({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata.full_name,
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
