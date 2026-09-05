-- 1. Restrict raw reads of external job likes/comments to signed-in users
DROP POLICY IF EXISTS "Anyone can read external job likes" ON public.external_job_likes;
DROP POLICY IF EXISTS "Anyone can read external job comments" ON public.external_job_comments;

CREATE POLICY "Signed-in users can read external job likes"
ON public.external_job_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Signed-in users can read external job comments"
ON public.external_job_comments FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.external_job_likes FROM anon;
REVOKE SELECT ON public.external_job_comments FROM anon;
GRANT SELECT, INSERT, DELETE ON public.external_job_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_job_comments TO authenticated;
GRANT ALL ON public.external_job_likes TO service_role;
GRANT ALL ON public.external_job_comments TO service_role;

-- 2. Keep public aggregate counts working without exposing rows
CREATE OR REPLACE FUNCTION public.external_job_social_counts(_keys text[])
 RETURNS TABLE(external_job_id text, like_count bigint, comment_count bigint, liked_by_me boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT k AS external_job_id,
    (SELECT count(*) FROM public.external_job_likes l WHERE l.external_job_id = k),
    (SELECT count(*) FROM public.external_job_comments c WHERE c.external_job_id = k),
    EXISTS (SELECT 1 FROM public.external_job_likes l2 WHERE l2.external_job_id = k AND l2.user_id = auth.uid())
  FROM unnest(_keys) AS k;
$function$;

REVOKE ALL ON FUNCTION public.external_job_social_counts(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.external_job_social_counts(text[]) TO anon, authenticated, service_role;

-- 3. Job owners can never move a job into 'live'; admins only
CREATE OR REPLACE FUNCTION public.job_owner_update_allowed(_job_id uuid, _status job_status, _verified boolean, _published boolean, _featured boolean, _urgent boolean, _poster_role poster_role, _poster_user_id uuid, _created_by uuid, _rejection_reason text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        )
        AND _published IS NOT DISTINCT FROM (_status = 'live')
    )
  END;
$function$;

CREATE OR REPLACE FUNCTION public.jobs_guard_owner_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  NEW.verified := OLD.verified;
  NEW.featured := OLD.featured;
  NEW.urgent := OLD.urgent;
  NEW.poster_role := OLD.poster_role;
  NEW.poster_user_id := OLD.poster_user_id;
  NEW.created_by := OLD.created_by;
  NEW.rejection_reason := OLD.rejection_reason;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('paused', 'closed', 'draft', 'pending') THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Only an administrator can set this job status';
    END IF;
  END IF;

  RETURN NEW;
END; $function$;