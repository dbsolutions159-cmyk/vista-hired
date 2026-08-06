import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  Eye,
  ImagePlus,
  MapPin,
  Send,
  Sparkles,
  Trash2,
  Upload,
  Video as VideoIcon,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getJobTemplate, TEMPLATE_SUGGESTIONS } from "@/lib/job-templates";
import ogFallback from "@/assets/hiresetu-og.jpg.asset.json";

export const Route = createFileRoute("/post-job")({
  component: PostJob,
  head: () => ({
    meta: [
      { title: "Post a Job — HireSetu" },
      {
        name: "description",
        content:
          "Post a verified job on HireSetu in minutes. Smart templates fill the details for you.",
      },
      { property: "og:title", content: "Post a Job — HireSetu" },
      {
        property: "og:description",
        content:
          "Post a verified job on HireSetu in minutes. Smart templates fill the details for you.",
      },
    ],
  }),
});

type PosterRole = "recruiter" | "employer" | "hr" | "consultancy";

const FALLBACK_COVER = ogFallback.url;
// Long-lived signed URL — 10 years
const URL_TTL = 60 * 60 * 24 * 365 * 10;

const initialForm = {
  poster_role: "recruiter" as PosterRole,
  // required
  company_name: "",
  title: "",
  salary_min: "",
  salary_max: "",
  city: "",
  // optional
  state: "",
  country: "India",
  work_type: "onsite" as "onsite" | "remote" | "hybrid",
  employment_type: "full_time" as
    | "full_time"
    | "part_time"
    | "contract"
    | "internship"
    | "freelance",
  experience: "",
  openings: "1",
  category: "",
  department: "",
  qualification: "",
  skills: "",
  description: "",
  responsibilities: "",
  benefits: "",
  // contact
  hr_name: "",
  hr_email: "",
  hr_phone: "",
  company_website: "",
  apply_url: "",
  // media
  cover_image_url: "",
  company_logo_url: "",
  video_url: "",
};

type FormState = typeof initialForm;

