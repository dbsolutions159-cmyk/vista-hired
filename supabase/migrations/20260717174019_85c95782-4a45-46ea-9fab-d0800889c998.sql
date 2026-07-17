
DROP POLICY IF EXISTS comments_public_read ON public.comments;
CREATE POLICY comments_auth_read ON public.comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS likes_public_read ON public.likes;
CREATE POLICY likes_auth_read ON public.likes FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.comments FROM anon;
REVOKE SELECT ON public.likes FROM anon;

-- Prevent signed-in users from invoking the SECURITY DEFINER role check via the API.
-- RLS policies pass through pg_catalog and still evaluate has_role via SECURITY DEFINER;
-- revoking EXECUTE from anon/authenticated blocks direct PostgREST RPC calls.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
