ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS current_job_title text,
  ADD COLUMN IF NOT EXISTS current_salary text,
  ADD COLUMN IF NOT EXISTS notice_period text,
  ADD COLUMN IF NOT EXISTS is_fresher boolean,
  ADD COLUMN IF NOT EXISTS preferred_role text,
  ADD COLUMN IF NOT EXISTS work_mode text;

ALTER TABLE public.candidate_education
  ADD COLUMN IF NOT EXISTS university text;