function PostJob() {
  const { user, isAdmin, loading } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [templateApplied, setTemplateApplied] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth", replace: false });
  }, [loading, user]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Autofill template when the title matches a known role — only once,
  // and never overwrite what the recruiter has already typed.
  useEffect(() => {
    const tpl = getJobTemplate(form.title);
    if (!tpl) return;
    if (templateApplied === form.title.trim().toLowerCase()) return;
    setForm((f) => ({
      ...f,
      description: f.description.trim() ? f.description : tpl.description,
      responsibilities: f.responsibilities.trim()
        ? f.responsibilities
        : tpl.responsibilities,
      qualification: f.qualification.trim() ? f.qualification : tpl.qualification,
      benefits: f.benefits.trim() ? f.benefits : tpl.benefits,
      skills: f.skills.trim() ? f.skills : tpl.skills,
    }));
    setTemplateApplied(form.title.trim().toLowerCase());
    toast.success("Smart template applied", {
      description: "We've pre-filled the job details. Edit anything before you publish.",
    });
  }, [form.title, templateApplied]);

  const valid1 =
    !!form.company_name.trim() &&
    !!form.title.trim() &&
    !!form.city.trim() &&
    (!!form.salary_min.trim() || !!form.salary_max.trim());

  const canPublish = valid1 && !!form.description.trim();

  const submit = async () => {
    if (!user) return;
    if (!canPublish) {
      toast.error("Fill company, title, salary, location and description.");
      return;
    }
    setSubmitting(true);
    try {
      const role: "admin" | PosterRole = isAdmin ? "admin" : form.poster_role;
      const location = [form.city, form.state, form.country]
        .filter(Boolean)
        .join(", ");
      const payload: any = {
        title: form.title.trim(),
        company_name: form.company_name.trim(),
        company_logo_url: form.company_logo_url || null,
        company_website: form.company_website.trim() || null,
        cover_image_url: form.cover_image_url || null,
        video_url: form.video_url || null,
        category: form.category.trim() || null,
        department: form.department.trim() || null,
        description: form.description.trim(),
        responsibilities: form.responsibilities.trim() || null,
        benefits: form.benefits.trim() || null,
        qualification: form.qualification.trim() || null,
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        openings: parseInt(form.openings) || 1,
        experience: form.experience.trim() || null,
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
      const { data, error } = await supabase
        .from("jobs")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: user.id,
        type: isAdmin ? "job_live" : "job_submitted",
        title: isAdmin ? "Job published" : "Job submitted for review",
        body: isAdmin
          ? `${form.title} is now live on HireSetu.`
          : `${form.title} at ${form.company_name} is pending admin review.`,
        link: isAdmin ? `/jobs/${data.id}` : `/profile`,
      });

      if (isAdmin) {
        const shareUrl = `${window.location.origin}/jobs/${data.id}`;
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success("Published! Share link copied", { description: shareUrl });
        } catch {
          toast.success("Published to HireSetu");
        }
        nav({ to: "/jobs/$id", params: { id: data.id } });
      } else {
        toast.success("Submitted for review", {
          description: "You'll be notified after admin approval.",
        });
        nav({ to: "/profile" });
      }
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
        <Badge className="mb-2 gradient-primary text-primary-foreground">
          <Sparkles className="mr-1 h-3 w-3" />
          Post a Job
        </Badge>
        <h1 className="font-display text-3xl font-bold">Hire faster with HireSetu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? "Admin posts go live instantly with the Verified badge."
            : "Your submission goes to admin review. You'll be notified once approved."}
        </p>
      </div>

      <Stepper step={step} />

      {step === 1 && (
        <StepBasics
          form={form}
          set={set}
          isAdmin={isAdmin}
          onNext={() => {
            if (!valid1) {
              toast.error("Company, title, salary and location are required.");
              return;
            }
            setStep(2);
          }}
        />
      )}

      {step === 2 && (
        <StepDetails
          form={form}
          set={set}
          onBack={() => setStep(1)}
          onNext={() => {
            if (!form.description.trim()) {
              toast.error("A job description is required.");
              return;
            }
            setStep(3);
          }}
        />
      )}

      {step === 3 && (
        <StepPreview
          form={form}
          isAdmin={isAdmin}
          submitting={submitting}
          onBack={() => setStep(2)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const labels = ["Basics", "Details & media", "Preview & publish"] as const;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full ${step >= n ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        {labels.map((l, i) => (
          <span key={l} className={step === i + 1 ? "font-medium text-foreground" : ""}>
            {i + 1}. {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ---------- STEP 1 ---------- */

function StepBasics({
  form,
  set,
  isAdmin,
  onNext,
}: {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  isAdmin: boolean;
  onNext: () => void;
}) {
  return (
    <Card className="space-y-5 p-6 shadow-soft">
      <div className="flex items-center gap-2 font-display text-lg font-semibold">
        <Building2 className="h-5 w-5 text-primary" />
        Basics
      </div>
      <p className="-mt-3 text-sm text-muted-foreground">
        Just 4 fields to start. We'll pre-fill the rest based on the job title.
      </p>

      {!isAdmin && (
        <Field label="Posting as">
          <Select
            value={form.poster_role}
            onValueChange={(v) => set("poster_role", v as PosterRole)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recruiter">Recruiter</SelectItem>
              <SelectItem value="employer">Employer (Direct)</SelectItem>
              <SelectItem value="hr">HR</SelectItem>
              <SelectItem value="consultancy">Consultancy</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name *">
          <Input
            value={form.company_name}
            onChange={(e) => set("company_name", e.target.value)}
            placeholder="Acme Pvt Ltd"
          />
        </Field>
        <Field
          label="Job title *"
          hint="Try: Customer Support Executive, Sales Executive, HR Recruiter…"
        >
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            list="title-suggestions"
            placeholder="e.g. Sales Executive"
          />
          <datalist id="title-suggestions">
            {TEMPLATE_SUGGESTIONS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TEMPLATE_SUGGESTIONS.slice(0, 6).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("title", t)}
                className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs hover:bg-primary/10 hover:text-primary"
              >
                <Wand2 className="mr-1 inline h-3 w-3" />
                {t}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Salary min (₹/yr) *">
          <Input
            type="number"
            inputMode="numeric"
            value={form.salary_min}
            onChange={(e) => set("salary_min", e.target.value)}
            placeholder="300000"
          />
        </Field>
        <Field label="Salary max (₹/yr)">
          <Input
            type="number"
            inputMode="numeric"
            value={form.salary_max}
            onChange={(e) => set("salary_max", e.target.value)}
            placeholder="600000"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City *">
          <Input
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="Bengaluru"
          />
        </Field>
        <Field label="State">
          <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
        </Field>
        <Field label="Country">
          <Input
            value={form.country}
            onChange={(e) => set("country", e.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Work mode">
          <Select
            value={form.work_type}
            onValueChange={(v: any) => set("work_type", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="onsite">Work From Office</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="remote">Work From Home</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Employment type">
          <Select
            value={form.employment_type}
            onValueChange={(v: any) => set("employment_type", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full_time">Full-time</SelectItem>
              <SelectItem value="part_time">Part-time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
              <SelectItem value="freelance">Freelance</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="flex justify-end">
        <Button
          className="gradient-primary text-primary-foreground"
          onClick={onNext}
        >
          Continue
        </Button>
      </div>
    </Card>
  );
}

/* ---------- STEP 2 ---------- */

function StepDetails({
  form,
  set,
  onBack,
  onNext,
}: {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <Card className="space-y-5 p-6 shadow-soft">
      <div className="flex items-center gap-2 font-display text-lg font-semibold">
        <Sparkles className="h-5 w-5 text-primary" />
        Details & media
      </div>

      {/* Media */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <ImagePlus className="h-4 w-4 text-primary" />
          Media
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <MediaUpload
            label="Cover image"
            hint="Shown on the card. If empty we'll use the HireSetu banner."
            accept="image/jpeg,image/png,image/webp"
            kind="cover"
            value={form.cover_image_url}
            onChange={(url) => set("cover_image_url", url)}
          />
          <MediaUpload
            label="Company logo (optional)"
            accept="image/jpeg,image/png,image/webp"
            kind="logo"
            value={form.company_logo_url}
            onChange={(url) => set("company_logo_url", url)}
          />
          <MediaUpload
            label="Job video (optional)"
            hint="MP4, up to ~50 MB."
            accept="video/mp4"
            kind="video"
            value={form.video_url}
            onChange={(url) => set("video_url", url)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Experience">
          <Input
            value={form.experience}
            onChange={(e) => set("experience", e.target.value)}
            placeholder="e.g. 0-2 years / Freshers welcome"
          />
        </Field>
        <Field label="Openings">
          <Input
            type="number"
            min={1}
            value={form.openings}
            onChange={(e) => set("openings", e.target.value)}
          />
        </Field>
        <Field label="Qualification">
          <Input
            value={form.qualification}
            onChange={(e) => set("qualification", e.target.value)}
            placeholder="e.g. Graduate / B.Tech / 12th pass"
          />
        </Field>
        <Field label="Skills (comma separated)">
          <Input
            value={form.skills}
            onChange={(e) => set("skills", e.target.value)}
            placeholder="Communication, CRM, Excel"
          />
        </Field>
      </div>

      <Field label="Job description *">
        <Textarea
          rows={6}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>
      <Field label="Responsibilities">
        <Textarea
          rows={5}
          value={form.responsibilities}
          onChange={(e) => set("responsibilities", e.target.value)}
        />
      </Field>
      <Field label="Benefits">
        <Textarea
          rows={4}
          value={form.benefits}
          onChange={(e) => set("benefits", e.target.value)}
        />
      </Field>

      {/* Contact */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="mb-3 text-sm font-medium">Contact (optional but recommended)</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="HR / Recruiter name">
            <Input
              value={form.hr_name}
              onChange={(e) => set("hr_name", e.target.value)}
            />
          </Field>
          <Field label="Official email">
            <Input
              type="email"
              value={form.hr_email}
              onChange={(e) => set("hr_email", e.target.value)}
            />
          </Field>
          <Field label="Contact number">
            <Input
              value={form.hr_phone}
              onChange={(e) => set("hr_phone", e.target.value)}
            />
          </Field>
          <Field label="Company website">
            <Input
              value={form.company_website}
              onChange={(e) => set("company_website", e.target.value)}
              placeholder="https://"
            />
          </Field>
          <Field label="External apply link">
            <Input
              value={form.apply_url}
              onChange={(e) => set("apply_url", e.target.value)}
              placeholder="https://careers.company.com/…"
            />
          </Field>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          className="gradient-primary text-primary-foreground"
          onClick={onNext}
        >
          <Eye className="mr-1.5 h-4 w-4" />
          Preview
        </Button>
      </div>
    </Card>
  );
}

/* ---------- STEP 3 (Preview) ---------- */

function StepPreview({
  form,
  isAdmin,
  submitting,
  onBack,
  onSubmit,
}: {
  form: FormState;
  isAdmin: boolean;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const cover = form.cover_image_url || FALLBACK_COVER;
  const location = useMemo(
    () => [form.city, form.state, form.country].filter(Boolean).join(", "),
    [form.city, form.state, form.country]
  );
  const salary = useMemo(() => {
    const fmt = (n: string) => {
      const v = parseInt(n);
      if (!v) return "";
      if (v >= 10000000) return `${(v / 10000000).toFixed(1)} Cr`;
      if (v >= 100000) return `${(v / 100000).toFixed(1)} L`;
      return v.toLocaleString("en-IN");
    };
    if (form.salary_min && form.salary_max)
      return `₹${fmt(form.salary_min)} – ₹${fmt(form.salary_max)}`;
    if (form.salary_min || form.salary_max)
      return `₹${fmt(form.salary_min || form.salary_max)}`;
    return "Not disclosed";
  }, [form.salary_min, form.salary_max]);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden shadow-soft">
        <div className="relative">
          <img
            src={cover}
            alt=""
            className="h-44 w-full object-cover sm:h-56"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border bg-background">
              {form.company_logo_url ? (
                <img
                  src={form.company_logo_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="min-w-0 pb-1 text-white drop-shadow">
              <div className="truncate text-xs opacity-90">{form.company_name}</div>
              <div className="truncate font-display text-lg font-semibold sm:text-xl">
                {form.title}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {location || "Location"}
            </span>
            <span className="font-semibold text-foreground">{salary}</span>
            {form.experience && <span>· {form.experience}</span>}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="rounded-full">
              {form.work_type === "remote"
                ? "Remote"
                : form.work_type === "hybrid"
                ? "Hybrid"
                : "On-site"}
            </Badge>
            <Badge variant="secondary" className="rounded-full">
              {form.employment_type.replace("_", " ")}
            </Badge>
            {isAdmin && (
              <Badge className="gradient-primary rounded-full text-primary-foreground">
                Verified by HireSetu
              </Badge>
            )}
          </div>

          {form.video_url && (
            <video
              src={form.video_url}
              controls
              playsInline
              className="w-full rounded-xl border bg-black"
            />
          )}

          <PreviewSection title="About the role" body={form.description} />
          {form.responsibilities && (
            <PreviewSection title="Responsibilities" body={form.responsibilities} />
          )}
          {form.qualification && (
            <PreviewSection title="Qualification" body={form.qualification} />
          )}
          {form.benefits && <PreviewSection title="Benefits" body={form.benefits} />}
          {form.skills && (
            <div>
              <div className="mb-1.5 text-sm font-semibold">Skills</div>
              <div className="flex flex-wrap gap-1.5">
                {form.skills
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((s) => (
                    <Badge key={s} variant="outline" className="rounded-full">
                      {s}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="rounded-xl border bg-primary/5 p-4 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Before you publish
        </div>
        <ul className="mt-1 list-disc pl-6 text-muted-foreground">
          <li>
            {isAdmin
              ? "Admin posts go live immediately with the Verified badge and appear on Home & Jobs."
              : "Your job goes to admin review before appearing on Home & Jobs."}
          </li>
          <li>A shareable link is generated automatically.</li>
        </ul>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to edit
        </Button>
        <Button
          className="gradient-primary text-primary-foreground"
          disabled={submitting}
          onClick={onSubmit}
        >
          <Send className="mr-1.5 h-4 w-4" />
          {submitting ? "Publishing…" : isAdmin ? "Publish job" : "Submit for review"}
        </Button>
      </div>
    </div>
  );
}

function PreviewSection({ title, body }: { title: string; body: string }) {
  if (!body?.trim()) return null;
  return (
    <div>
      <div className="mb-1.5 text-sm font-semibold">{title}</div>
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

/* ---------- Media upload widget ---------- */

function MediaUpload({
  label,
  hint,
  accept,
  kind,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  accept: string;
  kind: "cover" | "logo" | "video";
  value: string;
  onChange: (url: string) => void;
}) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const isVideo = kind === "video";
  const maxMB = isVideo ? 50 : 5;

  const handleFile = async (file: File) => {
    if (!user) {
      toast.error("Sign in to upload");
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`File too large. Max ${maxMB} MB.`);
      return;
    }
    const okType = accept.split(",").some((t) => file.type === t.trim());
    if (!okType) {
      toast.error("Unsupported file format.");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");
      const path = `${user.id}/${kind}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("job-media").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("job-media")
        .createSignedUrl(path, URL_TTL);
      if (signed.error || !signed.data?.signedUrl) throw signed.error;
      onChange(signed.data.signedUrl);
      toast.success(`${label} uploaded`);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative overflow-hidden rounded-xl border bg-background">
        {value ? (
          isVideo ? (
            <video src={value} className="h-28 w-full object-cover" muted playsInline />
          ) : (
            <img src={value} alt="" className="h-28 w-full object-cover" />
          )
        ) : (
          <div className="flex h-28 w-full flex-col items-center justify-center gap-1 text-muted-foreground">
            {isVideo ? (
              <VideoIcon className="h-6 w-6" />
            ) : (
              <ImagePlus className="h-6 w-6" />
            )}
            <span className="text-xs">Tap to upload</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{hint || `Max ${maxMB} MB`}</span>
        {value ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-destructive hover:underline"
            onClick={() => onChange("")}
          >
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        ) : (
          <span className="inline-flex items-center gap-1">
            <Upload className="h-3 w-3" />
            {busy ? "Uploading…" : "Choose file"}
          </span>
        )}
      </div>
    </div>
  );
}
