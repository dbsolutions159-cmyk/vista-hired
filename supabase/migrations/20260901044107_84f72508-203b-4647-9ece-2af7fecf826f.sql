REVOKE ALL ON FUNCTION public.expire_due_trials() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_active_trial(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_access_state(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.start_apply_trial() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_due_trials() TO service_role;
GRANT EXECUTE ON FUNCTION public.has_active_trial(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_access_state(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.start_apply_trial() TO service_role;