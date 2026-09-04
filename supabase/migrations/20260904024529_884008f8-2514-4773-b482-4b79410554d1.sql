CREATE TABLE public.external_job_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_job_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (external_job_id, user_id)
);

CREATE TABLE public.external_job_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_job_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text NOT NULL CHECK (length(btrim(comment)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX external_job_likes_job_idx ON public.external_job_likes (external_job_id);
CREATE INDEX external_job_comments_job_idx ON public.external_job_comments (external_job_id, created_at DESC);

GRANT SELECT ON public.external_job_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.external_job_likes TO authenticated;
GRANT ALL ON public.external_job_likes TO service_role;

GRANT SELECT ON public.external_job_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_job_comments TO authenticated;
GRANT ALL ON public.external_job_comments TO service_role;

ALTER TABLE public.external_job_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_job_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read external job likes"
  ON public.external_job_likes FOR SELECT USING (true);
CREATE POLICY "Users can like as themselves"
  ON public.external_job_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their own like"
  ON public.external_job_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read external job comments"
  ON public.external_job_comments FOR SELECT USING (true);
CREATE POLICY "Users can comment as themselves"
  ON public.external_job_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can edit their own comment"
  ON public.external_job_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users and admins can delete comments"
  ON public.external_job_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE TRIGGER external_job_comments_updated_at
  BEFORE UPDATE ON public.external_job_comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.external_job_social_counts(_keys text[])
RETURNS TABLE (external_job_id text, like_count bigint, comment_count bigint, liked_by_me boolean)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT k AS external_job_id,
    (SELECT count(*) FROM public.external_job_likes l WHERE l.external_job_id = k),
    (SELECT count(*) FROM public.external_job_comments c WHERE c.external_job_id = k),
    EXISTS (SELECT 1 FROM public.external_job_likes l2 WHERE l2.external_job_id = k AND l2.user_id = auth.uid())
  FROM unnest(_keys) AS k;
$$;

GRANT EXECUTE ON FUNCTION public.external_job_social_counts(text[]) TO anon, authenticated;