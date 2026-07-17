import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ApplicationInput = z.object({
  job_id: z.string().uuid(),
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  mobile: z.string().trim().min(6).max(20),
  city: z.string().trim().min(2).max(120),
  qualification: z.string().trim().min(2).max(200),
  experience: z.string().trim().min(1).max(60),
  current_company: z.string().trim().max(200).optional().nullable(),
  cover_letter: z.string().trim().max(4000).optional().nullable(),
  resume_path: z.string().min(1),
});

export const submitApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => ApplicationInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: job, error: jobErr } = await supabase.from("jobs").select("id, title, company_name").eq("id", data.job_id).maybeSingle();
    if (jobErr || !job) throw new Error("Job not found");

    // Signed URL for resume (private bucket)
    const { data: signed, error: signErr } = await supabase.storage.from("resumes").createSignedUrl(data.resume_path, 60 * 60 * 24 * 30);
    if (signErr) throw new Error("Failed to prepare resume link");

    const { error: insErr } = await supabase.from("applications").insert({
      job_id: data.job_id,
      user_id: userId,
      full_name: data.full_name,
      email: data.email,
      mobile: data.mobile,
      city: data.city,
      qualification: data.qualification,
      experience: data.experience,
      current_company: data.current_company || null,
      cover_letter: data.cover_letter || null,
      resume_path: data.resume_path,
      resume_url: signed.signedUrl,
    });
    if (insErr) {
      if (insErr.code === "23505") throw new Error("You've already applied to this job.");
      throw new Error(insErr.message);
    }

    // Email confirmations require an email domain (Cloud → Emails). When configured,
    // wire up sendLovableEmail here; until then the application is saved without email.
    return { ok: true };
  });
