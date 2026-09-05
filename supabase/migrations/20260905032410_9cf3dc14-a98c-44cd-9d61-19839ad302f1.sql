DROP POLICY IF EXISTS "Signed-in users can read external job likes" ON public.external_job_likes;
CREATE POLICY "Users can read their own external job likes"
ON public.external_job_likes FOR SELECT TO authenticated USING (auth.uid() = user_id);