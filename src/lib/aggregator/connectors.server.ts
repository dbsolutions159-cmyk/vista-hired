/**
 * Modular source connectors. Add a new file, register it in `registry.server.ts`
 * and add a row to `job_sources` — no other code changes required.
 */
import type { Connector, RawJob, SourceConfig } from "./types";

async function getJson(url: string, init?: RequestInit, retries = 2): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { Accept: "application/json", "User-Agent": "HireSetu/1.0 (+https://hiresetu-ai.lovable.app)", ...(init?.headers ?? {}) },
        signal: AbortSignal.timeout(20_000),
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/* ------------------------------- Adzuna ---------------------------------- */
export const adzunaConnector: Connector = {
  id: "adzuna",
  label: "Adzuna",
  logo: null,
  requiresEnv: ["ADZUNA_APP_ID", "ADZUNA_APP_KEY"],
  async fetchJobs(source) {
    const appId = process.env["ADZUNA_APP_ID"];
    const appKey = process.env["ADZUNA_APP_KEY"];
    if (!appId || !appKey) throw new Error("ADZUNA_APP_ID / ADZUNA_APP_KEY not configured");
    const country = source.board_token || "in";
    const out: RawJob[] = [];
    for (const page of [1, 2]) {
      const url = new URL(`https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(country)}/search/${page}`);
      url.searchParams.set("app_id", appId);
      url.searchParams.set("app_key", appKey);
      url.searchParams.set("results_per_page", "50");
      url.searchParams.set("max_days_old", "30");
      url.searchParams.set("content-type", "application/json");
      const json = await getJson(url.toString());
      for (const r of json?.results ?? []) {
        out.push({
          external_id: String(r.id),
          title: r.title ?? "",
          company_name: r.company?.display_name ?? "",
          apply_url: r.redirect_url ?? "",
          location_text: r.location?.display_name ?? (r.location?.area ?? []).join(", "),
          description: r.description ?? "",
          category: r.category?.label ?? null,
          employment_type_hint: r.contract_time ?? r.contract_type ?? null,
          salary_min: r.salary_min ? Math.round(r.salary_min) : null,
          salary_max: r.salary_max ? Math.round(r.salary_max) : null,
          salary_currency: country === "in" ? "INR" : country === "gb" ? "GBP" : "USD",
          published_at: r.created ?? null,
          raw: null,
        });
      }
      if ((json?.results?.length ?? 0) < 50) break;
    }
    return out;
  },
};

/* ------------------------------ Remotive --------------------------------- */
export const remotiveConnector: Connector = {
  id: "remotive",
  label: "Remotive",
  logo: null,
  async fetchJobs() {
    const json = await getJson("https://remotive.com/api/remote-jobs?limit=200");
    return (json?.jobs ?? []).map((j: any): RawJob => ({
      external_id: String(j.id),
      title: j.title ?? "",
      company_name: j.company_name ?? "",
      company_logo_url: j.company_logo ?? j.company_logo_url ?? null,
      apply_url: j.url ?? "",
      location_text: j.candidate_required_location || "Remote",
      remote_hint: true,
      description: j.description ?? "",
      department: j.category ?? null,
      employment_type_hint: j.job_type ?? null,
      salary_text: j.salary || null,
      published_at: j.publication_date ?? null,
      tags: Array.isArray(j.tags) ? j.tags.slice(0, 8) : [],
      raw: null,
    }));
  },
};

/* ----------------------------- Greenhouse -------------------------------- */
export const greenhouseConnector: Connector = {
  id: "greenhouse",
  label: "Greenhouse",
  logo: null,
  requiresBoardToken: true,
  async fetchJobs(source) {
    const board = requireBoard(source);
    const json = await getJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`);
    return (json?.jobs ?? []).map((j: any): RawJob => ({
      external_id: String(j.id),
      title: j.title ?? "",
      company_name: source.company_name || board,
      apply_url: j.absolute_url ?? "",
      company_career_url: `https://boards.greenhouse.io/${board}`,
      location_text: j.location?.name ?? "",
      description: decodeMaybe(j.content ?? ""),
      department: j.departments?.[0]?.name ?? null,
      published_at: j.updated_at ?? j.first_published ?? null,
      raw: null,
    }));
  },
};

/* -------------------------------- Lever ---------------------------------- */
export const leverConnector: Connector = {
  id: "lever",
  label: "Lever",
  logo: null,
  requiresBoardToken: true,
  async fetchJobs(source) {
    const board = requireBoard(source);
    const json = await getJson(`https://api.lever.co/v0/postings/${encodeURIComponent(board)}?mode=json`);
    return (json ?? []).map((j: any): RawJob => ({
      external_id: String(j.id),
      title: j.text ?? "",
      company_name: source.company_name || board,
      apply_url: j.hostedUrl || j.applyUrl || "",
      company_career_url: `https://jobs.lever.co/${board}`,
      location_text: j.categories?.location ?? "",
      description: `${j.descriptionPlain ?? j.description ?? ""}\n${(j.lists ?? [])
        .map((l: any) => `${l.text}\n${l.content ?? ""}`)
        .join("\n")}`,
      department: j.categories?.team ?? null,
      employment_type_hint: j.categories?.commitment ?? null,
      published_at: j.createdAt ? new Date(j.createdAt).toISOString() : null,
      raw: null,
    }));
  },
};

