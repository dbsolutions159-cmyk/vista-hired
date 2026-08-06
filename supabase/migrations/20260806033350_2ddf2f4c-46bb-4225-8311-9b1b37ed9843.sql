CREATE OR REPLACE FUNCTION public.jobs_guard_owner_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      NULL; -- safe self-service transitions
    ELSIF NEW.status = 'live'
      AND OLD.status IN ('paused', 'closed')
      AND COALESCE(OLD.verified, false) THEN
      NULL; -- resuming a listing an admin already approved
    ELSE
      RAISE EXCEPTION 'Only an administrator can set this job status';
    END IF;
  END IF;

  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.jobs_guard_owner_update() FROM PUBLIC, anon, authenticated;