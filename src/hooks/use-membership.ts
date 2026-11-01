import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import type { FREE_LIMITS } from "@/lib/membership/policy";
export interface MembershipSnapshot { paid: boolean; limits: typeof FREE_LIMITS | null; responseTokensRemaining: number | null; downloadsRemaining: number | null; retention: { days: number | null; startsAt: string | null } }
export function useMembership() {
  const { user, getToken } = useAuth();
  return useQuery<MembershipSnapshot>({ queryKey: ["membership", user?.id], enabled: !!user, staleTime: 30_000, queryFn: async () => {
    const token = await getToken();
    const response = await fetch("/api/membership", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Membership could not be checked.");
    return result;
  } });
}
