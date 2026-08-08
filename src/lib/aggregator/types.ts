/**
 * Shared types for the HireSetu multi-source job engine.
 * Connectors return `RawJob`s; the pipeline normalizes them into `NormalizedJob`
 * rows that map 1:1 onto the `external_jobs` table.
 */

export type RawJob = {
  external_id: string;
  title: string;
  company_name: string;
  company_logo_url?: string | null;
  company_career_url?: string | null;
  /** Official company application URL. Aggregator links are rejected. */
  apply_url: string;
  location_text: string;
  remote_hint?: boolean | null;
  /** Raw HTML or plain text description. */
  description: string;
  department?: string | null;
  category?: string | null;
  employment_type_hint?: string | null;
  experience_hint?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  salary_text?: string | null;
  published_at?: string | null;
  expires_at?: string | null;
  tags?: string[];
  raw?: unknown;
};

export type SourceConfig = {
  id: string;
  connector: string;
  board_token: string | null;
  company_name: string | null;
  company_logo_url: string | null;
  company_career_url: string | null;
};

export type Connector = {
  /** Stable connector id, matches `job_sources.connector`. */
  id: string;
  label: string;
  logo: string | null;
  /** Env var names that must be present for this connector to run. */
  requiresEnv?: string[];
  /** True when the source row must carry a board token. */
  requiresBoardToken?: boolean;
  /** Fetch the current openings for one configured board/source. */
  fetchJobs(source: SourceConfig): Promise<RawJob[]>;
};

export type NormalizedJob = {
  source: string;
  source_logo_url: string | null;
  external_id: string;
  dedupe_key: string;
  company_name: string;
  company_logo_url: string | null;
  company_career_url: string | null;
  title: string;
  category: string | null;
  department: string | null;
  employment_type: string;
  experience: string | null;
  experience_level: string;
  salary_text: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  country: string;
  state: string | null;
  city: string | null;
  location_text: string;
  remote_type: "onsite" | "remote" | "hybrid";
  description: string;
  summary: string;
  responsibilities: string | null;
  requirements: string | null;
  benefits: string | null;
  skills: string[];
  apply_url: string;
  published_at: string;
  expires_at: string | null;
  verified: boolean;
  is_active: boolean;
  raw: unknown;
};
