import { Building2, Bookmark, MapPin, Briefcase, Wifi, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { ExternalJob } from "@/lib/external-jobs.functions";
import { PremiumMembershipButton, trackCtaClick } from "@/components/JobCta";
import { ExternalJobSocial } from "@/components/ExternalJobSocial";
import { hiresetuExternalJobUrl } from "@/lib/share";


const empLabels: Record<ExternalJob["employment_type"], string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  other: "Other",
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function ExternalJobCard({ job }: { job: ExternalJob }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [externalId] = useState(job.id.split(":").slice(1).join(":"));

  useEffect(() => {
    if (!user) return;
    supabase
      .from("saved_external_jobs")
      .select("id")
      .eq("user_id", user.id)
      .eq("source", job.source)
      .eq("external_id", externalId)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, job.source, externalId]);

  const toggleSave = async () => {
    if (!user) {
      toast.info("Sign in to save jobs", { action: { label: "Sign in", onClick: () => (window.location.href = "/auth") } });
      return;
    }
    if (saved) {
      setSaved(false);
      await supabase.from("saved_external_jobs").delete().eq("user_id", user.id).eq("source", job.source).eq("external_id", externalId);
      toast("Removed from saved");
    } else {
      setSaved(true);
      const { error } = await supabase.from("saved_external_jobs").insert({
        user_id: user.id,
        source: job.source,
        external_id: externalId,
        payload: job as any,
      });
      if (error) {
        setSaved(false);
        toast.error("Couldn't save job");
      } else toast.success("Saved");
    }
  };

  return (
    <Card className="group overflow-hidden border-border/70 bg-card shadow-soft transition-all hover:shadow-elevated">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 to-primary/5">
            {job.company_logo ? (
              <img src={job.company_logo} alt="" className="h-12 w-12 object-cover" loading="lazy" />
            ) : (
              <Building2 className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{job.company}</span>
              <span>· {timeAgo(job.posted_at)}</span>
            </div>
            <h3 className="mt-0.5 truncate font-display text-lg font-semibold leading-snug tracking-tight">
              {job.title}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
              <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{empLabels[job.employment_type]}</span>
              {job.salary && <span className="font-semibold text-foreground">{job.salary}</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.remote ? (
                <Badge variant="secondary" className="rounded-full"><Wifi className="mr-1 h-3 w-3" />Remote</Badge>
              ) : (
                <Badge variant="secondary" className="rounded-full">On-site</Badge>
              )}
              <Badge variant="outline" className={`rounded-full ${job.source === "adzuna" ? "border-blue-500/40 text-blue-600 dark:text-blue-400" : "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"}`}>
                {job.source === "adzuna" ? "Adzuna" : "Remotive"}
              </Badge>
              {job.tags.slice(0, 2).map((t) => (
                <Badge key={t} variant="outline" className="rounded-full">{t}</Badge>
              ))}
            </div>
            {job.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{job.description}</p>}
          </div>
          <button onClick={toggleSave} className="text-muted-foreground hover:text-primary" aria-label="Save job">
            <Bookmark className={`h-5 w-5 ${saved ? "fill-primary text-primary" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-1.5 border-t bg-muted/30 px-2 py-2 sm:px-3">
        <ExternalJobSocial
          source={job.source}
          externalId={externalId}
          share={{
            title: job.title,
            company: job.company,
            location: job.location,
            employmentType: empLabels[job.employment_type],
            url: hiresetuExternalJobUrl(job.id),
          }}
        />
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
        <PremiumMembershipButton source="external_job_card" label="Premium" />
        <Button
          asChild
          size="sm"
          className="gradient-primary text-primary-foreground shadow-soft"
          onClick={() => trackCtaClick({ cta: "apply_now", externalJobId: externalId, userId: user?.id, source: "external_job_card" })}
        >
          <a href={job.url} target="_blank" rel="noopener noreferrer">
            Apply Now <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </a>
        </Button>
        </div>
      </div>

    </Card>
  );
}
