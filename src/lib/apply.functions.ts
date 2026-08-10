import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Fallback destination for HireSetu jobs that have no custom apply URL. */
export const CANDIDATE_PORTAL_URL = "https://hiresetu-candidate-portal.lovable.app";

const resolveInput = z
  .object({
    jobId: z.string().uuid().optional(),
    externalJobId: z.string().uuid().optional(),
  })
  .refine((v) => !!v.jobId || !!v.externalJobId, "A job reference is required");

export type ResolveApplyResult =
  | { ok: true; url: string; kind: "custom" | "candidate_portal" | "official" }
  | { ok: false; reason: "membership_required" | "not_found" | "closed" };

/**
 * Releases the real application URL ONLY to a signed-in user with an active
 * membership. Non-members never receive the URL in any payload, so the lock
 * cannot be bypassed by reading page source or calling the API directly.
 */
export const resolveApplyUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => resolveInput.parse(data))
  .handler(async ({ data, context }): Promise<ResolveApplyResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: active } = await supabaseAdmin.rpc("has_active_membership", {
      _user_id: context.userId,
    });
    if (!active) return { ok: false, reason: "membership_required" };

    if (data.jobId) {
      const { data: job } = await supabaseAdmin
        .from("jobs")
        .select("id, apply_url, status, deleted_at")
        .eq("id", data.jobId)
        .maybeSingle();
      if (!job || job.deleted_at) return { ok: false, reason: "not_found" };
      if (job.status === "closed" || job.status === "expired") return { ok: false, reason: "closed" };

      const custom = (job.apply_url ?? "").trim();
      // PRIORITY 1: a manually entered apply URL always wins.
      if (/^https?:\/\//i.test(custom)) return { ok: true, url: custom, kind: "custom" };
      // PRIORITY 2: HireSetu candidate portal.
      const portal = new URL(CANDIDATE_PORTAL_URL);
      portal.searchParams.set("job_id", job.id);
      return { ok: true, url: portal.toString(), kind: "candidate_portal" };
    }

    const { data: ext } = await supabaseAdmin
      .from("external_jobs")
      .select("id, apply_url, is_active")
      .eq("id", data.externalJobId!)
      .maybeSingle();
    if (!ext) return { ok: false, reason: "not_found" };
    if (!ext.is_active) return { ok: false, reason: "closed" };
    // Imported jobs always use the verified official company application URL
    // captured by the job engine (aggregator links are rejected at import).
    return { ok: true, url: ext.apply_url, kind: "official" };
  });

/* ------------------------------------------------------------------ */
/* Owner / admin job management                                        */
/* ------------------------------------------------------------------ */

async function assertCanManage(context: { supabase: any; userId: string }, jobId: string) {
  const { data: job } = await context.supabase
    .from("jobs")
    .select("id, poster_user_id, created_by")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) throw new Error("Job not found");
  const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  const owns = job.poster_user_id === context.userId || job.created_by === context.userId;
  if (!isAdmin && !owns) throw new Error("You don't have permission to manage this job");
  return job;
}

/** Full job row (including the private apply URL) for its owner or an admin. */
export const getJobForEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ jobId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertCanManage(context as never, data.jobId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: job, error } = await supabaseAdmin
      .from("jobs")
      .select("*")
      .eq("id", data.jobId)
      .maybeSingle();
    if (error) throw error;
    if (!job) throw new Error("Job not found");
    return job;
  });

const patchSchema = z.object({
  jobId: z.string().uuid(),
  patch: z.object({
    title: z.string().trim().min(2).max(160).optional(),
    company_name: z.string().trim().min(1).max(160).optional(),
    location: z.string().trim().min(1).max(160).optional(),
    experience: z.string().trim().max(120).nullable().optional(),
    salary_min: z.number().int().nonnegative().nullable().optional(),
    salary_max: z.number().int().nonnegative().nullable().optional(),
    description: z.string().trim().max(20000).optional(),
    responsibilities: z.string().trim().max(20000).nullable().optional(),
    qualification: z.string().trim().max(20000).nullable().optional(),
    benefits: z.string().trim().max(20000).nullable().optional(),
    skills: z.array(z.string().trim().max(60)).max(30).nullable().optional(),
    cover_image_url: z.string().trim().url().max(600).nullable().optional(),
    video_url: z.string().trim().url().max(600).nullable().optional(),
    // Empty string means "clear it"; undefined means "leave untouched" so a
    // custom apply URL is never wiped when other fields are edited.
    apply_url: z.string().trim().url().max(600).nullable().optional(),
    status: z.enum(["live", "paused", "closed", "draft"]).optional(),
  }),
});

/** Updates a manually posted job. RLS + DB triggers still gate every field. */
export const updateJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => patchSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertCanManage(context as never, data.jobId);
    const patch = Object.fromEntries(
      Object.entries(data.patch).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase.from("jobs").update(patch).eq("id", data.jobId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Soft delete: the listing disappears everywhere, while applications,
 * interviews and history rows stay intact.
 */
export const deleteJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ jobId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertCanManage(context as never, data.jobId);
    const { error } = await context.supabase
      .from("jobs")
      .update({ deleted_at: new Date().toISOString(), status: "closed", published: false })
      .eq("id", data.jobId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
