import { createFileRoute, Link, useParams, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, Building2, MapPin, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { employmentTypeLabels, formatSalary, timeAgo, workTypeLabels } from "@/lib/jobs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import ogFallback from "@/assets/hiresetu-og.jpg.asset.json";
import { ApplyNowButton, PremiumMembershipButton } from "@/components/JobCta";
import { incrementJobView } from "@/lib/jobs.functions";



const SITE_URL = "https://hiresetu-ai.lovable.app";

export const Route = createFileRoute("/jobs/$id")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return { job: data };
  },
  head: ({ loaderData }) => {
    const job = loaderData?.job;
    if (!job) {
      return {
        meta: [{ title: "Job not found — HireSetu" }],
      };
    }
    const url = `${SITE_URL}/jobs/${job.id}`;
    const title = `${job.title} at ${job.company_name} — HireSetu`;
    const salary = formatSalary(job);
    const descBits = [
      job.company_name,
      job.location,
      salary !== "Not disclosed" ? salary : null,
      workTypeLabels[job.work_type],
      employmentTypeLabels[job.employment_type],
    ]
      .filter(Boolean)
      .join(" · ");
    const raw = (job.description || "").replace(/\s+/g, " ").trim();
    const shortDesc = raw.length > 140 ? raw.slice(0, 137) + "…" : raw;
    const description = `${descBits}. ${shortDesc} Apply now on HireSetu.`.slice(0, 300);
    const coverCandidate = (job as any).cover_image_url as string | undefined;
    const image = coverCandidate && /^https?:\/\//.test(coverCandidate)
      ? coverCandidate
      : job.company_logo_url && /^https?:\/\//.test(job.company_logo_url)
      ? job.company_logo_url
      : `${SITE_URL}${ogFallback.url}`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:site_name", content: "HireSetu" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
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
            datePosted: job.created_at,
            employmentType: employmentTypeLabels[job.employment_type],
            hiringOrganization: {
              "@type": "Organization",
              name: job.company_name,
              logo: job.company_logo_url || undefined,
            },
            jobLocation: {
              "@type": "Place",
              address: { "@type": "PostalAddress", addressLocality: job.location },
            },
            baseSalary: job.salary_min
              ? {
                  "@type": "MonetaryAmount",
                  currency: job.salary_currency || "INR",
                  value: {
                    "@type": "QuantitativeValue",
                    minValue: job.salary_min,
                    maxValue: job.salary_max || job.salary_min,
                    unitText: "YEAR",
                  },
                }
              : undefined,
            url,
          }),
        },
      ],
    };
  },
  component: JobDetail,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl p-10 text-center text-muted-foreground">Job not found.</div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl p-10 text-center text-muted-foreground">
      Couldn't load this job. {error.message}
    </div>
  ),
});

function JobDetail() {
  const { id } = useParams({ from: "/jobs/$id" });
  const { job } = Route.useLoaderData();

  useEffect(() => {
    if (id) void incrementJobView({ data: { jobId: id } }).catch(() => {});
  }, [id]);


  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to feed</Link>
      <Card className="overflow-hidden shadow-soft">
        {(job as any).cover_image_url && (
          <img src={(job as any).cover_image_url} alt="" className="h-48 w-full object-cover sm:h-64" />
        )}
        <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-xl border bg-gradient-to-br from-primary/10 to-primary/5">
            {job.company_logo_url ? <img src={job.company_logo_url} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <Building2 className="h-6 w-6 text-primary" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-muted-foreground">{job.company_name} · {timeAgo(job.created_at)}</div>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">{job.title}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>
              <span className="inline-flex items-center gap-1"><Briefcase className="h-4 w-4" />{job.experience || "Any experience"}</span>
              <span className="font-semibold text-foreground">{formatSalary(job)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="rounded-full">{workTypeLabels[job.work_type]}</Badge>
              <Badge variant="secondary" className="rounded-full">{employmentTypeLabels[job.employment_type]}</Badge>
              {job.category && <Badge variant="outline" className="rounded-full">{job.category}</Badge>}
            </div>
          </div>
        </div>

        {(job as any).video_url && (
          <video src={(job as any).video_url} controls playsInline className="mt-6 w-full rounded-xl border bg-black" />
        )}

        <div className="prose prose-sm dark:prose-invert mt-6 max-w-none whitespace-pre-wrap text-foreground/90">
          {job.description}
        </div>

        {(job as any).responsibilities && (
          <Section title="Responsibilities" body={(job as any).responsibilities} />
        )}
        {(job as any).qualification && (
          <Section title="Qualification" body={(job as any).qualification} />
        )}
        {(job as any).benefits && (
          <Section title="Benefits" body={(job as any).benefits} />
        )}
        {Array.isArray((job as any).skills) && (job as any).skills.length > 0 && (
          <div className="mt-6">
            <div className="mb-1.5 text-sm font-semibold">Skills</div>
            <div className="flex flex-wrap gap-1.5">
              {(job as any).skills.map((s: string) => (
                <Badge key={s} variant="outline" className="rounded-full">{s}</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 rounded-xl border bg-muted/30 p-4">
          <div className="mb-3 text-sm font-semibold">Ready to take the next step?</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <ApplyNowButton jobId={job.id} size="lg" source="job_detail" fullWidth />
            <PremiumMembershipButton jobId={job.id} size="lg" source="job_detail" fullWidth />
          </div>
        </div>
        </div>
      </Card>

      {/* Sticky mobile CTA */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 sm:hidden">
        <div className="pointer-events-auto flex gap-2 border-t bg-background/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
          <ApplyNowButton jobId={job.id} size="lg" source="job_detail_sticky" fullWidth className="flex-1" />
          <PremiumMembershipButton jobId={job.id} size="lg" source="job_detail_sticky" fullWidth label="Premium" className="flex-1" />
        </div>
      </div>
      <div className="h-24 sm:hidden" />
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

