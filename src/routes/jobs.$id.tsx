import { createFileRoute, Link, useParams, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, Building2, MapPin, Briefcase, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { employmentTypeLabels, formatSalary, timeAgo, workTypeLabels } from "@/lib/jobs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ogFallback from "@/assets/hiresetu-og.jpg.asset.json";

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
    const image = job.company_logo_url && /^https?:\/\//.test(job.company_logo_url)
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
    if (id) supabase.rpc("increment_job_view", { _job_id: id });
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to feed</Link>
      <Card className="p-6 shadow-soft">
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

        <div className="prose prose-sm dark:prose-invert mt-6 max-w-none whitespace-pre-wrap text-foreground/90">
          {job.description}
        </div>

        <div className="mt-8 flex justify-end">
          <Button asChild size="lg" className="gradient-primary text-primary-foreground shadow-soft">
            <Link to="/apply/$id" params={{ id: job.id }}><Send className="mr-2 h-4 w-4" />Apply now</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
