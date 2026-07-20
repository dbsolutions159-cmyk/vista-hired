import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, CheckCircle2, MapPin, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/post-job")({
  component: PostJob,
  head: () => ({
    meta: [
      { title: "Post a Job — HireSetu" },
      { name: "description", content: "Post a verified job on HireSetu. Reach thousands of qualified candidates in minutes." },
      { property: "og:title", content: "Post a Job — HireSetu" },
      { property: "og:description", content: "Post a verified job on HireSetu. Reach thousands of qualified candidates in minutes." },
    ],
  }),
});

type PosterRole = "recruiter" | "employer" | "hr" | "consultancy";

const initialForm = {
  poster_role: "recruiter" as PosterRole,
  company_name: "",
  company_logo_url: "",
  company_website: "",
  hr_name: "",
  hr_email: "",
  hr_phone: "",
  title: "",
  department: "",
  category: "Engineering",
  employment_type: "full_time" as "full_time" | "part_time" | "contract" | "internship" | "freelance",
  experience: "",
  salary_min: "",
  salary_max: "",
  openings: "1",
  qualification: "",
  skills: "",
  description: "",
  responsibilities: "",
  benefits: "",
  country: "India",
  state: "",
  city: "",
  work_type: "onsite" as "onsite" | "remote" | "hybrid",
  apply_url: "",
};

