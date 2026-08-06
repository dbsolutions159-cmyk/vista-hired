export type ProfileLike = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  city?: string | null;
  state?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  preferred_location?: string | null;
  preferred_role?: string | null;
  work_mode?: string | null;
  education?: string | null;
  skills?: string[] | null;
  experience_years?: string | null;
  languages?: string[] | null;
  expected_salary?: string | null;
  employment_pref?: string | null;
  resume_path?: string | null;
  experience_summary?: string | null;
  is_fresher?: boolean | null;
  current_job_title?: string | null;
  current_company?: string | null;
  notice_period?: string | null;
};

const has = (v: unknown) =>
  Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== "";

export type CompletionSection = {
  key: string;
  label: string;
  weight: number;
  done: boolean;
  hint: string;
};

export type CompletionResult = {
  pct: number;
  sections: CompletionSection[];
  missing: CompletionSection[];
  suggestions: string[];
};

export function computeCompletionDetail(
  p: ProfileLike | null | undefined,
  education: unknown[] = [],
  experience: unknown[] = [],
): CompletionResult {
  const prof = p ?? {};
  const basicFields = [
    prof.full_name,
    prof.phone,
    prof.email,
    prof.date_of_birth,
    prof.gender,
    prof.city,
    prof.state,
  ];
  const basicDone = basicFields.filter(has).length;

  const isFresher = prof.is_fresher === true;
  const professionalDone = isFresher
    ? has(prof.expected_salary)
    : [prof.current_job_title, prof.current_company, prof.experience_years, prof.expected_salary, prof.notice_period].every(has);

  const prefsDone = [prof.preferred_role, prof.preferred_location, prof.employment_pref, prof.work_mode].every(has);

  const sections: CompletionSection[] = [
    {
      key: "basic",
      label: "Basic details",
      weight: 20,
      done: basicDone === basicFields.length,
      hint: "Complete your basic details",
    },
    { key: "resume", label: "Resume", weight: 20, done: has(prof.resume_path), hint: "Upload your resume" },
    {
      key: "education",
      label: "Education",
      weight: 15,
      done: education.length > 0,
      hint: "Add your education",
    },
    {
      key: "professional",
      label: "Professional details",
      weight: 15,
      done: prof.is_fresher != null && professionalDone && (isFresher || experience.length > 0),
      hint: isFresher ? "Complete your professional details" : "Add your work experience and professional details",
    },
    { key: "skills", label: "Skills", weight: 10, done: has(prof.skills), hint: "Add skills to improve your profile" },
    { key: "preferences", label: "Job preferences", weight: 10, done: prefsDone, hint: "Set your job preferences" },
    { key: "about", label: "About", weight: 5, done: has(prof.experience_summary), hint: "Write a short About Me" },
    { key: "photo", label: "Profile photo", weight: 5, done: has(prof.avatar_url), hint: "Add a profile photo" },
  ];

  const pct = sections.reduce((s, x) => s + (x.done ? x.weight : 0), 0);
  const missing = sections.filter((s) => !s.done);
  const suggestions = missing
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((s) => `${s.hint} to reach ${Math.min(100, pct + s.weight)}%.`);

  return { pct, sections, missing, suggestions };
}

export function computeCompletion(
  p: ProfileLike | null | undefined,
  education: unknown[] = [],
  experience: unknown[] = [],
): number {
  return computeCompletionDetail(p, education, experience).pct;
}

export function completionTier(pct: number) {
  if (pct >= 100) return { label: "HireSetu Verified Profile", icon: "🏆", color: "text-primary", ring: "stroke-primary" };
  if (pct >= 80) return { label: "Job Ready", icon: "🟢", color: "text-success", ring: "stroke-success" };
  if (pct >= 40) return { label: "Almost Ready", icon: "🟡", color: "text-warning", ring: "stroke-warning" };
  return { label: "Incomplete Profile", icon: "❌", color: "text-destructive", ring: "stroke-destructive" };
}
