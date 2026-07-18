
-- Clear seeded/demo jobs and dependent rows
DELETE FROM public.likes;
DELETE FROM public.comments;
DELETE FROM public.saved_jobs;
DELETE FROM public.applications;
DELETE FROM public.jobs;

-- Table to save external (Adzuna/Remotive) jobs
CREATE TABLE public.saved_external_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL,
  external_id text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source, external_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_external_jobs TO authenticated;
GRANT ALL ON public.saved_external_jobs TO service_role;

ALTER TABLE public.saved_external_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_external_jobs_own_select" ON public.saved_external_jobs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "saved_external_jobs_own_insert" ON public.saved_external_jobs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_external_jobs_own_delete" ON public.saved_external_jobs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
