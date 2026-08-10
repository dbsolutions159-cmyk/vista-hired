import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bookmark,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Flag,
  MapPin,
  Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PremiumMembershipButton, trackCtaClick } from "@/components/JobCta";
import { ShareJobMenu } from "@/components/ShareJobMenu";
import { SHARE_BANNER_URL, SITE_URL, hiresetuExternalJobUrl } from "@/lib/share";
import { EXTERNAL_JOB_COLUMNS } from "@/lib/jobs";

const empLabels: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

const remoteLabels: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
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

export const Route = createFileRoute("/jobs/external/$id")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("external_jobs")
      .select(EXTERNAL_JOB_COLUMNS)
      .eq("id", params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return { job: data };
  },
  head: ({ loaderData, params }) => {
    const job = loaderData?.job;
    const url = hiresetuExternalJobUrl(params.id);
    if (!job) {
      return { meta: [{ title: "Job not found — HireSetu" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${job.title} at ${job.company_name} — HireSetu`;
    const bits = [
      job.company_name,
      job.location_text,
      remoteLabels[job.remote_type] ?? "On-site",
      empLabels[job.employment_type] ?? "Full-time",
      job.salary_text || null,
    ]
      .filter(Boolean)
      .join(" · ");
    const summary = (job.summary || job.description || "").replace(/\s+/g, " ").trim();
    const description = `${bits}. ✓ Verified Opportunity. ${summary.slice(0, 130)} Apply on HireSetu.`.slice(0, 300);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: SHARE_BANNER_URL },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: "HireSetu — Find your next opportunity" },
        { property: "og:site_name", content: "HireSetu" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: SHARE_BANNER_URL },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "JobPosting",
            title: job.title,
            description: job.description,
            datePosted: job.published_at,
            validThrough: job.expires_at || undefined,
            employmentType: empLabels[job.employment_type] ?? "Full-time",
            hiringOrganization: {
              "@type": "Organization",
              name: job.company_name,
              logo: job.company_logo_url || undefined,
              sameAs: job.company_career_url || undefined,
            },
            jobLocation: {
              "@type": "Place",
              address: {
                "@type": "PostalAddress",
                addressLocality: job.city || job.location_text,
                addressRegion: job.state || undefined,
                addressCountry: job.country || "IN",
              },
            },
            url,
          }),
        },
      ],
    };
  },
  component: ExternalJobDetail,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl p-10 text-center text-muted-foreground">
      This job is no longer available.{" "}
      <Link to="/" className="text-primary underline">
        Browse jobs
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl p-10 text-center text-muted-foreground">
      Couldn't load this job. {error.message}
    </div>
  ),
});

function ExternalJobDetail() {
  const { job } = Route.useLoaderData();
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
      toast.info("Sign in to save jobs");
      return;
    }
    if (saved) {
      setSaved(false);
      await supabase
        .from("saved_external_jobs")
        .delete()
        .eq("user_id", user.id)
        .eq("source", job.source)
        .eq("external_id", job.external_id);
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

  const report = async () => {
    if (!user) {
      toast.info("Sign in to report a job");
      return;
    }
    setReported(true);
    const { error } = await supabase
      .from("job_reports")
      .insert({ user_id: user.id, external_job_id: job.id, reason: "flagged_by_user" });
    if (error) {
      setReported(false);
      toast.error("Couldn't send report");
    } else toast.success("Thanks — our team will review this listing");
  };

  const shareInfo = {
    title: job.title,
    company: job.company_name,
    location: job.location_text,
    employmentType: empLabels[job.employment_type] ?? "Full-time",
    url: hiresetuExternalJobUrl(job.id),
    verified: job.verified,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to feed
      </Link>

      <Card className="overflow-hidden shadow-soft">
        <div className="gradient-primary px-6 py-4 text-primary-foreground">
          <div className="font-display text-sm font-semibold tracking-tight">HireSetu</div>
          <div className="text-xs opacity-90">Verified Jobs • Trusted Companies</div>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 to-primary/5">
              {job.company_logo_url ? (
                <img src={job.company_logo_url} alt={`${job.company_name} logo`} className="h-14 w-14 object-cover" />
              ) : (
                <Building2 className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{job.company_name}</span>
                {job.verified && (
                  <span className="inline-flex items-center gap-0.5 text-primary">
                    <CheckCircle2 className="h-4 w-4" /> Verified
                  </span>
                )}
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">{job.title}</h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {job.location_text}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-4 w-4" />
                  {job.experience || "Any experience"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  {new Date(job.published_at).toLocaleDateString()}
                </span>
                {job.salary_text && <span className="font-semibold text-foreground">{job.salary_text}</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="rounded-full">
                  {job.remote_type === "remote" && <Wifi className="mr-1 h-3 w-3" />}
                  {remoteLabels[job.remote_type] ?? "On-site"}
                </Badge>
                <Badge variant="secondary" className="rounded-full">{empLabels[job.employment_type] ?? "Full-time"}</Badge>
                {job.category && <Badge variant="outline" className="rounded-full">{job.category}</Badge>}
                <Badge variant="outline" className="rounded-full border-primary/40 text-primary">
                  Source: {sourceLabels[job.source] ?? job.source}
                </Badge>
              </div>
            </div>
          </div>

          {job.summary && <p className="mt-6 text-sm text-muted-foreground">{job.summary}</p>}

          <div className="prose prose-sm dark:prose-invert mt-6 max-w-none whitespace-pre-wrap text-foreground/90">
            {job.description}
          </div>

          {job.responsibilities && <Section title="Responsibilities" body={job.responsibilities} />}
          {job.requirements && <Section title="Requirements" body={job.requirements} />}
          {job.benefits && <Section title="Benefits" body={job.benefits} />}

          {job.skills?.length > 0 && (
            <div className="mt-6">
              <div className="mb-1.5 text-sm font-semibold">Skills</div>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((s: string) => (
                  <Badge key={s} variant="outline" className="rounded-full">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 rounded-xl border bg-muted/30 p-4">
            <div className="mb-3 text-sm font-semibold">Ready to take the next step?</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                asChild
                size="lg"
                className="w-full gradient-primary text-primary-foreground shadow-soft"
                onClick={() =>
                  trackCtaClick({ cta: "apply_now", externalJobId: job.id, userId: user?.id, source: "external_job_detail" })
                }
              >
                <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
                  Apply Now <ExternalLink className="ml-1.5 h-4 w-4" />
                </a>
              </Button>
              <PremiumMembershipButton size="lg" source="external_job_detail" fullWidth />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={toggleSave}>
                <Bookmark className={`mr-1.5 h-4 w-4 ${saved ? "fill-primary text-primary" : ""}`} />
                {saved ? "Saved" : "Save Job"}
              </Button>
              <ShareJobMenu job={shareInfo} variant="outline" label="Share" />
              <Button variant="outline" size="sm" onClick={report} disabled={reported}>
                <Flag className="mr-1.5 h-4 w-4" /> Report Job
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Apply Now opens the official company application page. HireSetu never redirects you to other job aggregators.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-6">
      <div className="mb-1.5 text-sm font-semibold">{title}</div>
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