/* -------------------------------- Ashby ---------------------------------- */
export const ashbyConnector: Connector = {
  id: "ashby",
  label: "Ashby",
  logo: null,
  requiresBoardToken: true,
  async fetchJobs(source) {
    const board = requireBoard(source);
    const json = await getJson(
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`,
    );
    return (json?.jobs ?? []).map((j: any): RawJob => ({
      external_id: String(j.id),
      title: j.title ?? "",
      company_name: source.company_name || json?.name || board,
      apply_url: j.applyUrl || j.jobUrl || "",
      company_career_url: `https://jobs.ashbyhq.com/${board}`,
      location_text: j.location ?? (j.address?.postalAddress?.addressLocality ?? ""),
      remote_hint: j.isRemote ?? null,
      description: j.descriptionHtml ?? j.descriptionPlain ?? "",
      department: j.department ?? j.team ?? null,
      employment_type_hint: j.employmentType ?? null,
      salary_text: j.compensation?.compensationTierSummary ?? null,
      published_at: j.publishedAt ?? null,
      raw: null,
    }));
  },
};

/* ------------------------------- Workable -------------------------------- */
export const workableConnector: Connector = {
  id: "workable",
  label: "Workable",
  logo: null,
  requiresBoardToken: true,
  async fetchJobs(source) {
    const board = requireBoard(source);
    // v3 is the endpoint the live board uses; the legacy widget is kept as a fallback.
    let rows: any[] = [];
    try {
      const v3 = await getJson(`https://apply.workable.com/api/v3/accounts/${encodeURIComponent(board)}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "", location: [], department: [], worktype: [], remote: [] }),
      });
      rows = Array.isArray(v3?.results) ? v3.results : [];
    } catch {
      rows = [];
    }
    if (!rows.length) {
      const widget = await getJson(
        `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(board)}?details=true`,
      );
      rows = Array.isArray(widget?.jobs) ? widget.jobs : [];
    }
    return rows.map((j: any): RawJob => ({
      external_id: String(j.shortcode ?? j.id),
      title: j.title ?? "",
      company_name: source.company_name || board,
      apply_url:
        j.application_url || j.url || j.shortlink ||
        (j.shortcode ? `https://apply.workable.com/${board}/j/${j.shortcode}/` : ""),
      company_career_url: `https://apply.workable.com/${board}`,
      location_text:
        [j.city ?? j.location?.city, j.state ?? j.location?.region, j.country ?? j.location?.country]
          .filter(Boolean)
          .join(", ") || (j.locations ?? []).map((l: any) => [l.city, l.country].filter(Boolean).join(", ")).join(" | "),
      remote_hint: j.telecommuting ?? j.remote ?? (j.workplace ? j.workplace === "remote" : null),
      description: `${j.description ?? ""}\n${j.requirements ?? ""}\n${j.benefits ?? ""}`,
      department: j.department ?? null,
      employment_type_hint: j.employment_type ?? j.type ?? null,
      published_at: j.published_on ?? j.published ?? j.created_at ?? null,
      raw: null,
    }));
  },
};

/* ---------------------------- SmartRecruiters ---------------------------- */
export const smartRecruitersConnector: Connector = {
  id: "smartrecruiters",
  label: "SmartRecruiters",
  logo: null,
  requiresBoardToken: true,
  async fetchJobs(source) {
    const board = requireBoard(source);
    const list = await getJson(
      `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(board)}/postings?limit=100`,
    );
    const jobs: RawJob[] = [];
    for (const p of (list?.content ?? []).slice(0, 60)) {
      const loc = [p.location?.city, p.location?.region, p.location?.country].filter(Boolean).join(", ");
      let description = p.jobAd?.sections
        ? Object.values(p.jobAd.sections)
            .map((s: any) => `${s?.title ?? ""}\n${s?.text ?? ""}`)
            .join("\n")
        : "";
      if (!description) {
        try {
          const detail = await getJson(
            `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(board)}/postings/${p.id}`,
            undefined,
            1,
          );
          const s = detail?.jobAd?.sections ?? {};
          description = ["companyDescription", "jobDescription", "qualifications", "additionalInformation"]
            .map((k) => `${s?.[k]?.title ?? ""}\n${s?.[k]?.text ?? ""}`)
            .join("\n");
        } catch {
          /* keep going with an empty description */
        }
      }
      jobs.push({
        external_id: String(p.id),
        title: p.name ?? "",
        company_name: source.company_name || p.company?.name || board,
        apply_url: p.applyUrl || p.ref || `https://jobs.smartrecruiters.com/${board}/${p.id}`,
        company_career_url: `https://careers.smartrecruiters.com/${board}`,
        location_text: loc,
        remote_hint: p.location?.remote ?? null,
        description,
        department: p.department?.label ?? p.function?.label ?? null,
        employment_type_hint: p.typeOfEmployment?.label ?? null,
        published_at: p.releasedDate ?? p.createdOn ?? null,
        raw: null,
      });
    }
    return jobs;
  },
};

function requireBoard(source: SourceConfig): string {
  if (!source.board_token) throw new Error(`Missing board token for ${source.connector}`);
  return source.board_token;
}

function decodeMaybe(html: string): string {
  // Greenhouse returns HTML-escaped content
  return html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}
