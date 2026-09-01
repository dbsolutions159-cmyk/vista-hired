import { Crown, Gift, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SUBSCRIPTION_URL } from "@/components/SubscriptionButtons";
import { premiumUrlWithReturn, useApplyAccess } from "@/lib/membership";

const fmt = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : "—";

/**
 * Candidate-facing trial / membership status. Purely presentational — the
 * server re-verifies access on every Apply attempt.
 */
export function TrialStatusCard({ className = "" }: { className?: string }) {
  const { access, membershipActive, trialActive, daysRemaining, trialStartedAt, trialEndsAt, loading } =
    useApplyAccess();

  if (loading || !access) return null;

  if (membershipActive) {
    return (
      <Card className={`border-amber-500/40 bg-amber-500/5 p-4 ${className}`}>
        <div className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
          <Crown className="h-4 w-4" /> Premium Member
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Valid until {access.membership?.expires_at ? fmt(access.membership.expires_at) : "further notice"}
        </p>
      </Card>
    );
  }

  if (trialActive) {
    return (
      <Card className={`border-emerald-500/40 bg-emerald-500/5 p-4 ${className}`}>
        <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
          <Gift className="h-4 w-4" /> 3-Day Free Apply Access
        </div>
        <p className="mt-1 text-sm font-medium">
          Free Apply Access: {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Trial started {fmt(trialStartedAt)} · Valid until {fmt(trialEndsAt)}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Apply to jobs across HireSetu — internal, recruiter and official company listings.
        </p>
      </Card>
    );
  }

  return (
    <Card className={`border-destructive/30 bg-destructive/5 p-4 ${className}`}>
      <div className="flex items-center gap-2 font-semibold">
        <Lock className="h-4 w-4" /> Free Apply Trial Expired
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Your free 3-day Apply access has ended. Choose a HireSetu Membership to continue applying.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Trial started {fmt(trialStartedAt)} · Ended {fmt(trialEndsAt)}
      </p>
      <Button asChild size="sm" className="mt-3 gradient-primary text-primary-foreground">
        <a
          href={premiumUrlWithReturn(typeof window !== "undefined" ? window.location.href : SUBSCRIPTION_URL)}
          target="_blank"
          rel="noopener noreferrer"
        >
          View Membership Plans
        </a>
      </Button>
    </Card>
  );
}
