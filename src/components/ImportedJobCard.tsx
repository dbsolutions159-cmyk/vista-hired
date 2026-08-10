import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bookmark, Briefcase, Building2, CheckCircle2, ExternalLink, Flag, MapPin, Wifi } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PremiumMembershipButton, trackCtaClick } from "@/components/JobCta";
import { ShareJobMenu } from "@/components/ShareJobMenu";
import { hiresetuExternalJobUrl } from "@/lib/share";


/** Imported job as exposed publicly — the apply URL stays server-side. */
export type ImportedJob = Omit<Tables<"external_jobs">, "apply_url">;

const empLabels: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};

const sourceLabels: Record<string, string> = {
  adzuna: "Adzuna",
  remotive: "Remotive",
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  workable: "Workable",
  smartrecruiters: "SmartRecruiters",
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function ImportedJobCard({ job }: { job: ImportedJob }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [reported, setReported] = useState(false);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("saved_external_jobs")
      .select("id")
      .eq("user_id", user.id)
      .eq("source", job.source)
      .eq("external_id", job.external_id)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, job.source, job.external_id]);

  const toggleSave = async () => {
    if (!user) {
      toast.info("Sign in to save jobs", { action: { label: "Sign in", onClick: () => (window.location.href = "/auth") } });
      return;
    }
    if (saved) {
      setSaved(false);
      await supabase.from("saved_external_jobs").delete().eq("user_id", user.id).eq("source", job.source).eq("external_id", job.external_id);
      toast("Removed from saved");
    } else {
      setSaved(true);
      const { error } = await supabase.from("saved_external_jobs").insert({
        user_id: user.id,
        source: job.source,
        external_id: job.external_id,
        external_job_id: job.id,
        payload: job as never,
      });
      if (error) {
        setSaved(false);
        toast.error("Couldn't save job");
      } else toast.success("Saved");
    }
  };

  const shareInfo = {
    title: job.title,
    company: job.company_name,
    location: job.location_text,
    employmentType: empLabels[job.employment_type] ?? "Full-time",
    url: hiresetuExternalJobUrl(job.id),
    verified: job.verified,
  };


  const report = async () => {
    if (!user) {
      toast.info("Sign in to report a job");
      return;
    }
    setReported(true);
    const { error } = await supabase.from("job_reports").insert({
      user_id: user.id,
      external_job_id: job.id,
      reason: "flagged_by_user",
    });
    if (error) {
      setReported(false);
      toast.error("Couldn't send report");
    } else toast.success("Thanks — our team will review this listing");
  };

  return (
    <Card className="group overflow-hidden border-border/70 bg-card shadow-soft transition-all hover:shadow-elevated">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 to-primary/5">
            {job.company_logo_url ? (
              <img src={job.company_logo_url} alt={`${job.company_name} logo`} className="h-12 w-12 object-cover" loading="lazy" decoding="async" />
            ) : (
              <Building2 className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{job.company_name}</span>
              {job.verified && (
                <span className="inline-flex items-center gap-0.5 text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </span>
              )}
              <span>· {timeAgo(job.published_at)}</span>
            </div>
            <Link to="/jobs/external/$id" params={{ id: job.id }} className="block">
              <h3 className="mt-0.5 truncate font-display text-lg font-semibold leading-snug tracking-tight hover:text-primary">{job.title}</h3>
            </Link>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location_text}</span>
              <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{empLabels[job.employment_type] ?? "Full-time"}</span>
              {job.experience && <span>{job.experience}</span>}
              {job.salary_text && <span className="font-semibold text-foreground">{job.salary_text}</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.remote_type === "remote" ? (
                <Badge variant="secondary" className="rounded-full"><Wifi className="mr-1 h-3 w-3" />Remote India</Badge>
              ) : job.remote_type === "hybrid" ? (
                <Badge variant="secondary" className="rounded-full">Hybrid</Badge>
              ) : (
                <Badge variant="secondary" className="rounded-full">On-site</Badge>
              )}
              {job.category && <Badge variant="outline" className="rounded-full">{job.category}</Badge>}
              <Badge variant="outline" className="rounded-full border-primary/40 text-primary">
                {sourceLabels[job.source] ?? job.source}
              </Badge>
              {job.skills.slice(0, 3).map((s) => (
                <Badge key={s} variant="outline" className="rounded-full">{s}</Badge>
              ))}
            </div>
            {job.summary && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{job.summary}</p>}
            {job.benefits && (
              <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Benefits: </span>
                {job.benefits.replace(/\s+/g, " ").slice(0, 120)}
              </p>
            )}
          </div>
          <button onClick={toggleSave} className="text-muted-foreground hover:text-primary" aria-label="Save job">
            <Bookmark className={`h-5 w-5 ${saved ? "fill-primary text-primary" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1.5 border-t bg-muted/30 px-3 py-2">
        <ShareJobMenu job={shareInfo} />
        <Button variant="ghost" size="sm" onClick={report} disabled={reported} aria-label="Report job">

          <Flag className="h-4 w-4" />
        </Button>
        <PremiumMembershipButton source="imported_job_card" label="Premium" />
        <Button
          asChild
          size="sm"
          className="gradient-primary text-primary-foreground shadow-soft"
          onClick={() => trackCtaClick({ cta: "apply_now", externalJobId: job.id, userId: user?.id, source: "imported_job_card" })}
        >
          <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
            Apply Now <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </Card>
  );
}
