export type ProfileLike = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  city?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  preferred_location?: string | null;
  education?: string | null;
  skills?: string[] | null;
  experience_years?: string | null;
  languages?: string[] | null;
  expected_salary?: string | null;
  employment_pref?: string | null;
  resume_path?: string | null;
};

// 15 weighted fields; each worth ~6.66% → rounded.
const FIELDS: (keyof ProfileLike)[] = [
  "full_name", "email", "phone", "avatar_url", "city",
  "date_of_birth", "gender", "preferred_location", "education",
  "skills", "experience_years", "languages", "expected_salary",
  "employment_pref", "resume_path",
];

export function computeCompletion(p: ProfileLike | null | undefined): number {
  if (!p) return 0;
  let filled = 0;
  for (const f of FIELDS) {
    const v = p[f] as any;
    if (Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== "") filled++;
  }
  return Math.round((filled / FIELDS.length) * 100);
}

export function completionTier(pct: number) {
  if (pct >= 100) return { label: "HireSetu Verified Profile", icon: "🏆", color: "text-primary", ring: "stroke-primary" };
  if (pct >= 80) return { label: "Job Ready", icon: "🟢", color: "text-success", ring: "stroke-success" };
  if (pct >= 40) return { label: "Almost Ready", icon: "🟡", color: "text-warning", ring: "stroke-warning" };
  return { label: "Incomplete Profile", icon: "❌", color: "text-destructive", ring: "stroke-destructive" };
}
