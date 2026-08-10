-- 1. Memberships
CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'premium',
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.memberships TO authenticated;
GRANT ALL ON public.memberships TO service_role;

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own membership"
  ON public.memberships FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all memberships"
  ON public.memberships FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.has_active_membership(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = _user_id
      AND m.status = 'active'
      AND (m.expires_at IS NULL OR m.expires_at > now())
  );
$$;

REVOKE ALL ON FUNCTION public.has_active_membership(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_membership(uuid) TO authenticated, service_role;

-- 2. Hide application URLs from direct Data API reads
REVOKE SELECT (apply_url) ON public.jobs FROM anon, authenticated;
REVOKE SELECT (apply_url) ON public.external_jobs FROM anon, authenticated;

-- 3. Soft delete for jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS jobs_deleted_at_idx ON public.jobs (deleted_at);