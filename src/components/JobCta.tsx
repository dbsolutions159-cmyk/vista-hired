import { useServerFn } from "@tanstack/react-start";
import { Crown, CheckCircle2, Lock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SUBSCRIPTION_URL } from "@/components/SubscriptionButtons";
import { premiumUrlWithReturn, useApplyAccess } from "@/lib/membership";
import { resolveApplyUrl } from "@/lib/apply.functions";

export const CANDIDATE_PORTAL_URL = "https://hiresetu-candidate-portal.lovable.app";

type CtaKind =
  | "apply_now"
  | "premium_membership"
  | "unlock_apply"
  | "save_job"
  | "share_job"
  | "view_job";

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

/**
 * Membership-gated apply button.
 *
 * The destination URL is NEVER rendered for non-members — it is fetched from
 * the server only after it re-verifies an active membership, so the lock
 * cannot be bypassed from the browser.
 */
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
  const { canApply, trialActive, daysRemaining, loading, refresh } = useApplyAccess();
  const applied = useHasApplied(jobId);
  const [unlocking, setUnlocking] = useState(false);
  const resolve = useServerFn(resolveApplyUrl);

  const width = fullWidth ? "w-full" : "";

  if (applied) {
    return (
      <Button
        size={size}
        disabled
        aria-disabled="true"
        className={`border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 opacity-100 hover:bg-emerald-500/10 dark:text-emerald-400 ${width} ${className}`}
      >
        <CheckCircle2 className="mr-1.5 h-4 w-4" />
        Already Applied
      </Button>
    );
  }

  const goPremium = () => {
    trackCtaClick({ cta: "unlock_apply", jobId, externalJobId, userId: user?.id, source });
    // Only the safe public HireSetu URL is carried across, never any
    // client-side "already paid" flag — membership is re-verified server-side.
    window.open(
      premiumUrlWithReturn(typeof window !== "undefined" ? window.location.href : undefined),
      "_blank",
      "noopener,noreferrer",
    );
  };

  // Visitor, non-member and expired trial all keep the URL hidden.
  if (!canApply) {
    return (
      <Button
        size={size}
        onClick={goPremium}
        title="Free trial ended · Membership required to apply"
        className={`gradient-primary text-primary-foreground shadow-soft ${width} ${className}`}
      >
        {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Lock className="mr-1.5 h-4 w-4" />}
        Unlock Apply
      </Button>
    );
  }


  const unlockAndApply = async () => {
    setUnlocking(true);
    // Open synchronously so the browser doesn't treat this as a popup.
    const tab = window.open("", "_blank", "noopener,noreferrer");
    try {
      trackCtaClick({ cta: "apply_now", jobId, externalJobId, userId: user?.id, source });
      const res = await resolve({
        data: jobId ? { jobId } : { externalJobId: externalJobId! },
      });
      if (res.ok) {
        if (tab) tab.location.href = res.url;
        else window.open(res.url, "_blank", "noopener,noreferrer");
      } else {
        tab?.close();
        if (res.reason === "membership_required") {
          void refresh();
          toast.error("Your free trial has ended — membership required to apply");
          goPremium();
        } else if (res.reason === "closed") toast.error("Applications for this job are closed");
        else toast.error("This job is no longer available");
      }
    } catch {
      tab?.close();
      toast.error("Couldn't open the application page");
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <Button
      size={size}
      disabled={unlocking}
      onClick={() => void unlockAndApply()}
      className={`gradient-primary text-primary-foreground shadow-soft ${width} ${className}`}
    >
      {unlocking ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
      Apply Now
      {trialActive ? (
        <span className="ml-1.5 hidden rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold sm:inline">
          Free trial · {daysRemaining}d
        </span>
      ) : null}
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
