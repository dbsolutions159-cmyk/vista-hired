import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { submitApplication } from "@/lib/applications.functions";

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
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: user?.user_metadata?.full_name || "",
      email: user?.email || "",
      mobile: "", city: "", qualification: "", experience: "", current_company: "", cover_letter: "",
    },
  });

  useEffect(() => {
    supabase.from("jobs").select("id, title, company_name").eq("id", id).maybeSingle().then(({ data }) => setJob(data));
  }, [id]);

  useEffect(() => {
    if (user) {
      form.setValue("full_name", user.user_metadata?.full_name || form.getValues("full_name"));
      form.setValue("email", user.email || form.getValues("email"));
    }
  }, [user]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!file) return toast.error("Please attach your resume (PDF/DOC/DOCX)");
    if (!user) return toast.error("Please sign in");
    if (!/\.(pdf|docx?|DOCX?|PDF)$/.test(file.name)) return toast.error("Only PDF, DOC or DOCX files are allowed");
    if (file.size > 5 * 1024 * 1024) return toast.error("Resume must be under 5 MB");

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("resumes").upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      await submit({ data: { ...values, job_id: id, resume_path: path } });
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
        <h1 className="mt-6 font-display text-2xl font-bold">Application Submitted Successfully</h1>
        <p className="mt-2 text-sm text-muted-foreground">We've received your application{job ? ` for ${job.title} at ${job.company_name}` : ""}. Watch your inbox for updates.</p>
        <div className="mt-6 flex gap-2">
          <Button asChild variant="outline"><Link to="/profile">View my applications</Link></Button>
          <Button asChild className="gradient-primary text-primary-foreground"><Link to="/">Browse more jobs</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold">Apply for {job?.title ?? "this role"}</h1>
      {job && <p className="text-sm text-muted-foreground">at {job.company_name}</p>}
      <Card className="mt-6 p-6 shadow-soft">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Full name *</Label><Input {...form.register("full_name")} />{form.formState.errors.full_name && <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>}</div>
            <div className="space-y-1.5"><Label>Email *</Label><Input type="email" {...form.register("email")} />{form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}</div>
            <div className="space-y-1.5"><Label>Mobile *</Label><Input {...form.register("mobile")} />{form.formState.errors.mobile && <p className="text-xs text-destructive">{form.formState.errors.mobile.message}</p>}</div>
            <div className="space-y-1.5"><Label>City *</Label><Input {...form.register("city")} />{form.formState.errors.city && <p className="text-xs text-destructive">{form.formState.errors.city.message}</p>}</div>
            <div className="space-y-1.5"><Label>Highest qualification *</Label><Input placeholder="e.g. B.Tech Computer Science" {...form.register("qualification")} />{form.formState.errors.qualification && <p className="text-xs text-destructive">{form.formState.errors.qualification.message}</p>}</div>
            <div className="space-y-1.5"><Label>Experience *</Label><Input placeholder="e.g. 3 years" {...form.register("experience")} />{form.formState.errors.experience && <p className="text-xs text-destructive">{form.formState.errors.experience.message}</p>}</div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Current company (optional)</Label><Input {...form.register("current_company")} /></div>
          </div>

          <div className="space-y-1.5">
            <Label>Resume * (PDF, DOC, DOCX — max 5 MB)</Label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 hover:bg-muted/50">
              <FileUp className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{file ? file.name : "Click to upload your resume"}</span>
              <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
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
