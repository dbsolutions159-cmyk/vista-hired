
-- Extend profiles with candidate fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS preferred_location text,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS skills text[],
  ADD COLUMN IF NOT EXISTS experience_years text,
  ADD COLUMN IF NOT EXISTS experience_summary text,
  ADD COLUMN IF NOT EXISTS current_company text,
  ADD COLUMN IF NOT EXISTS languages text[],
  ADD COLUMN IF NOT EXISTS expected_salary text,
  ADD COLUMN IF NOT EXISTS employment_pref text,
  ADD COLUMN IF NOT EXISTS resume_path text,
  ADD COLUMN IF NOT EXISTS resume_name text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS portfolio_url text;

-- Avatars bucket policies (bucket created via tool)
