import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, FileUp, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CompletionRing } from "@/components/CompletionRing";
import { computeCompletion } from "@/lib/profile-completion";

export const Route = createFileRoute("/_authenticated/profile/edit")({
  component: EditProfilePage,
});

function EditProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);

  const profileQ = useQuery({
    enabled: !!user,
    queryKey: ["profile-edit", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<any>({});
  useEffect(() => { if (profileQ.data) setForm(profileQ.data); }, [profileQ.data]);

  useEffect(() => {
    (async () => {
      if (form.avatar_url?.startsWith("http")) setAvatarUrl(form.avatar_url);
      else if (form.avatar_url) {
        const { data } = await supabase.storage.from("avatars").createSignedUrl(form.avatar_url, 3600);
        setAvatarUrl(data?.signedUrl ?? null);
      } else setAvatarUrl(null);
      if (form.resume_path) {
        const { data } = await supabase.storage.from("resumes").createSignedUrl(form.resume_path, 3600);
        setResumeUrl(data?.signedUrl ?? null);
      }
    })();
  }, [form.avatar_url, form.resume_path]);

  const set = (k: string, v: any) => setForm((s: any) => ({ ...s, [k]: v }));
  const setCsv = (k: string, v: string) => setForm((s: any) => ({ ...s, [k]: v.split(",").map((x) => x.trim()).filter(Boolean) }));

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 3 * 1024 * 1024) return toast.error("Photo must be under 3 MB");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (error) return toast.error(error.message);
    set("avatar_url", path);
    toast.success("Photo updated");
  };

  const uploadResume = async (file: File) => {
    if (!user) return;
    if (!/\.(pdf|docx?|DOCX?|PDF)$/.test(file.name)) return toast.error("Only PDF, DOC or DOCX");
    if (file.size > 5 * 1024 * 1024) return toast.error("Resume must be under 5 MB");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/resume-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("resumes").upload(path, file, { upsert: false, contentType: file.type });
    if (error) return toast.error(error.message);
    setForm((s: any) => ({ ...s, resume_path: path, resume_name: file.name }));
    toast.success("Resume uploaded");
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      id: user.id,
      full_name: form.full_name, email: form.email || user.email, phone: form.phone,
      avatar_url: form.avatar_url, city: form.city, headline: form.headline,
      date_of_birth: form.date_of_birth || null, gender: form.gender,
      preferred_location: form.preferred_location, education: form.education,
      skills: form.skills || null, experience_years: form.experience_years,
      experience_summary: form.experience_summary, current_company: form.current_company,
      languages: form.languages || null, expected_salary: form.expected_salary,
      employment_pref: form.employment_pref, resume_path: form.resume_path, resume_name: form.resume_name,
      linkedin_url: form.linkedin_url, portfolio_url: form.portfolio_url,
    };
    const { error } = await supabase.from("profiles").upsert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    navigate({ to: "/profile" });
  };

  const pct = computeCompletion(form);
  const initials = (form.full_name || user?.email || "U").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3"><Link to="/profile"><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Link></Button>

      <Card className="p-5 sm:p-6 shadow-soft">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative shrink-0">
              <Avatar className="h-20 w-20 ring-2 ring-primary/20">
                <AvatarImage src={avatarUrl ?? undefined} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-1 -right-1 grid h-8 w-8 cursor-pointer place-items-center rounded-full gradient-primary text-primary-foreground shadow-soft">
                <Upload className="h-4 w-4" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
              </label>
            </div>
            <div className="min-w-0">
              <div className="truncate font-display text-lg font-bold">{form.full_name || "Your name"}</div>
              <div className="truncate text-sm text-muted-foreground">{form.email || user?.email}</div>
            </div>
          </div>
          <CompletionRing pct={pct} size={96} />
        </div>
      </Card>

      <Card className="mt-4 space-y-4 p-5 sm:p-6">
        <h2 className="font-semibold">Basics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input value={form.full_name || ""} onChange={(e) => set("full_name", e.target.value)} /></Field>
          <Field label="Mobile"><Input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Date of birth"><Input type="date" value={form.date_of_birth || ""} onChange={(e) => set("date_of_birth", e.target.value)} /></Field>
          <Field label="Gender">
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.gender || ""} onChange={(e) => set("gender", e.target.value)}>
              <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
            </select>
          </Field>
          <Field label="Current location"><Input value={form.city || ""} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="Preferred job location"><Input value={form.preferred_location || ""} onChange={(e) => set("preferred_location", e.target.value)} /></Field>
        </div>
      </Card>

      <Card className="mt-4 space-y-4 p-5 sm:p-6">
        <h2 className="font-semibold">Career</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Highest education"><Input placeholder="e.g. B.Tech Computer Science" value={form.education || ""} onChange={(e) => set("education", e.target.value)} /></Field>
          <Field label="Experience"><Input placeholder="e.g. 3 years" value={form.experience_years || ""} onChange={(e) => set("experience_years", e.target.value)} /></Field>
          <Field label="Current company"><Input value={form.current_company || ""} onChange={(e) => set("current_company", e.target.value)} /></Field>
          <Field label="Expected salary"><Input placeholder="e.g. ₹8-10 LPA" value={form.expected_salary || ""} onChange={(e) => set("expected_salary", e.target.value)} /></Field>
          <Field label="Employment preference">
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.employment_pref || ""} onChange={(e) => set("employment_pref", e.target.value)}>
              <option value="">Select</option><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option><option>Freelance</option>
            </select>
          </Field>
          <Field label="Skills (comma separated)"><Input value={(form.skills || []).join(", ")} onChange={(e) => setCsv("skills", e.target.value)} placeholder="React, TypeScript, Node.js" /></Field>
          <Field label="Languages (comma separated)"><Input value={(form.languages || []).join(", ")} onChange={(e) => setCsv("languages", e.target.value)} placeholder="English, Hindi" /></Field>
        </div>
        <Field label="Experience summary"><Textarea rows={4} value={form.experience_summary || ""} onChange={(e) => set("experience_summary", e.target.value)} placeholder="Brief summary of your work…" /></Field>
      </Card>

      <Card className="mt-4 space-y-4 p-5 sm:p-6">
        <h2 className="font-semibold">Resume & Links</h2>
        <div>
          <Label>Resume (PDF/DOC — max 5 MB)</Label>
          <label className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 hover:bg-muted/50">
            <FileUp className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm flex-1 truncate">{form.resume_name || form.resume_path?.split("/").pop() || "Click to upload"}</span>
            {resumeUrl && <a href={resumeUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline" onClick={(e) => e.stopPropagation()}>View</a>}
            <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => e.target.files?.[0] && uploadResume(e.target.files[0])} />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="LinkedIn URL"><Input value={form.linkedin_url || ""} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/…" /></Field>
          <Field label="Portfolio URL"><Input value={form.portfolio_url || ""} onChange={(e) => set("portfolio_url", e.target.value)} placeholder="https://…" /></Field>
        </div>
      </Card>

      <div className="sticky bottom-4 mt-6 flex justify-end">
        <Button onClick={save} disabled={saving} size="lg" className="gradient-primary text-primary-foreground shadow-soft">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save profile"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
