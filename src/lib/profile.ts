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
      institution: null,
      course: null,
      department: null,
      points: 200,
      streak_days: 1,
      sylla_plus: false,
      onboarding_step: 0,
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
      try {
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
      } catch (err) {
        console.error("Profile query fallback:", err);
        return optimisticProfile;
      }
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
