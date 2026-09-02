import { useServerFn } from "@tanstack/react-start";
import {
  Crown,
  CheckCircle2,
  Lock,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SUBSCRIPTION_URL } from "@/components/SubscriptionButtons";
import {
  premiumUrlWithReturn,
  useApplyAccess,
} from "@/lib/membership";
import { resolveApplyUrl } from "@/lib/apply.functions";
import { SmartApplicationForm } from "@/components/SmartApplicationForm";

export const CANDIDATE_PORTAL_URL =
  "https://hiresetu-candidate-portal.lovable.app";

type CtaKind =
  | "apply_now"
  | "premium_membership"
  | "unlock_apply"
  | "save_job"
  | "share_job"
  | "view_job";

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
    // Tracking must never break CTA behaviour.
  }
}

/**
 * Checks whether this logged-in candidate has already submitted
 * an application for this HireSetu job.
 */
export function useHasApplied(jobId?: string | null) {
  const { user } = useAuth();
  const [applied, setApplied] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    if (!user || !jobId) {
      setApplied(false);
      setChecking(false);
      return;
    }

    setChecking(true);

    void supabase
      .from("applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;

        setApplied(Boolean(data));
        setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [user, jobId]);

  return {
    applied,
    checking,
  };
}

/**
 * Main Apply CTA.
 *
 * INTERNAL HIRESETU JOB
 *   membership/trial
 *      ↓
 *   Smart Application Form
 *
 * EXTERNAL JOB
 *   membership/trial
 *      ↓
 *   resolveApplyUrl()
 *      ↓
 *   official company application URL
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

  const {
    canApply,
    trialActive,
    daysRemaining,
    loading,
    refresh,
  } = useApplyAccess();

  const { applied, checking } = useHasApplied(jobId);

  const [unlocking, setUnlocking] = useState(false);
  const [showApplicationForm, setShowApplicationForm] =
    useState(false);

  const resolve = useServerFn(resolveApplyUrl);

  const width = fullWidth ? "w-full" : "";

  /**
   * External/API jobs don't use Smart Application.
   *
   * If externalJobId exists and there is no internal jobId,
   * this is an external job.
   */
  const isExternalJob =
    Boolean(externalJobId) && !Boolean(jobId);

  /**
   * Already applied.
   */
  if (applied && !isExternalJob) {
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

  /**
   * Premium destination.
   */
  const goPremium = () => {
    trackCtaClick({
      cta: "unlock_apply",
      jobId,
      externalJobId,
      userId: user?.id,
      source,
    });

    window.open(
      premiumUrlWithReturn(
        typeof window !== "undefined"
          ? window.location.href
          : undefined,
      ),
      "_blank",
      "noopener,noreferrer",
    );
  };

  /**
   * Access still loading.
   */
  if (loading || checking) {
    return (
      <Button
        size={size}
        disabled
        className={`gradient-primary text-primary-foreground shadow-soft ${width} ${className}`}
      >
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        Apply Now
      </Button>
    );
  }

  /**
   * No active trial / membership.
   */
  if (!canApply) {
    return (
      <Button
        size={size}
        onClick={goPremium}
        title="Membership required to apply"
        className={`gradient-primary text-primary-foreground shadow-soft ${width} ${className}`}
      >
        <Lock className="mr-1.5 h-4 w-4" />
        Unlock Apply
      </Button>
    );
  }

  /**
   * Successful Smart Application submission.
   */
  const handleApplicationSuccess = () => {
    setShowApplicationForm(false);

    toast.success("Application submitted successfully");

    // Refresh access + applied state consumers.
    void refresh();
  };

  /**
   * INTERNAL JOB
   *
   * Do NOT redirect to candidate portal.
   * Open Smart Application inside HireSetu.
   */
  const openSmartApplication = () => {
    if (!jobId) {
      toast.error("Job information is missing");
      return;
    }

    trackCtaClick({
      cta: "apply_now",
      jobId,
      userId: user?.id,
      source,
    });

    setShowApplicationForm(true);
  };

  /**
   * EXTERNAL JOB
   *
   * Preserve the existing official-company Apply flow.
   */
  const openExternalApplication = async () => {
    if (!externalJobId) {
      toast.error("Application information is missing");
      return;
    }

    setUnlocking(true);

    const tab = window.open(
      "",
      "_blank",
      "noopener,noreferrer",
    );

    try {
      trackCtaClick({
        cta: "apply_now",
        externalJobId,
        userId: user?.id,
        source,
      });

      const res = await resolve({
        data: {
          externalJobId,
        },
      });

      if (res.ok) {
        if (tab) {
          tab.location.href = res.url;
        } else {
          window.open(
            res.url,
            "_blank",
            "noopener,noreferrer",
          );
        }

        return;
      }

      tab?.close();

      if (res.reason === "membership_required") {
        void refresh();

        toast.error(
          "Your free trial has ended — membership required to apply",
        );

        goPremium();
      } else if (res.reason === "closed") {
        toast.error(
          "Applications for this job are closed",
        );
      } else {
        toast.error(
          "This job is no longer available",
        );
      }
    } catch {
      tab?.close();

      toast.error(
        "Couldn't open the application page",
      );
    } finally {
      setUnlocking(false);
    }
  };

  /**
   * Smart Application UI.
   *
   * We render it directly underneath the CTA instead of navigating
   * away from the HireSetu job page.
   */
  if (showApplicationForm && jobId && !isExternalJob) {
    return (
      <div className={width}>
        <SmartApplicationForm
          jobId={jobId}
          onSuccess={handleApplicationSuccess}
        />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 w-full"
          onClick={() =>
            setShowApplicationForm(false)
          }
        >
          Cancel Application
        </Button>
      </div>
    );
  }

  /**
   * Main CTA.
   */
  return (
    <Button
      size={size}
      disabled={unlocking}
      onClick={() => {
        if (isExternalJob) {
          void openExternalApplication();
        } else {
          openSmartApplication();
        }
      }}
      className={`gradient-primary text-primary-foreground shadow-soft ${width} ${className}`}
    >
      {unlocking ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle2 className="mr-1.5 h-4 w-4" />
      )}

      {isExternalJob
        ? "Apply on Company Site"
        : "Apply Now"}

      {isExternalJob ? (
        <ArrowRight className="ml-1.5 h-4 w-4" />
      ) : trialActive ? (
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
      className={`border-amber-500/50 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400 ${
        fullWidth ? "w-full" : ""
      } ${className}`}
    >
      <a
        href={SUBSCRIPTION_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          trackCtaClick({
            cta: "premium_membership",
            jobId,
            userId: user?.id,
            source,
          })
        }
      >
        <Crown className="mr-1.5 h-4 w-4" />
        {label}
      </a>
    </Button>
  );
}

/**
 * Side-by-side CTA row.
 */
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
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
    >
      <ApplyNowButton
        jobId={jobId}
        externalJobId={externalJobId}
        size={size}
        source={source}
      />

      <PremiumMembershipButton
        jobId={jobId}
        size={size}
        source={source}
      />
    </div>
  );
}
