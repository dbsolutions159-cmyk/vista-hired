
-- 1. Stage enum
CREATE TYPE public.application_stage AS ENUM (
  'applied','under_review','shortlisted','interview_scheduled','interview_completed',
  'selected','offer_sent','offer_accepted','hired','rejected','withdrawn'
);

ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'paused';

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS stage public.application_stage NOT NULL DEFAULT 'applied',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.applications SET stage = CASE
  WHEN status = 'approved' THEN 'shortlisted'::public.application_stage
  WHEN status = 'rejected' THEN 'rejected'::public.application_stage
  ELSE 'applied'::public.application_stage END;

-- prevent duplicate applications
CREATE UNIQUE INDEX IF NOT EXISTS applications_job_user_uniq ON public.applications(job_id, user_id);

-- 2. helper: does user own the job
CREATE OR REPLACE FUNCTION public.owns_job(_job_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = _job_id AND (j.poster_user_id = _user_id OR j.created_by = _user_id));
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin');
$$;

-- 3. timeline
CREATE TABLE public.application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  from_stage public.application_stage,
  to_stage public.application_stage NOT NULL,
  note text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.application_events TO authenticated;
GRANT ALL ON public.application_events TO service_role;
ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_events_read ON public.application_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id
  AND (a.user_id = auth.uid() OR public.owns_job(a.job_id, auth.uid()) OR public.is_admin(auth.uid()))));
CREATE POLICY app_events_insert ON public.application_events FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id
  AND (a.user_id = auth.uid() OR public.owns_job(a.job_id, auth.uid()) OR public.is_admin(auth.uid()))));

-- 4. internal notes
CREATE TABLE public.application_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_notes TO authenticated;
GRANT ALL ON public.application_notes TO service_role;
ALTER TABLE public.application_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_notes_read ON public.application_notes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id
  AND (public.owns_job(a.job_id, auth.uid()) OR public.is_admin(auth.uid()))));
CREATE POLICY app_notes_insert ON public.application_notes FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id
  AND (public.owns_job(a.job_id, auth.uid()) OR public.is_admin(auth.uid()))));
CREATE POLICY app_notes_delete ON public.application_notes FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.is_admin(auth.uid()));

-- 5. interviews
CREATE TABLE public.interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  mode text NOT NULL DEFAULT 'video',
  meeting_link text,
  location text,
  interviewer_name text,
  notes text,
  status text NOT NULL DEFAULT 'scheduled',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO authenticated;
