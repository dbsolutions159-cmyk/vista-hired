CREATE TABLE public.cta_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cta text NOT NULL CHECK (cta IN ('apply_now','premium_membership')),
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  external_job_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.cta_clicks TO anon, authenticated;
GRANT SELECT ON public.cta_clicks TO authenticated;
GRANT ALL ON public.cta_clicks TO service_role;
ALTER TABLE public.cta_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can record a cta click" ON public.cta_clicks FOR INSERT TO anon, authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Admins can read cta clicks" ON public.cta_clicks FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX cta_clicks_job_idx ON public.cta_clicks(job_id, cta);