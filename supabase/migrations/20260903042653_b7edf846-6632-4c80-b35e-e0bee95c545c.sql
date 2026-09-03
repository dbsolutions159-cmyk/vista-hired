CREATE OR REPLACE FUNCTION public.job_owner_update_allowed(
  _job_id uuid,
  _status public.job_status,
  _verified boolean,
  _featured boolean,
  _urgent boolean,
  _poster_role public.poster_role,
  _poster_user_id uuid,
  _created_by uuid,
  _rejection_reason text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_admin(auth.uid()) THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = _job_id
        AND j.verified         IS NOT DISTINCT FROM _verified
        AND j.featured         IS NOT DISTINCT FROM _featured
        AND j.urgent           IS NOT DISTINCT FROM _urgent
        AND j.poster_role      IS NOT DISTINCT FROM _poster_role
        AND j.poster_user_id   IS NOT DISTINCT FROM _poster_user_id
        AND j.created_by       IS NOT DISTINCT FROM _created_by
        AND j.rejection_reason IS NOT DISTINCT FROM _rejection_reason
        AND (
          _status = j.status
          OR _status IN ('draft','pending','paused','closed')
          OR (_status = 'live' AND j.status IN ('paused','closed') AND COALESCE(j.verified, false))
        )
    )
  END;
$$;

DROP POLICY IF EXISTS jobs_owner_update ON public.jobs;

CREATE POLICY jobs_owner_update ON public.jobs
FOR UPDATE
TO authenticated
USING (poster_user_id = auth.uid() OR created_by = auth.uid())
WITH CHECK (
  (poster_user_id = auth.uid() OR created_by = auth.uid())
  AND public.job_owner_update_allowed(
        id, status, verified, featured, urgent,
        poster_role, poster_user_id, created_by, rejection_reason
      )
);