GRANT ALL ON public.interviews TO service_role;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY interviews_read ON public.interviews FOR SELECT TO authenticated
USING (candidate_id = auth.uid() OR public.owns_job(job_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY interviews_write ON public.interviews FOR INSERT TO authenticated
WITH CHECK (public.owns_job(job_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY interviews_update ON public.interviews FOR UPDATE TO authenticated
USING (public.owns_job(job_id, auth.uid()) OR public.is_admin(auth.uid()))
WITH CHECK (public.owns_job(job_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY interviews_delete ON public.interviews FOR DELETE TO authenticated
USING (public.owns_job(job_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE TRIGGER interviews_updated_at BEFORE UPDATE ON public.interviews
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 6. candidate education / experience
CREATE TABLE public.candidate_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  degree text NOT NULL,
  institution text NOT NULL,
  field_of_study text,
  start_year text,
  end_year text,
  grade text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_education TO authenticated;
GRANT ALL ON public.candidate_education TO service_role;
ALTER TABLE public.candidate_education ENABLE ROW LEVEL SECURITY;
CREATE POLICY edu_self ON public.candidate_education FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY edu_recruiter_read ON public.candidate_education FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR EXISTS (
  SELECT 1 FROM public.applications a WHERE a.user_id = candidate_education.user_id AND public.owns_job(a.job_id, auth.uid())));

CREATE TABLE public.candidate_experience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_title text NOT NULL,
  company text NOT NULL,
  location text,
  start_date text,
  end_date text,
  is_current boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_experience TO authenticated;
GRANT ALL ON public.candidate_experience TO service_role;
ALTER TABLE public.candidate_experience ENABLE ROW LEVEL SECURITY;
CREATE POLICY exp_self ON public.candidate_experience FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY exp_recruiter_read ON public.candidate_experience FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR EXISTS (
  SELECT 1 FROM public.applications a WHERE a.user_id = candidate_experience.user_id AND public.owns_job(a.job_id, auth.uid())));

-- 7. profiles readable by recruiters who received an application
CREATE POLICY profiles_recruiter_read ON public.profiles FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR EXISTS (
  SELECT 1 FROM public.applications a WHERE a.user_id = profiles.id AND public.owns_job(a.job_id, auth.uid())));

-- 8. applications policies: recruiter access + candidate withdraw
DROP POLICY IF EXISTS applications_self_select ON public.applications;
CREATE POLICY applications_read ON public.applications FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.owns_job(job_id, auth.uid()) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS applications_admin_update ON public.applications;
CREATE POLICY applications_manage_update ON public.applications FOR UPDATE TO authenticated
USING (public.owns_job(job_id, auth.uid()) OR public.is_admin(auth.uid()) OR user_id = auth.uid())
WITH CHECK (public.owns_job(job_id, auth.uid()) OR public.is_admin(auth.uid()) OR user_id = auth.uid());

-- candidates may only withdraw; recruiters/admins may set any stage
CREATE OR REPLACE FUNCTION public.applications_guard_stage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage
     AND NOT (public.owns_job(NEW.job_id, auth.uid()) OR public.is_admin(auth.uid())) THEN
    IF NEW.stage <> 'withdrawn' THEN
      RAISE EXCEPTION 'Only the hiring team can change the hiring stage';
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END; $$;
CREATE TRIGGER applications_guard_stage_trg BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.applications_guard_stage();

-- 9. log stage changes + notify candidate
CREATE OR REPLACE FUNCTION public.applications_log_stage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _title text; _job_title text;
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.application_events(application_id, from_stage, to_stage, actor_id)
    VALUES (NEW.id, OLD.stage, NEW.stage, auth.uid());
    SELECT title INTO _job_title FROM public.jobs WHERE id = NEW.job_id;
    _title := CASE NEW.stage
      WHEN 'under_review' THEN 'Your application is under review'
      WHEN 'shortlisted' THEN 'You have been shortlisted'
      WHEN 'interview_scheduled' THEN 'Interview scheduled'
      WHEN 'interview_completed' THEN 'Interview marked completed'
      WHEN 'selected' THEN 'You have been selected'
      WHEN 'offer_sent' THEN 'Offer sent'
      WHEN 'offer_accepted' THEN 'Offer accepted'
      WHEN 'hired' THEN 'Congratulations, you are hired!'
      WHEN 'rejected' THEN 'Application update'
      WHEN 'withdrawn' THEN 'Application withdrawn'
      ELSE 'Application update' END;
    IF NEW.stage = 'withdrawn' THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
      SELECT j.poster_user_id, 'application_withdrawn', 'Candidate withdrew', NEW.full_name || ' withdrew from ' || COALESCE(_job_title,'a job'), '/admin/applications/' || NEW.id
      FROM public.jobs j WHERE j.id = NEW.job_id AND j.poster_user_id IS NOT NULL;
    ELSE
      INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (NEW.user_id, 'application_stage', _title, COALESCE(_job_title,'Your application') || ' · status updated', '/profile');
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER applications_log_stage_trg AFTER UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.applications_log_stage();

-- 10. new application: timeline entry + recruiter notification
CREATE OR REPLACE FUNCTION public.applications_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _job_title text;
BEGIN
  INSERT INTO public.application_events(application_id, from_stage, to_stage, actor_id)
  VALUES (NEW.id, NULL, NEW.stage, NEW.user_id);
  SELECT title INTO _job_title FROM public.jobs WHERE id = NEW.job_id;
  INSERT INTO public.notifications(user_id, type, title, body, link)
  SELECT j.poster_user_id, 'new_application', 'New application', NEW.full_name || ' applied for ' || COALESCE(_job_title,'your job'), '/admin/applications/' || NEW.id
  FROM public.jobs j WHERE j.id = NEW.job_id AND j.poster_user_id IS NOT NULL;
  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (NEW.user_id, 'application_submitted', 'Application submitted', 'You applied for ' || COALESCE(_job_title,'a job'), '/profile');
  RETURN NEW;
END; $$;
CREATE TRIGGER applications_on_insert_trg AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.applications_on_insert();

-- allow notification inserts made by these definer triggers
DROP POLICY IF EXISTS notif_admin_insert ON public.notifications;
CREATE POLICY notif_insert ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

-- 11. jobs: owner can update own job (pause/resume/close)
CREATE POLICY jobs_owner_update ON public.jobs FOR UPDATE TO authenticated
USING (poster_user_id = auth.uid()) WITH CHECK (poster_user_id = auth.uid());
