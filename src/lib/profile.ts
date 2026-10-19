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

export function isProfileComplete(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  const hasName = Boolean(profile.full_name && profile.full_name.trim().length > 0);
  const hasUsername = Boolean(
    profile.username &&
      profile.username.trim().length > 0 &&
      !profile.username.startsWith("student_")
  );
  const hasInstitution = Boolean(profile.institution && profile.institution.trim().length > 0);
  const hasCourse = Boolean(profile.course && profile.course.trim().length > 0);
  const stepDone = (profile.onboarding_step ?? 0) >= 3;
  return hasName && hasUsername && hasInstitution && hasCourse && stepDone;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery<Profile | null>({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60,
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