function PostJob() {
  const { user, isAdmin, loading } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth", replace: false });
  }, [loading, user]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const valid1 = form.company_name.trim() && form.hr_name.trim() && form.hr_email.trim();
  const valid2 = form.title.trim() && form.description.trim() && form.experience.trim();
  const valid3 = form.city.trim();

  const submit = async () => {
    if (!user) return;
    if (!valid1 || !valid2 || !valid3) { toast.error("Please fill all required fields."); return; }
    setSubmitting(true);
    try {
      const role: "admin" | PosterRole = isAdmin ? "admin" : form.poster_role;
      const location = [form.city, form.state, form.country].filter(Boolean).join(", ");
      const payload: any = {
        title: form.title.trim(),
        company_name: form.company_name.trim(),
        company_logo_url: form.company_logo_url.trim() || null,
        company_website: form.company_website.trim() || null,
        hr_name: form.hr_name.trim(),
        hr_email: form.hr_email.trim(),
        hr_phone: form.hr_phone.trim() || null,
        category: form.category || null,
        department: form.department || null,
        description: form.description.trim(),
        responsibilities: form.responsibilities.trim() || null,
        benefits: form.benefits.trim() || null,
        qualification: form.qualification.trim() || null,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        openings: parseInt(form.openings) || 1,
        experience: form.experience.trim(),
        salary_min: form.salary_min ? parseInt(form.salary_min) : null,
        salary_max: form.salary_max ? parseInt(form.salary_max) : null,
        employment_type: form.employment_type,
        work_type: form.work_type,
        location,
        country: form.country || null,
        state: form.state || null,
        apply_url: form.apply_url.trim() || null,
        poster_role: role,
        poster_user_id: user.id,
        created_by: user.id,
        status: isAdmin ? "live" : "pending",
      };
      const { data, error } = await supabase.from("jobs").insert(payload).select("id").single();
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: isAdmin ? "job_live" : "job_submitted",
        title: isAdmin ? "Job published" : "Job submitted for review",
        body: isAdmin ? `${form.title} is now live on HireSetu.` : `${form.title} at ${form.company_name} is pending admin review.`,
        link: isAdmin ? `/jobs/${data.id}` : `/profile`,
      });
      toast.success(isAdmin ? "Job published" : "Submitted for review", { description: isAdmin ? "It's live in the feed." : "You'll be notified after admin approval." });
      nav({ to: isAdmin ? "/" : "/profile" });
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Badge className="mb-2 gradient-primary text-primary-foreground"><Sparkles className="mr-1 h-3 w-3" />Post a Job</Badge>
        <h1 className="font-display text-3xl font-bold">Hire faster with HireSetu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin ? "Admin posts go live instantly with the Verified badge." : "Your submission goes to admin review. You'll be notified once approved."}
        </p>
      </div>

      <div className="mb-6 flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`flex-1 rounded-full h-1.5 ${step >= n ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <Card className="space-y-4 p-6 shadow-soft">
        {step === 1 && (
          <>
            <div className="flex items-center gap-2 font-display text-lg font-semibold"><Building2 className="h-5 w-5 text-primary" />Company & contact</div>
            {!isAdmin && (
              <div className="space-y-1.5">
                <Label>Posting as</Label>
                <Select value={form.poster_role} onValueChange={(v) => set("poster_role", v as PosterRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recruiter">Recruiter</SelectItem>
                    <SelectItem value="employer">Employer (Direct)</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="consultancy">Consultancy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Company name *"><Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} /></Field>
              <Field label="Company website"><Input value={form.company_website} onChange={(e) => set("company_website", e.target.value)} placeholder="https://" /></Field>
              <Field label="Company logo URL"><Input value={form.company_logo_url} onChange={(e) => set("company_logo_url", e.target.value)} placeholder="https://…/logo.png" /></Field>
              <Field label="HR / Recruiter name *"><Input value={form.hr_name} onChange={(e) => set("hr_name", e.target.value)} /></Field>
              <Field label="Official email *"><Input type="email" value={form.hr_email} onChange={(e) => set("hr_email", e.target.value)} /></Field>
              <Field label="Contact number"><Input value={form.hr_phone} onChange={(e) => set("hr_phone", e.target.value)} /></Field>
            </div>
            <div className="flex justify-end">
              <Button className="gradient-primary text-primary-foreground" disabled={!valid1} onClick={() => setStep(2)}>Continue</Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center gap-2 font-display text-lg font-semibold"><Sparkles className="h-5 w-5 text-primary" />Job details</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Job title *"><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
              <Field label="Department"><Input value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="Engineering, Sales…" /></Field>
              <Field label="Category"><Input value={form.category} onChange={(e) => set("category", e.target.value)} /></Field>
              <Field label="Employment type">
                <Select value={form.employment_type} onValueChange={(v: any) => set("employment_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="part_time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Experience *"><Input value={form.experience} onChange={(e) => set("experience", e.target.value)} placeholder="e.g. 2-4 years" /></Field>
              <Field label="Openings"><Input type="number" min={1} value={form.openings} onChange={(e) => set("openings", e.target.value)} /></Field>
              <Field label="Salary min (₹/yr)"><Input type="number" value={form.salary_min} onChange={(e) => set("salary_min", e.target.value)} /></Field>
              <Field label="Salary max (₹/yr)"><Input type="number" value={form.salary_max} onChange={(e) => set("salary_max", e.target.value)} /></Field>
              <Field label="Qualification"><Input value={form.qualification} onChange={(e) => set("qualification", e.target.value)} placeholder="e.g. B.Tech / MBA" /></Field>
              <Field label="Skills (comma separated)"><Input value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="React, TypeScript, Node" /></Field>
            </div>
            <Field label="Job description *"><Textarea rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
            <Field label="Responsibilities"><Textarea rows={3} value={form.responsibilities} onChange={(e) => set("responsibilities", e.target.value)} /></Field>
            <Field label="Benefits"><Textarea rows={3} value={form.benefits} onChange={(e) => set("benefits", e.target.value)} /></Field>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button className="gradient-primary text-primary-foreground" disabled={!valid2} onClick={() => setStep(3)}>Continue</Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex items-center gap-2 font-display text-lg font-semibold"><MapPin className="h-5 w-5 text-primary" />Location & apply</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Country"><Input value={form.country} onChange={(e) => set("country", e.target.value)} /></Field>
              <Field label="State"><Input value={form.state} onChange={(e) => set("state", e.target.value)} /></Field>
              <Field label="City *"><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
            </div>
            <Field label="Work mode">
              <Select value={form.work_type} onValueChange={(v: any) => set("work_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="onsite">Work From Office</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="remote">Work From Home</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="External apply link (optional)"><Input value={form.apply_url} onChange={(e) => set("apply_url", e.target.value)} placeholder="https://careers.company.com/…" /></Field>
            <p className="text-xs text-muted-foreground">Leave blank to collect applications on HireSetu. If set, candidates can also open your link — we'll still capture their application on HireSetu.</p>

            <div className="rounded-xl border bg-primary/5 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-primary" />Before you submit</div>
              <ul className="mt-1 list-disc pl-6 text-muted-foreground">
                <li>{isAdmin ? "Admin posts go live immediately with the Verified badge." : "Your job goes to admin review before appearing in the feed."}</li>
                <li>You'll receive an in-app notification on every status change.</li>
              </ul>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button className="gradient-primary text-primary-foreground" disabled={!valid3 || submitting} onClick={submit}>
                <Send className="mr-1.5 h-4 w-4" />{submitting ? "Submitting…" : isAdmin ? "Publish job" : "Submit for review"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
