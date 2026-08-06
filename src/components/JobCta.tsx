import { Crown, Send, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SUBSCRIPTION_URL } from "@/components/SubscriptionButtons";

export const CANDIDATE_PORTAL_URL = "https://hiresetu-candidate-portal.lovable.app";

type CtaKind = "apply_now" | "premium_membership";

/** Fire-and-forget CTA click tracking. Never blocks navigation. */
export function trackCtaClick(opts: {
  cta: CtaKind;
  jobId?: string | null;
  externalJobId?: string | null;
  userId?: string | null;
  source?: string;
}) {
  try {
    void supabase
      .from("cta_clicks")
      .insert({
        cta: opts.cta,
        job_id: opts.jobId ?? null,
        external_job_id: opts.externalJobId ?? null,
        user_id: opts.userId ?? null,
        source: opts.source ?? null,
      })
      .then(() => {});
  } catch {
    /* tracking must never break the CTA */
  }
}

/**
 * Reliable "already applied" check: only true when a row exists in our own
 * applications table for this user + job. Opening the external candidate
 * portal never sets this. Architecture is ready for future portal sync —
 * the portal only needs to write an applications row for the same job id.
 */
export function useHasApplied(jobId?: string | null) {
  const { user } = useAuth();
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user || !jobId) {
      setApplied(false);
      return;
    }
    supabase
      .from("applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setApplied(!!data);
      });
    return () => {
      active = false;
    };
  }, [user, jobId]);

  return applied;
}

function portalUrl(jobId?: string | null) {
  if (!jobId) return CANDIDATE_PORTAL_URL;
  const url = new URL(CANDIDATE_PORTAL_URL);
  url.searchParams.set("job_id", jobId);
  return url.toString();
}

export function ApplyNowButton({
  jobId,
  externalJobId,
  size = "sm",
  className = "",
  source,
  fullWidth = false,
}: {
  jobId?: string | null;
  externalJobId?: string | null;
  size?: "sm" | "default" | "lg";
  className?: string;
  source?: string;
  fullWidth?: boolean;
}) {
  const { user } = useAuth();
  const applied = useHasApplied(jobId);

  if (applied) {
    return (
      <Button
        size={size}
        disabled
        aria-disabled="true"
        className={`border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 opacity-100 hover:bg-emerald-500/10 dark:text-emerald-400 ${fullWidth ? "w-full" : ""} ${className}`}
      >
        <CheckCircle2 className="mr-1.5 h-4 w-4" />
        Already Applied
      </Button>
    );
  }

  return (
    <Button
      asChild
      size={size}
      className={`gradient-primary text-primary-foreground shadow-soft ${fullWidth ? "w-full" : ""} ${className}`}
    >
      <a
        href={portalUrl(jobId)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackCtaClick({ cta: "apply_now", jobId, externalJobId, userId: user?.id, source })}
      >
        <Send className="mr-1.5 h-4 w-4" />
        Apply Now
      </a>
    </Button>
  );
}

export function PremiumMembershipButton({
  jobId,
  size = "sm",
  className = "",
  source,
  fullWidth = false,
  label = "Premium Membership",
}: {
  jobId?: string | null;
  size?: "sm" | "default" | "lg";
  className?: string;
  source?: string;
  fullWidth?: boolean;
  label?: string;
}) {
  const { user } = useAuth();
  return (
    <Button
      asChild
      size={size}
      variant="outline"
      className={`border-amber-500/50 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400 ${fullWidth ? "w-full" : ""} ${className}`}
    >
      <a
        href={SUBSCRIPTION_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackCtaClick({ cta: "premium_membership", jobId, userId: user?.id, source })}
      >
        <Crown className="mr-1.5 h-4 w-4" />
        {label}
      </a>
    </Button>
  );
}

/** Side-by-side CTA row used on cards and job details. */
export function JobCtaRow({
  jobId,
  externalJobId,
  size = "sm",
  source,
  className = "",
}: {
  jobId?: string | null;
  externalJobId?: string | null;
  size?: "sm" | "default" | "lg";
  source?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <ApplyNowButton jobId={jobId} externalJobId={externalJobId} size={size} source={source} />
      <PremiumMembershipButton jobId={jobId} size={size} source={source} />
    </div>
  );
}
