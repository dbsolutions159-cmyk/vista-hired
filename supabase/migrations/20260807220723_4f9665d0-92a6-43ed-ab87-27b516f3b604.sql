-- 1. Configurable job board sources (lets new boards be added without code changes)
CREATE TABLE public.job_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector text NOT NULL,                 -- adzuna | remotive | greenhouse | lever | ashby | workable | smartrecruiters
  board_token text,                        -- company slug/board id for ATS connectors
  company_name text,
  company_logo_url text,
  company_career_url text,
  enabled boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  last_status text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connector, board_token)
);
GRANT SELECT ON public.job_sources TO authenticated;
GRANT ALL ON public.job_sources TO service_role;
ALTER TABLE public.job_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage job sources" ON public.job_sources FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 2. Aggregated external jobs
CREATE TABLE public.external_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_logo_url text,
  external_id text NOT NULL,
  dedupe_key text NOT NULL,
  company_name text NOT NULL,
  company_logo_url text,
  company_career_url text,
  title text NOT NULL,
  category text,
  department text,
  employment_type text NOT NULL DEFAULT 'full_time',
  experience text,
  experience_level text,                   -- fresher | experienced | any
  salary_text text,
  salary_min integer,
  salary_max integer,
  salary_currency text DEFAULT 'INR',
  country text DEFAULT 'India',
  state text,
  city text,
  location_text text NOT NULL DEFAULT 'India',
  remote_type text NOT NULL DEFAULT 'onsite',   -- onsite | remote | hybrid
  description text NOT NULL DEFAULT '',
  summary text,
  responsibilities text,
  requirements text,
  benefits text,
  skills text[] NOT NULL DEFAULT '{}',
  apply_url text NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  verified boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  raw jsonb,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dedupe_key)
);
CREATE INDEX external_jobs_active_pub_idx ON public.external_jobs (is_active, published_at DESC);
CREATE INDEX external_jobs_city_idx ON public.external_jobs (lower(city));
CREATE INDEX external_jobs_company_idx ON public.external_jobs (lower(company_name));
CREATE INDEX external_jobs_source_idx ON public.external_jobs (source);
CREATE INDEX external_jobs_skills_idx ON public.external_jobs USING gin (skills);

GRANT SELECT ON public.external_jobs TO anon;
GRANT SELECT ON public.external_jobs TO authenticated;
GRANT ALL ON public.external_jobs TO service_role;
ALTER TABLE public.external_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active imported jobs" ON public.external_jobs FOR SELECT TO anon, authenticated
  USING (is_active = true);
CREATE POLICY "Admins manage imported jobs" ON public.external_jobs FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 3. Import run logs
CREATE TABLE public.job_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector text NOT NULL,
  board_token text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  fetched_count integer NOT NULL DEFAULT 0,
  imported_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  duplicate_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  retry_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_import_logs_started_idx ON public.job_import_logs (started_at DESC);
GRANT SELECT ON public.job_import_logs TO authenticated;
GRANT ALL ON public.job_import_logs TO service_role;
ALTER TABLE public.job_import_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read import logs" ON public.job_import_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 4. Job reports (candidates flagging bad listings)
CREATE TABLE public.job_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  external_job_id uuid REFERENCES public.external_jobs(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.job_reports TO authenticated;
GRANT ALL ON public.job_reports TO service_role;
ALTER TABLE public.job_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create own reports" ON public.job_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own reports" ON public.job_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage reports" ON public.job_reports FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 5. Saved external jobs already exists; add link to external_jobs for analytics
ALTER TABLE public.saved_external_jobs ADD COLUMN IF NOT EXISTS external_job_id uuid REFERENCES public.external_jobs(id) ON DELETE CASCADE;

-- 6. updated_at triggers
CREATE TRIGGER external_jobs_updated_at BEFORE UPDATE ON public.external_jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER job_sources_updated_at BEFORE UPDATE ON public.job_sources
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 7. Seed connector board registry (official company career boards, India-hiring companies)
INSERT INTO public.job_sources (connector, board_token, company_name, company_career_url) VALUES
  ('adzuna', 'in', 'Adzuna India', NULL),
  ('remotive', 'global', 'Remotive', NULL),
  ('greenhouse', 'razorpaysoftwareprivatelimited', 'Razorpay', 'https://boards.greenhouse.io/razorpaysoftwareprivatelimited'),
  ('greenhouse', 'databricks', 'Databricks', 'https://boards.greenhouse.io/databricks'),
  ('greenhouse', 'stripe', 'Stripe', 'https://boards.greenhouse.io/stripe'),
  ('lever', 'swiggy', 'Swiggy', 'https://jobs.lever.co/swiggy'),
  ('lever', 'netflix', 'Netflix', 'https://jobs.lever.co/netflix'),
  ('ashby', 'zepto', 'Zepto', 'https://jobs.ashbyhq.com/zepto'),
  ('workable', 'freshworks', 'Freshworks', 'https://apply.workable.com/freshworks'),
  ('smartrecruiters', 'Visa', 'Visa', 'https://careers.smartrecruiters.com/Visa')
ON CONFLICT (connector, board_token) DO NOTHING;