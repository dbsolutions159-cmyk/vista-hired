-- 3-day free apply trial
CREATE TABLE public.apply_trials (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_start_at timestamptz NOT NULL DEFAULT now(),
  trial_end_at timestamptz NOT NULL DEFAULT (now() + interval '3 days'),
  trial_status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.apply_trials TO authenticated;
GRANT ALL ON public.apply_trials TO service_role;

ALTER TABLE public.apply_trials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own trial" ON public.apply_trials
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all trials" ON public.apply_trials
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER apply_trials_updated_at BEFORE UPDATE ON public.apply_trials
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- audit log
CREATE TABLE public.access_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.access_audit_logs TO authenticated;
GRANT ALL ON public.access_audit_logs TO service_role;

ALTER TABLE public.access_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own audit logs" ON public.access_audit_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all audit logs" ON public.access_audit_logs
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE INDEX access_audit_logs_user_idx ON public.access_audit_logs(user_id, created_at DESC);

-- start trial once per account
CREATE OR REPLACE FUNCTION public.start_apply_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.apply_trials (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.access_audit_logs (user_id, event, detail)
  SELECT NEW.id, 'trial_created', jsonb_build_object('source', 'signup')
  WHERE EXISTS (SELECT 1 FROM public.apply_trials t WHERE t.user_id = NEW.id AND t.created_at > now() - interval '5 seconds');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created_start_trial
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.start_apply_trial();

-- backfill existing accounts (one trial per account, permanent)
INSERT INTO public.apply_trials (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- lazy expiry + status source of truth
CREATE OR REPLACE FUNCTION public.expire_due_trials()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH expired AS (
    UPDATE public.apply_trials
    SET trial_status = 'expired'
    WHERE trial_status = 'active' AND trial_end_at <= now()
    RETURNING user_id
  )
  INSERT INTO public.access_audit_logs (user_id, event)
  SELECT user_id, 'trial_expired' FROM expired;
$$;

CREATE OR REPLACE FUNCTION public.has_active_trial(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.apply_trials t
    WHERE t.user_id = _user_id
      AND t.trial_status = 'active'
      AND t.trial_end_at > now()
  );
$$;

CREATE OR REPLACE FUNCTION public.apply_access_state(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'now', now(),
    'membership_active', public.has_active_membership(_user_id),
    'membership', (SELECT to_jsonb(m) FROM (
        SELECT plan, status, expires_at FROM public.memberships
        WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 1) m),
    'trial_active', public.has_active_trial(_user_id),
    'trial', (SELECT to_jsonb(t) FROM (
        SELECT trial_start_at, trial_end_at,
               CASE WHEN trial_status = 'active' AND trial_end_at > now()
                    THEN 'active' ELSE 'expired' END AS trial_status
        FROM public.apply_trials WHERE user_id = _user_id) t),
    'can_apply', public.has_active_membership(_user_id) OR public.has_active_trial(_user_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.apply_access_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_trial(uuid) TO authenticated;