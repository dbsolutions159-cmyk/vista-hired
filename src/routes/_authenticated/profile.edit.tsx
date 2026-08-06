import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Download, FileUp, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CompletionRing } from "@/components/CompletionRing";
import { computeCompletionDetail } from "@/lib/profile-completion";

export const Route = createFileRoute("/_authenticated/profile/edit")({
  component: EditProfilePage,
  head: () => ({
    meta: [
      { title: "Edit Candidate Profile · HireSetu" },
      { name: "description", content: "Update your HireSetu candidate profile: details, education, experience, skills and resume." },
      { property: "og:title", content: "Edit Candidate Profile · HireSetu" },
      { property: "og:description", content: "Keep your HireSetu profile complete to unlock one-click apply." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Row = Record<string, any>;

function EditProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [form, setForm] = useState<Row>({});

  const profileQ = useQuery({
    enabled: !!user,
    queryKey: ["profile-edit", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const eduQ = useQuery({
    enabled: !!user,
    queryKey: ["candidate-education", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("candidate_education").select("*").eq("user_id", user!.id).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const expQ = useQuery({
    enabled: !!user,
    queryKey: ["candidate-experience", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("candidate_experience").select("*").eq("user_id", user!.id).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (profileQ.data) setForm(profileQ.data as Row);
  }, [profileQ.data]);

  useEffect(() => {
    (async () => {
      const a = form.avatar_url;
      if (!a) setAvatarUrl(null);
      else if (String(a).startsWith("http")) setAvatarUrl(a);
      else {
        const { data } = await supabase.storage.from("avatars").createSignedUrl(a, 3600);
        setAvatarUrl(data?.signedUrl ?? null);
      }
      if (form.resume_path) {
        const { data } = await supabase.storage.from("resumes").createSignedUrl(form.resume_path, 3600);
        setResumeUrl(data?.signedUrl ?? null);
      } else setResumeUrl(null);
    })();
  }, [form.avatar_url, form.resume_path]);

  const set = (k: string, v: any) => setForm((s) => ({ ...s, [k]: v }));

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 3 * 1024 * 1024) return toast.error("Photo must be under 3 MB");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (error) return toast.error(error.message);
    set("avatar_url", path);
    toast.success("Photo updated — remember to save");
  };

  const uploadResume = async (file: File) => {
    if (!user) return;
    if (!/\.(pdf|docx?)$/i.test(file.name)) return toast.error("Only PDF, DOC or DOCX");
    if (file.size > 5 * 1024 * 1024) return toast.error("Resume must be under 5 MB");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/resume-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("resumes").upload(path, file, { upsert: false, contentType: file.type });
    if (error) return toast.error(error.message);
    setForm((s) => ({ ...s, resume_path: path, resume_name: file.name }));
    toast.success("Resume uploaded — remember to save");
  };

  const save = async () => {
    if (!user) return;
    if (!String(form.full_name ?? "").trim()) return toast.error("Full name is required");
    setSaving(true);
    const payload = {
      id: user.id,
      full_name: form.full_name,
      email: form.email || user.email,
      phone: form.phone ?? null,
      avatar_url: form.avatar_url ?? null,
      city: form.city ?? null,
      state: form.state ?? null,
      headline: form.headline ?? null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender ?? null,
      is_fresher: form.is_fresher ?? null,
      current_job_title: form.current_job_title ?? null,
      current_company: form.current_company ?? null,
      experience_years: form.experience_years ?? null,
      current_salary: form.current_salary ?? null,
      expected_salary: form.expected_salary ?? null,
      notice_period: form.notice_period ?? null,
      preferred_role: form.preferred_role ?? null,
      preferred_location: form.preferred_location ?? null,
      employment_pref: form.employment_pref ?? null,
      work_mode: form.work_mode ?? null,
      education: form.education ?? null,
      skills: form.skills?.length ? form.skills : null,
      languages: form.languages?.length ? form.languages : null,
      experience_summary: form.experience_summary ?? null,
      resume_path: form.resume_path ?? null,
      resume_name: form.resume_name ?? null,
      linkedin_url: form.linkedin_url ?? null,
      portfolio_url: form.portfolio_url ?? null,
    };
    const { error } = await supabase.from("profiles").upsert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["profile"] });
    await qc.invalidateQueries({ queryKey: ["profile-edit"] });
    toast.success("Profile saved");
    navigate({ to: "/profile" });
  };

  const detail = computeCompletionDetail(form as any, eduQ.data ?? [], expQ.data ?? []);
  const initials = (form.full_name || user?.email || "U").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
  const isFresher = form.is_fresher === true;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-28">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
        <Link to="/profile"><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Link>
      </Button>

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
          <CompletionRing pct={detail.pct} size={96} />
        </div>
        {detail.suggestions.length > 0 && (
          <ul className="mt-4 space-y-1 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            {detail.suggestions.map((s) => <li key={s}>• {s}</li>)}
          </ul>
        )}
      </Card>

      {/* BASIC */}
      <Section title="Basic details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input value={form.full_name || ""} onChange={(e) => set("full_name", e.target.value)} /></Field>
          <Field label="Mobile number"><Input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Date of birth"><Input type="date" value={form.date_of_birth || ""} onChange={(e) => set("date_of_birth", e.target.value)} /></Field>
          <Field label="Gender">
            <Select value={form.gender || ""} onChange={(v) => set("gender", v)} options={["Male", "Female", "Other", "Prefer not to say"]} />
          </Field>
          <Field label="Current city"><Input value={form.city || ""} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="State"><Input value={form.state || ""} onChange={(e) => set("state", e.target.value)} /></Field>
          <Field label="Headline"><Input placeholder="e.g. Frontend Developer" value={form.headline || ""} onChange={(e) => set("headline", e.target.value)} /></Field>
        </div>
      </Section>

      {/* PROFESSIONAL */}
      <Section title="Professional details">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="text-sm font-medium">{isFresher ? "Fresher" : "Experienced"}</div>
            <div className="text-xs text-muted-foreground">Toggle if you are a fresher</div>
          </div>
          <Switch checked={isFresher} onCheckedChange={(v) => set("is_fresher", v)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {!isFresher && (
            <>
              <Field label="Current / previous job title"><Input value={form.current_job_title || ""} onChange={(e) => set("current_job_title", e.target.value)} /></Field>
              <Field label="Current / previous company"><Input value={form.current_company || ""} onChange={(e) => set("current_company", e.target.value)} /></Field>
              <Field label="Total experience"><Input placeholder="e.g. 3 years" value={form.experience_years || ""} onChange={(e) => set("experience_years", e.target.value)} /></Field>
              <Field label="Current salary (optional)"><Input placeholder="e.g. ₹6 LPA" value={form.current_salary || ""} onChange={(e) => set("current_salary", e.target.value)} /></Field>
              <Field label="Notice period">
                <Select value={form.notice_period || ""} onChange={(v) => set("notice_period", v)} options={["Immediate", "15 days", "30 days", "60 days", "90 days"]} />
              </Field>
            </>
          )}
          <Field label="Expected salary"><Input placeholder="e.g. ₹8-10 LPA" value={form.expected_salary || ""} onChange={(e) => set("expected_salary", e.target.value)} /></Field>
        </div>
      </Section>

      {/* PREFERENCES */}
      <Section title="Job preferences">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preferred job role"><Input placeholder="e.g. Backend Engineer" value={form.preferred_role || ""} onChange={(e) => set("preferred_role", e.target.value)} /></Field>
          <Field label="Preferred location"><Input value={form.preferred_location || ""} onChange={(e) => set("preferred_location", e.target.value)} /></Field>
          <Field label="Employment type">
            <Select value={form.employment_pref || ""} onChange={(v) => set("employment_pref", v)} options={["Full Time", "Part Time", "Internship", "Contract", "Freelance"]} />
          </Field>
          <Field label="Work mode">
            <Select value={form.work_mode || ""} onChange={(v) => set("work_mode", v)} options={["Work From Office", "Hybrid", "Remote"]} />
          </Field>
        </div>
      </Section>

      {/* EDUCATION */}
      <RecordsSection
        title="Education"
        userId={user?.id}
        table="candidate_education"
        queryKey={["candidate-education", user?.id]}
        rows={eduQ.data ?? []}
        blank={{ degree: "", institution: "", university: "", end_year: "" }}
        fields={[
          { k: "degree", label: "Qualification", placeholder: "B.Tech Computer Science" },
          { k: "institution", label: "Institute / College" },
          { k: "university", label: "University / Board" },
          { k: "end_year", label: "Passing year", placeholder: "2023" },
        ]}
        summary={(r) => [r.degree, r.institution, r.end_year].filter(Boolean).join(" · ")}
      />

      {/* EXPERIENCE */}
      {!isFresher && (
        <RecordsSection
          title="Work experience"
          userId={user?.id}
          table="candidate_experience"
          queryKey={["candidate-experience", user?.id]}
          rows={expQ.data ?? []}
          blank={{ company: "", job_title: "", start_date: "", end_date: "", is_current: false, description: "" }}
          fields={[
            { k: "job_title", label: "Job title" },
            { k: "company", label: "Company" },
            { k: "start_date", label: "Start date", type: "month" },
            { k: "end_date", label: "End date", type: "month" },
            { k: "is_current", label: "Currently working here", type: "switch" },
            { k: "description", label: "Description", type: "textarea", full: true },
          ]}
          summary={(r) => [r.job_title, r.company].filter(Boolean).join(" · ")}
        />
      )}

      {/* SKILLS & LANGUAGES */}
      <Section title="Skills & languages">
        <Field label="Skills">
          <ChipInput values={form.skills || []} onChange={(v) => set("skills", v)} placeholder="Type a skill and press Enter" />
        </Field>
        <Field label="Languages">
          <ChipInput values={form.languages || []} onChange={(v) => set("languages", v)} placeholder="Type a language and press Enter" />
        </Field>
      </Section>

      {/* ABOUT */}
      <Section title="About me">
        <Textarea rows={5} value={form.experience_summary || ""} onChange={(e) => set("experience_summary", e.target.value)} placeholder="A short professional summary about you…" />
      </Section>

      {/* RESUME */}
      <Section title="Resume & links">
        <div>
          <Label>Resume (PDF/DOC — max 5 MB)</Label>
          <div className="mt-1.5 rounded-lg border border-dashed p-4">
            <div className="flex flex-wrap items-center gap-3">
              <FileUp className="h-5 w-5 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm">
                {form.resume_name || form.resume_path?.split("/").pop() || "No resume uploaded"}
              </span>
              <label>
                <Button asChild size="sm" variant="outline">
                  <span className="cursor-pointer">{form.resume_path ? "Replace" : "Upload"}</span>
                </Button>
                <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => e.target.files?.[0] && uploadResume(e.target.files[0])} />
              </label>
              {resumeUrl && (
                <>
                  <Button asChild size="sm" variant="outline"><a href={resumeUrl} target="_blank" rel="noreferrer">View</a></Button>
                  <Button asChild size="sm" variant="outline">
                    <a href={resumeUrl} download={form.resume_name || "resume"}><Download className="mr-1.5 h-3.5 w-3.5" />Download</a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="LinkedIn URL"><Input value={form.linkedin_url || ""} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/…" /></Field>
          <Field label="Portfolio URL"><Input value={form.portfolio_url || ""} onChange={(e) => set("portfolio_url", e.target.value)} placeholder="https://…" /></Field>
        </div>
      </Section>

      <div className="sticky bottom-4 mt-6 flex justify-end">
        <Button onClick={save} disabled={saving} size="lg" className="gradient-primary text-primary-foreground shadow-soft">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save profile"}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mt-4 space-y-4 p-5 sm:p-6">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function ChipInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (!values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
        />
        <Button type="button" variant="outline" onClick={add}><Plus className="h-4 w-4" /></Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v, i) => (
            <Badge key={`${v}-${i}`} variant="secondary" className="rounded-full pl-3 pr-1.5 py-1">
              <button
                type="button"
                className="mr-1 max-w-[10rem] truncate"
                onClick={() => { setDraft(v); onChange(values.filter((_, j) => j !== i)); }}
                title="Click to edit"
              >
                {v}
              </button>
              <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} aria-label={`Remove ${v}`}>
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

type RecordField = { k: string; label: string; placeholder?: string; type?: "text" | "month" | "switch" | "textarea"; full?: boolean };

function RecordsSection({
  title, userId, table, queryKey, rows, blank, fields, summary,
}: {
  title: string;
  userId?: string;
  table: "candidate_education" | "candidate_experience";
  queryKey: unknown[];
  rows: Row[];
  blank: Row;
  fields: RecordField[];
  summary: (r: Row) => string;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey });

  const saveRow = async () => {
    if (!userId || !draft) return;
    setBusy(true);
    const { id, created_at, user_id, ...rest } = draft;
    const payload = { ...rest, user_id: userId } as any;
    const res = id
      ? await supabase.from(table).update(payload).eq("id", id)
      : await supabase.from(table).insert(payload);
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    setDraft(null);
    await refresh();
    toast.success(`${title} saved`);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    await refresh();
    toast.success("Removed");
  };

  return (
    <Card className="mt-4 space-y-4 p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <Button size="sm" variant="outline" onClick={() => setDraft({ ...blank })}><Plus className="mr-1.5 h-3.5 w-3.5" />Add</Button>
      </div>

      {rows.length === 0 && !draft && <p className="text-sm text-muted-foreground">No {title.toLowerCase()} added yet.</p>}

      {rows.map((r) => (
        <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{summary(r) || "Untitled"}</div>
            {r.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>}
            {(r.university || r.start_date) && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {r.university || [r.start_date, r.is_current ? "Present" : r.end_date].filter(Boolean).join(" – ")}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
            <Button size="sm" variant="ghost" onClick={() => setDraft({ ...r })}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => remove(r.id)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        </div>
      ))}

      {draft && (
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.k} className={f.full || f.type === "textarea" ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
                <Label>{f.label}</Label>
                {f.type === "switch" ? (
                  <div className="pt-1">
                    <Switch checked={!!draft[f.k]} onCheckedChange={(v) => setDraft({ ...draft, [f.k]: v, ...(v ? { end_date: "" } : {}) })} />
                  </div>
                ) : f.type === "textarea" ? (
                  <Textarea rows={3} value={draft[f.k] || ""} onChange={(e) => setDraft({ ...draft, [f.k]: e.target.value })} />
                ) : (
                  <Input
                    type={f.type === "month" ? "month" : "text"}
                    placeholder={f.placeholder}
                    disabled={f.k === "end_date" && !!draft.is_current}
                    value={draft[f.k] || ""}
                    onChange={(e) => setDraft({ ...draft, [f.k]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            <Button size="sm" onClick={saveRow} disabled={busy} className="gradient-primary text-primary-foreground">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
