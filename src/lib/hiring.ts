import { supabase } from "@/integrations/supabase/client";

export const APPLICATION_SELECT =
  "*, jobs!inner(id, title, company_name, location, poster_user_id, status)";

/** Jobs the current user manages (own postings, or everything for admins). */
export async function fetchManagedJobs(userId: string, isAdmin: boolean) {
  let q = supabase.from("jobs").select("*").order("created_at", { ascending: false });
  if (!isAdmin) q = q.eq("poster_user_id", userId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Applications for jobs the current user manages. */
export async function fetchManagedApplications(userId: string, isAdmin: boolean, jobId?: string) {
  let q = supabase
    .from("applications")
    .select(APPLICATION_SELECT)
    .order("created_at", { ascending: false })
    .limit(500);
  if (!isAdmin) q = q.eq("jobs.poster_user_id", userId);
  if (jobId) q = q.eq("job_id", jobId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchManagedInterviews(userId: string, isAdmin: boolean, upcomingOnly = false) {
  let q = supabase
    .from("interviews")
    .select("*, jobs!inner(id, title, company_name, poster_user_id), applications(id, full_name, email, mobile)")
    .order("scheduled_at", { ascending: true });
  if (!isAdmin) q = q.eq("jobs.poster_user_id", userId);
  if (upcomingOnly) q = q.gte("scheduled_at", new Date().toISOString()).eq("status", "scheduled");
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function signedResumeUrl(path?: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from("resumes").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function signedAvatarUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
