import { useQuery } from "@tanstack/react-query";
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
