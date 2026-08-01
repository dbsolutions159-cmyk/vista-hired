
DROP POLICY IF EXISTS notif_insert ON public.notifications;
CREATE POLICY notif_insert ON public.notifications FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR user_id = auth.uid());

REVOKE EXECUTE ON FUNCTION public.owns_job(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_job_view(uuid) FROM anon;
