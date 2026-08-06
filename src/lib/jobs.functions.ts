import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Increments a job's view counter server-side. Runs with trusted credentials so
 * anonymous visitors never need direct database write access.
 */
export const incrementJobView = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ jobId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: job } = await supabaseAdmin
      .from("jobs")
      .select("view_count, published")
      .eq("id", data.jobId)
      .maybeSingle();
    if (!job?.published) return { ok: false };
    await supabaseAdmin
      .from("jobs")
      .update({ view_count: (job.view_count ?? 0) + 1 })
      .eq("id", data.jobId);
    return { ok: true };
  });
