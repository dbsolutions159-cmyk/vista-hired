import {
  createFileRoute,
  Link,
  useParams,
  notFound,
} from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Briefcase,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  employmentTypeLabels,
  formatSalary,
  timeAgo,
  workTypeLabels,
  JOB_COLUMNS,
} from "@/lib/jobs";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ApplyNowButton,
  PremiumMembershipButton,
} from "@/components/JobCta";
import { ShareJobMenu } from "@/components/ShareJobMenu";
import {
  SHARE_BANNER_URL,
  hiresetuJobUrl,
} from "@/lib/share";
import { incrementJobView } from "@/lib/jobs.functions";

const SITE_URL = "https://hiresetu-ai.lovable.app";

export const Route = createFileRoute("/jobs/$id")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("jobs")
      .select(JOB_COLUMNS)
      .is("deleted_at", null)
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

    const raw = (job.description || "")
      .replace(/\s+/g, " ")
      .trim();

    const shortDesc =
      raw.length > 140
        ? raw.slice(0, 137) + "…"
        : raw;

    const description =
      `${descBits}. ${shortDesc} Apply now on HireSetu.`.slice(
        0,
        300,
      );

    const coverCandidate = (job as any)
      .cover_image_url as string | undefined;

    const image =
      coverCandidate &&
      /^https?:\/\//.test(coverCandidate)
        ? coverCandidate
        : SHARE_BANNER_URL;

    return {
      meta: [
        { title },

        {
          name: "description",
          content: description,
        },

        {
          property: "og:title",
          content: title,
        },

        {
          property: "og:description",
          content: description,
        },

        {
          property: "og:type",
          content: "article",
        },

        {
          property: "og:url",
          content: url,
        },

        {
          property: "og:image",
          content: image,
        },

        {
          property: "og:image:width",
          content: "1200",
        },

        {
          property: "og:image:height",
          content: "630",
        },

        {
          property: "og:site_name",
          content: "HireSetu",
        },

        {
          name: "twitter:card",
          content: "summary_large_image",
        },

        {
          name: "twitter:title",
          content: title,
        },

        {
          name: "twitter:description",
          content: description,
        },

        {
          name: "twitter:image",
          content: image,
        },
      ],

      links: [
        {
          rel: "canonical",
          href: url,
        },
      ],

      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "JobPosting",

            title: job.title,

            description: job.description,

            datePosted: job.created_at,

            employmentType:
              employmentTypeLabels[
                job.employment_type
              ],

            hiringOrganization: {
              "@type": "Organization",
              name: job.company_name,
              logo:
                job.company_logo_url ||
                undefined,
            },

            jobLocation: {
              "@type": "Place",
              address: {
                "@type": "PostalAddress",
                addressLocality: job.location,
              },
            },

            baseSalary: job.salary_min
              ? {
                  "@type": "MonetaryAmount",
                  currency:
                    job.salary_currency || "INR",

                  value: {
                    "@type":
                      "QuantitativeValue",

                    minValue:
                      job.salary_min,

                    maxValue:
                      job.salary_max ||
                      job.salary_min,

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
    <div className="mx-auto max-w-3xl p-10 text-center text-muted-foreground">
      Job not found.
    </div>
  ),

  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl p-10 text-center text-muted-foreground">
      Couldn't load this job. {error.message}
    </div>
  ),
});

