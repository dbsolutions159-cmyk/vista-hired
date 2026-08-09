import banner from "@/assets/hiresetu-job-share.jpg.asset.json";

/** Canonical public origin used for every shareable HireSetu URL. */
export const SITE_URL = "https://hiresetu-ai.lovable.app";

/** Absolute URL of the HireSetu-branded social share banner (1200x630). */
export const SHARE_BANNER_URL = `${SITE_URL}${banner.url}`;

/** Public HireSetu page for a manually posted job. */
export function hiresetuJobUrl(jobId: string) {
  return `${SITE_URL}/jobs/${jobId}`;
}

/** Public HireSetu page for an API-imported job. Never the company apply URL. */
export function hiresetuExternalJobUrl(externalJobId: string) {
  return `${SITE_URL}/jobs/external/${externalJobId}`;
}

export type ShareJobInfo = {
  title: string;
  company: string;
  location: string;
  employmentType: string;
  /** HireSetu public job URL — never the official apply URL. */
  url: string;
  verified?: boolean;
};

export function buildShareMessage(job: ShareJobInfo) {
  return [
    "🚀 New Job Opportunity on HireSetu",
    "",
    job.title,
    "",
    `🏢 ${job.company}`,
    `📍 ${job.location}`,
    `💼 ${job.employmentType}`,
    "",
    job.verified === false ? "" : "✓ Verified Opportunity",
    "",
    "Apply on HireSetu:",
    job.url,
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");
}

export function shareTargets(job: ShareJobInfo) {
  const msg = buildShareMessage(job);
  const u = encodeURIComponent(job.url);
  const t = encodeURIComponent(msg);
  const short = encodeURIComponent(`${job.title} at ${job.company} — HireSetu`);
  return {
    whatsapp: `https://wa.me/?text=${t}`,
    telegram: `https://t.me/share/url?url=${u}&text=${encodeURIComponent(msg.replace(job.url, "").trim())}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    x: `https://twitter.com/intent/tweet?url=${u}&text=${short}`,
  };
}
