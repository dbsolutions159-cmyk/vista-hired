import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, FileUp, Loader2, Zap } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { submitApplication } from "@/lib/applications.functions";
import { computeCompletion } from "@/lib/profile-completion";

export const Route = createFileRoute("/_authenticated/apply/$id")({
  component: ApplyPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email"),
  mobile: z.string().trim().min(6, "Enter a valid mobile number").max(20),
  city: z.string().trim().min(2, "Enter your city"),
  qualification: z.string().trim().min(2, "Enter your qualification"),
  experience: z.string().trim().min(1, "Enter your experience"),
  current_company: z.string().trim().max(200).optional(),
  cover_letter: z.string().trim().max(4000).optional(),
});
type FormData = z.infer<typeof schema>;

function ApplyPage() {
  const { id } = useParams({ from: "/_authenticated/apply/$id" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const submit = useServerFn(submitApplication);

  const [job, setJob] = useState<{ id: string; title: string; company_name: string } | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "", email: user?.email || "",
      mobile: "", city: "", qualification: "", experience: "", current_company: "", cover_letter: "",
    },
  });

  useEffect(() => {
    supabase.from("jobs").select("id, title, company_name").eq("id", id).maybeSingle().then(({ data }) => setJob(data));
  }, [id]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      setProfile(data);
      if (data) {
        form.reset({
          full_name: data.full_name || user.user_metadata?.full_name || "",
          email: data.email || user.email || "",
          mobile: data.phone || "",
          city: data.city || "",
          qualification: data.education || "",
          experience: data.experience_years || "",
          current_company: data.current_company || "",
          cover_letter: "",
        });
      }
    });
  }, [user]);

  const pct = computeCompletion(profile);
  const canOneClick = pct === 100 && !!profile?.resume_path;

  const oneClickApply = async () => {
    if (!user || !profile) return;
    setUploading(true);
    try {
      await submit({
        data: {
          job_id: id,
          full_name: profile.full_name,
          email: profile.email || user.email!,
          mobile: profile.phone,
          city: profile.city,
          qualification: profile.education,
          experience: profile.experience_years,
          current_company: profile.current_company || null,
          cover_letter: null,
          resume_path: profile.resume_path,
        },
      });
      setDone(true);
      toast.success("Applied in one click ⚡");
    } catch (e: any) {
      toast.error(e.message || "Failed to apply");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (!user) return toast.error("Please sign in");
    let resumePath = profile?.resume_path as string | undefined;
    if (file) {
      if (!/\.(pdf|docx?|DOCX?|PDF)$/.test(file.name)) return toast.error("Only PDF, DOC or DOCX files are allowed");
      if (file.size > 5 * 1024 * 1024) return toast.error("Resume must be under 5 MB");
    } else if (!resumePath) {
      return toast.error("Please attach your resume (or save one in your profile)");
    }

    setUploading(true);
    try {
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("resumes").upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        resumePath = path;
        // also update saved profile resume for future one-click apply
        await supabase.from("profiles").update({ resume_path: path, resume_name: file.name }).eq("id", user.id);
      }
      await submit({ data: { ...values, job_id: id, resume_path: resumePath! } });
      setDone(true);
      toast.success("Application submitted successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit application");
    } finally {
      setUploading(false);
    }
  });

  if (done) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-success/10 text-success animate-in zoom-in duration-500">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold">Application Submitted</h1>
        <p className="mt-2 text-sm text-muted-foreground">We've received your application{job ? ` for ${job.title} at ${job.company_name}` : ""}.</p>
        <div className="mt-6 flex gap-2">
          <Button asChild variant="outline"><Link to="/profile">My applications</Link></Button>
          <Button asChild className="gradient-primary text-primary-foreground"><Link to="/">Browse more</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="font-display text-2xl font-bold">Apply for {job?.title ?? "this role"}</h1>
      {job && <p className="text-sm text-muted-foreground">at {job.company_name}</p>}

      {canOneClick && (
        <Card className="mt-4 border-primary/40 bg-primary/5 p-5 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-semibold text-primary"><Zap className="h-4 w-4" />One-Click Apply</div>
              <p className="mt-1 text-xs text-muted-foreground">Uses your saved profile & resume — no re-upload needed.</p>
            </div>
            <Button onClick={oneClickApply} disabled={uploading} className="gradient-primary text-primary-foreground shadow-soft shrink-0">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Apply ⚡</>}
            </Button>
          </div>
        </Card>
      )}

      {!canOneClick && user && (
        <Card className="mt-4 border-warning/40 bg-warning/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs">Complete your profile to unlock <b>One-Click Apply</b> ({pct}%).</p>
            <Button asChild size="sm" variant="outline"><Link to="/profile/edit">Complete</Link></Button>
          </div>
        </Card>
      )}

      <Card className="mt-4 p-6 shadow-soft">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Full name *</Label><Input {...form.register("full_name")} />{form.formState.errors.full_name && <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>}</div>
            <div className="space-y-1.5"><Label>Email *</Label><Input type="email" {...form.register("email")} />{form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}</div>
            <div className="space-y-1.5"><Label>Mobile *</Label><Input {...form.register("mobile")} />{form.formState.errors.mobile && <p className="text-xs text-destructive">{form.formState.errors.mobile.message}</p>}</div>
            <div className="space-y-1.5"><Label>City *</Label><Input {...form.register("city")} />{form.formState.errors.city && <p className="text-xs text-destructive">{form.formState.errors.city.message}</p>}</div>
            <div className="space-y-1.5"><Label>Highest qualification *</Label><Input placeholder="e.g. B.Tech" {...form.register("qualification")} />{form.formState.errors.qualification && <p className="text-xs text-destructive">{form.formState.errors.qualification.message}</p>}</div>
            <div className="space-y-1.5"><Label>Experience *</Label><Input placeholder="e.g. 3 years" {...form.register("experience")} />{form.formState.errors.experience && <p className="text-xs text-destructive">{form.formState.errors.experience.message}</p>}</div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Current company (optional)</Label><Input {...form.register("current_company")} /></div>
          </div>

          <div className="space-y-1.5">
            <Label>Resume {profile?.resume_path ? "(saved — replace optional)" : "* (PDF, DOC, DOCX — max 5 MB)"}</Label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 hover:bg-muted/50">
              <FileUp className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{file ? file.name : profile?.resume_name || profile?.resume_path?.split("/").pop() || "Click to upload your resume"}</span>
              <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
            </label>
          </div>

          <div className="space-y-1.5"><Label>Cover letter (optional)</Label><Textarea rows={5} placeholder="Tell them why you're a great fit…" {...form.register("cover_letter")} /></div>

          <Button type="submit" disabled={uploading} size="lg" className="w-full gradient-primary text-primary-foreground shadow-soft">
            {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : "Submit application"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
