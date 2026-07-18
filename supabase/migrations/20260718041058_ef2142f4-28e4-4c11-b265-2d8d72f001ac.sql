ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_job_view(_job_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.jobs SET view_count = COALESCE(view_count, 0) + 1 WHERE id = _job_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_job_view(uuid) TO anon, authenticated;