import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ExternalJob = {
  id: string;
  source: "adzuna" | "remotive";
  title: string;
  company: string;
  company_logo: string | null;
  location: string;
  salary: string | null;
  employment_type: "full_time" | "part_time" | "contract" | "internship" | "other";
  remote: boolean;
  description: string;
  url: string;
  tags: string[];
  posted_at: string; // ISO
};

const inputSchema = z
  .object({
    q: z.string().optional(),
    location: z.string().optional(),
    country: z.string().default("in"),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .default({});

function normEmployment(raw?: string | null): ExternalJob["employment_type"] {
  const s = (raw || "").toLowerCase();
  if (s.includes("intern")) return "internship";
  if (s.includes("part")) return "part_time";
  if (s.includes("contract") || s.includes("freelance")) return "contract";
  if (s.includes("full")) return "full_time";
  return "other";
}

function fmtSalary(min?: number | null, max?: number | null, currency = "INR"): string | null {
  if (!min && !max) return null;
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency + " ";
  const fmt = (n: number) => {
    if (currency === "INR") {
      if (n >= 10000000) return `${(n / 10000000).toFixed(1)} Cr`;
      if (n >= 100000) return `${(n / 100000).toFixed(1)} L`;
      return n.toLocaleString("en-IN");
    }
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
    return n.toLocaleString();
  };
  if (min && max && min !== max) return `${sym}${fmt(min)} – ${sym}${fmt(max)}`;
  return `${sym}${fmt((min || max)!)}`;
}

async function fetchAdzuna(params: { q?: string; location?: string; country: string; limit: number }): Promise<ExternalJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(params.country)}/search/1`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", String(Math.min(params.limit, 50)));
  url.searchParams.set("content-type", "application/json");
  url.searchParams.set("max_days_old", "30");
  if (params.q) url.searchParams.set("what", params.q);
  if (params.location) url.searchParams.set("where", params.location);
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const json = (await res.json()) as any;
    const results = Array.isArray(json?.results) ? json.results : [];
    return results.map((r: any): ExternalJob => {
      const loc = r.location?.display_name || r.location?.area?.join(", ") || "";
      const cat = (r.category?.label as string) || "";
      const contract = r.contract_time || r.contract_type;
      const remote = /remote|work from home|wfh/i.test(`${r.title} ${r.description} ${loc}`);
      return {
        id: `adzuna:${r.id}`,
        source: "adzuna",
        title: r.title || "Untitled",
        company: r.company?.display_name || "Unknown company",
        company_logo: null,
        location: loc || "—",
        salary: fmtSalary(r.salary_min, r.salary_max, params.country === "in" ? "INR" : params.country === "gb" ? "GBP" : "USD"),
        employment_type: normEmployment(contract),
        remote,
        description: (r.description || "").replace(/\s+/g, " ").trim(),
        url: r.redirect_url || "#",
        tags: cat ? [cat] : [],
        posted_at: r.created || new Date().toISOString(),
      };
    });
  } catch {
    return [];
  }
}

async function fetchRemotive(params: { q?: string; limit: number }): Promise<ExternalJob[]> {
  const url = new URL("https://remotive.com/api/remote-jobs");
  if (params.q) url.searchParams.set("search", params.q);
  url.searchParams.set("limit", String(params.limit));
  try {
    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const json = (await res.json()) as any;
    const jobs = Array.isArray(json?.jobs) ? json.jobs : [];
    return jobs.map((j: any): ExternalJob => ({
      id: `remotive:${j.id}`,
      source: "remotive",
      title: j.title || "Untitled",
      company: j.company_name || "Unknown company",
      company_logo: j.company_logo || j.company_logo_url || null,
      location: j.candidate_required_location || "Remote",
      salary: j.salary || null,
      employment_type: normEmployment(j.job_type),
      remote: true,
      description: (j.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600),
      url: j.url || "#",
      tags: Array.isArray(j.tags) ? j.tags.slice(0, 6) : [],
      posted_at: j.publication_date || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

function dedupe(jobs: ExternalJob[]): ExternalJob[] {
  const seen = new Set<string>();
  const out: ExternalJob[] = [];
  for (const j of jobs) {
    const key = `${j.company.toLowerCase().trim()}|${j.title.toLowerCase().trim()}|${j.location.toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(j);
  }
  return out;
}

export const fetchExternalJobs = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => inputSchema.parse(data ?? {}))
  .handler(async ({ data }) => {
    const [adzuna, remotive] = await Promise.all([
      fetchAdzuna({ q: data.q, location: data.location, country: data.country, limit: data.limit }),
      fetchRemotive({ q: data.q, limit: data.limit }),
    ]);
    const merged = dedupe([...adzuna, ...remotive]).sort(
      (a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime(),
    );
    return { jobs: merged, counts: { adzuna: adzuna.length, remotive: remotive.length, total: merged.length } };
  });
