
-- Enums
DO $$ BEGIN
  CREATE TYPE public.job_status AS ENUM ('draft','pending','approved','live','rejected','expired','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.poster_role AS ENUM ('admin','recruiter','employer','hr','consultancy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS status public.job_status NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS poster_role public.poster_role NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS poster_user_id uuid,
  ADD COLUMN IF NOT EXISTS hr_name text,
  ADD COLUMN IF NOT EXISTS hr_email text,
  ADD COLUMN IF NOT EXISTS hr_phone text,
  ADD COLUMN IF NOT EXISTS company_website text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS openings int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS qualification text,
  ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS responsibilities text,
  ADD COLUMN IF NOT EXISTS benefits text,
  ADD COLUMN IF NOT EXISTS apply_url text,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS urgent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Existing rows: admin-created, live, verified
UPDATE public.jobs SET status = CASE WHEN published THEN 'live'::public.job_status ELSE 'draft'::public.job_status END,
  verified = COALESCE(verified, true),
  poster_role = 'admin'
WHERE poster_user_id IS NULL;

-- Trigger: keep `published` in sync with status; auto-verify admin/approved jobs
CREATE OR REPLACE FUNCTION public.jobs_sync_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.published := (NEW.status = 'live');
  IF NEW.status = 'live' THEN
    NEW.verified := true;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS jobs_sync_status_trg ON public.jobs;
CREATE TRIGGER jobs_sync_status_trg BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.jobs_sync_status();

-- RLS: allow authenticated users to submit jobs (must be pending unless admin)
DROP POLICY IF EXISTS jobs_user_submit ON public.jobs;
CREATE POLICY jobs_user_submit ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (
    poster_user_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (status = 'pending' AND poster_role <> 'admin')
    )
  );

-- Users can read their own submissions (any status)
DROP POLICY IF EXISTS jobs_user_read_own ON public.jobs;
CREATE POLICY jobs_user_read_own ON public.jobs FOR SELECT TO authenticated
  USING (poster_user_id = auth.uid());

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_owner_read ON public.notifications;
CREATE POLICY notif_owner_read ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS notif_owner_update ON public.notifications;
CREATE POLICY notif_owner_update ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notif_owner_delete ON public.notifications;
CREATE POLICY notif_owner_delete ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS notif_admin_insert ON public.notifications;
CREATE POLICY notif_admin_insert ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON public.jobs(status);
CREATE INDEX IF NOT EXISTS jobs_poster_idx ON public.jobs(poster_user_id);
