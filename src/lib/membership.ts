import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getApplyAccess } from "@/lib/trial.functions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SUBSCRIPTION_URL } from "@/components/SubscriptionButtons";

export const PREMIUM_URL = SUBSCRIPTION_URL;

/** Membership states supported across the marketplace UI. */
export type MembershipState = "visitor" | "non_member" | "active" | "expired";

/**
 * Premium portal link that remembers where the member came from, so the
 * architecture supports returning to the same job after purchase.
 */
export function premiumUrlWithReturn(returnUrl?: string) {
  const url = new URL(PREMIUM_URL);
  if (returnUrl) url.searchParams.set("return_to", returnUrl);
  return url.toString();
}

/**
 * Reads the signed-in user's membership row. Access to the actual application
 * URL is never decided here — the server re-verifies membership before it
 * releases any apply link. This hook only drives presentation.
 */
export function useMembership() {
  const { user, loading } = useAuth();

  const q = useQuery({
    enabled: !!user,
    queryKey: ["membership", user?.id],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("memberships")
        .select("status, plan, expires_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data ?? null;
    },
  });

  let state: MembershipState = "visitor";
  if (user) {
    const m = q.data;
    if (!m) state = "non_member";
    else if (m.status === "active" && (!m.expires_at || new Date(m.expires_at) > new Date())) state = "active";
    else state = "expired";
  }

  return {
    state,
    membership: q.data ?? null,
    isActive: state === "active",
    loading: loading || (!!user && q.isLoading),
  };
}

/* ------------------------------------------------------------------ */
/* Server-verified apply access (paid membership OR 3-day free trial)  */
/* ------------------------------------------------------------------ */

/**
 * Reads the server's verdict on Apply access. The browser never decides:
 * trial expiry is evaluated against database time on every call.
 */
export function useApplyAccess() {
  const { user, loading } = useAuth();
  const fetchAccess = useServerFn(getApplyAccess);

  const q = useQuery({
    enabled: !!user,
    queryKey: ["apply-access", user?.id],
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: () => fetchAccess({ data: undefined as never }),
  });

  const a = q.data ?? null;
  const daysRemaining =
    a?.trialActive && a.trial
      ? Math.max(0, Math.ceil((new Date(a.trial.trial_end_at).getTime() - new Date(a.now).getTime()) / 86_400_000))
      : 0;

  const msLeft =
    a?.trialActive && a.trial
      ? Math.max(0, new Date(a.trial.trial_end_at).getTime() - new Date(a.now).getTime())
      : 0;
  const hoursRemaining = Math.max(0, Math.ceil(msLeft / 3_600_000));

  return {
    access: a,
    hoursRemaining,
    canApply: !!a?.canApply,
    membershipActive: !!a?.membershipActive,
    trialActive: !!a?.trialActive,
    trialExpired: a?.trial?.trial_status === "expired",
    trialEndsAt: a?.trial?.trial_end_at ?? null,
    trialStartedAt: a?.trial?.trial_start_at ?? null,
    daysRemaining,
    loading: loading || (!!user && q.isLoading),
    refresh: q.refetch,
  };
}