function JobDetail() {
  const { id } = useParams({
    from: "/jobs/$id",
  });

  const { job } = Route.useLoaderData();

  useEffect(() => {
    if (id) {
      void incrementJobView({
        data: { jobId: id },
      }).catch(() => {});
    }
  }, [id]);

  return (
    <div className="mx-auto w-full max-w-4xl px-3 py-5 sm:px-4 sm:py-8">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>

      <Card className="overflow-hidden shadow-soft">
        {(job as any).cover_image_url && (
          <img
            src={(job as any).cover_image_url}
            alt=""
            className="h-40 w-full object-cover sm:h-64"
          />
        )}

        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border bg-gradient-to-br from-primary/10 to-primary/5 sm:h-14 sm:w-14">
              {job.company_logo_url ? (
                <img
                  src={job.company_logo_url}
                  alt=""
                  className="h-12 w-12 rounded-xl object-cover sm:h-14 sm:w-14"
                />
              ) : (
                <Building2 className="h-6 w-6 text-primary" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground sm:text-sm">
                {job.company_name} ·{" "}
                {timeAgo(job.created_at)}
              </div>

              <h1 className="mt-1 break-words font-display text-xl font-bold tracking-tight sm:text-3xl">
                {job.title}
              </h1>

              <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-4">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {job.location}
                </span>

                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-4 w-4 shrink-0" />
                  {job.experience ||
                    "Any experience"}
                </span>

                <span className="font-semibold text-foreground">
                  {formatSalary(job)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge
                  variant="secondary"
                  className="rounded-full"
                >
                  {workTypeLabels[
                    job.work_type
                  ]}
                </Badge>

                <Badge
                  variant="secondary"
                  className="rounded-full"
                >
                  {
                    employmentTypeLabels[
                      job.employment_type
                    ]
                  }
                </Badge>

                {job.category && (
                  <Badge
                    variant="outline"
                    className="rounded-full"
                  >
                    {job.category}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {(job as any).video_url && (
            <video
              src={(job as any).video_url}
              controls
              playsInline
              className="mt-5 w-full rounded-xl border bg-black sm:mt-6"
            />
          )}

          <div className="prose prose-sm dark:prose-invert mt-5 max-w-none whitespace-pre-wrap text-foreground/90 sm:mt-6">
            {job.description}
          </div>

          {(job as any).responsibilities && (
            <Section
              title="Responsibilities"
              body={(job as any).responsibilities}
            />
          )}

          {(job as any).qualification && (
            <Section
              title="Qualification"
              body={(job as any).qualification}
            />
          )}

          {(job as any).benefits && (
            <Section
              title="Benefits"
              body={(job as any).benefits}
            />
          )}

          {Array.isArray(
            (job as any).skills,
          ) &&
            (job as any).skills.length > 0 && (
              <div className="mt-5 sm:mt-6">
                <div className="mb-1.5 text-sm font-semibold">
                  Skills
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(job as any).skills.map(
                    (s: string) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="rounded-full"
                      >
                        {s}
                      </Badge>
                    ),
                  )}
                </div>
              </div>
            )}

          <div className="mt-6 rounded-2xl border bg-muted/30 p-3 sm:mt-8 sm:p-4">
            <div className="mb-3">
              <div className="text-sm font-semibold sm:text-base">
                Ready to apply?
              </div>

              <div className="mt-0.5 text-xs text-muted-foreground">
                Apply directly for this{" "}
                {job.company_name} position
                through HireSetu.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <ApplyNowButton
                jobId={job.id}
                jobTitle={job.title}
                companyName={
                  job.company_name
                }
                size="lg"
                source="job_detail"
                fullWidth
              />

              <PremiumMembershipButton
                jobId={job.id}
                size="lg"
                source="job_detail"
                fullWidth
              />
            </div>

            <div className="mt-3">
              <ShareJobMenu
                variant="outline"
                label="Share"
                job={{
                  title: job.title,
                  company:
                    job.company_name,
                  location:
                    job.location,
                  employmentType:
                    employmentTypeLabels[
                      job.employment_type
                    ] ?? "Full-time",
                  url: hiresetuJobUrl(
                    job.id,
                  ),
                  verified:
                    (job as any)
                      .verified ?? true,
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Mobile sticky CTA */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 sm:hidden">
        <div className="pointer-events-auto flex gap-2 border-t bg-background/95 p-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] backdrop-blur">
          <ApplyNowButton
            jobId={job.id}
            jobTitle={job.title}
            companyName={
              job.company_name
            }
            size="lg"
            source="job_detail_sticky"
            fullWidth
            className="min-w-0 flex-1"
          />

          <PremiumMembershipButton
            jobId={job.id}
            size="lg"
            source="job_detail_sticky"
            fullWidth
            label="Premium"
            className="min-w-0 flex-1"
          />
        </div>
      </div>

      <div className="h-24 sm:hidden" />
    </div>
  );
}

function Section({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="mt-5 sm:mt-6">
      <div className="mb-1.5 text-sm font-semibold">
        {title}
      </div>

      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
        {body}
      </p>
    </div>
  );
}
