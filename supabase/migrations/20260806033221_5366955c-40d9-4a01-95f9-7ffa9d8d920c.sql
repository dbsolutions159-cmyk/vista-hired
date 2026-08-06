-- 1. Recruiter contact details moved to a private table
CREATE TABLE public.job_contacts (
  job_id uuid PRIMARY KEY REFERENCES public.jobs(id) ON DELETE CASCADE,
  hr_name text,
  hr_email text,
  hr_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_contacts TO authenticated;
GRANT ALL ON public.job_contacts TO service_role;
ALTER TABLE public.job_contacts ENABLE ROW LEVEL SECURITY;

INSERT INTO public.job_contacts (job_id, hr_name, hr_email, hr_phone)
SELECT id, hr_name, hr_email, hr_phone FROM public.jobs
WHERE hr_name IS NOT NULL OR hr_email IS NOT NULL OR hr_phone IS NOT NULL;

ALTER TABLE public.jobs DROP COLUMN hr_name, DROP COLUMN hr_email, DROP COLUMN hr_phone;

CREATE POLICY "job_contacts_owner_admin_read" ON public.job_contacts
  FOR SELECT TO authenticated
  USING (public.owns_job(job_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "job_contacts_owner_admin_insert" ON public.job_contacts
  FOR INSERT TO authenticated
  WITH CHECK (public.owns_job(job_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "job_contacts_owner_admin_update" ON public.job_contacts
  FOR UPDATE TO authenticated
  USING (public.owns_job(job_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.owns_job(job_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "job_contacts_admin_delete" ON public.job_contacts
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER job_contacts_updated_at BEFORE UPDATE ON public.job_contacts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2. Block posters from self-approving / self-verifying their jobs
CREATE OR REPLACE FUNCTION public.jobs_guard_owner_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- protected trust signals can never be changed by a non-admin
  NEW.verified := OLD.verified;
  NEW.featured := OLD.featured;
  NEW.urgent := OLD.urgent;
  NEW.poster_role := OLD.poster_role;
  NEW.poster_user_id := OLD.poster_user_id;
  NEW.created_by := OLD.created_by;
  NEW.published := OLD.published;
  NEW.rejection_reason := OLD.rejection_reason;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('paused', 'closed', 'draft', 'pending') THEN
    RAISE EXCEPTION 'Only an administrator can set this job status';
  END IF;

  -- a paused/closed job may only return to its prior published state via review
  IF OLD.status = 'live' AND NEW.status IN ('paused', 'closed') THEN
    NEW.published := false;
  END IF;

  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.jobs_guard_owner_update() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER jobs_guard_owner_update_trg
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.jobs_guard_owner_update();

-- 3. Scope comment/like reads to job-relevant contexts
DROP POLICY IF EXISTS comments_auth_read ON public.comments;
CREATE POLICY "comments_scoped_read" ON public.comments
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
    OR public.owns_job(job_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = comments.job_id AND j.published)
  );

DROP POLICY IF EXISTS likes_auth_read ON public.likes;
CREATE POLICY "likes_scoped_read" ON public.likes
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
    OR public.owns_job(job_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = likes.job_id AND j.published)
  );

-- 4. SECURITY DEFINER hardening
ALTER FUNCTION public.is_admin(uuid) SECURITY INVOKER;
ALTER FUNCTION public.owns_job(uuid, uuid) SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.increment_job_view(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.applications_guard_stage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.applications_log_stage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.applications_on_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_seed_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.jobs_sync_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;