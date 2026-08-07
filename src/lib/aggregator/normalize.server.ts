/**
 * Normalization + India-first filtering for imported jobs.
 * Server-only: used by the sync pipeline.
 */
import type { NormalizedJob, RawJob, SourceConfig } from "./types";

/** Aggregator domains we never send candidates to. */
const BLOCKED_APPLY_HOSTS = [
  "linkedin.com",
  "indeed.com",
  "naukri.com",
  "foundit.in",
  "monsterindia.com",
  "wellfound.com",
  "angel.co",
  "glassdoor.com",
  "google.com",
  "jobs.google.com",
  "ziprecruiter.com",
  "shine.com",
  "timesjobs.com",
  "simplyhired.com",
  "jooble.org",
  "careerjet",
  "neuvoo",
];

export const INDIA_CITIES: { city: string; state: string }[] = [
  { city: "Bengaluru", state: "Karnataka" },
  { city: "Bangalore", state: "Karnataka" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Navi Mumbai", state: "Maharashtra" },
  { city: "Thane", state: "Maharashtra" },
  { city: "Nagpur", state: "Maharashtra" },
  { city: "Delhi", state: "Delhi" },
  { city: "New Delhi", state: "Delhi" },
  { city: "Delhi NCR", state: "Delhi" },
  { city: "Noida", state: "Uttar Pradesh" },
  { city: "Greater Noida", state: "Uttar Pradesh" },
  { city: "Gurugram", state: "Haryana" },
  { city: "Gurgaon", state: "Haryana" },
  { city: "Faridabad", state: "Haryana" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Coimbatore", state: "Tamil Nadu" },
  { city: "Madurai", state: "Tamil Nadu" },
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Surat", state: "Gujarat" },
  { city: "Vadodara", state: "Gujarat" },
  { city: "Gandhinagar", state: "Gujarat" },
  { city: "Kolkata", state: "West Bengal" },
  { city: "Kochi", state: "Kerala" },
  { city: "Cochin", state: "Kerala" },
  { city: "Thiruvananthapuram", state: "Kerala" },
  { city: "Trivandrum", state: "Kerala" },
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Udaipur", state: "Rajasthan" },
  { city: "Indore", state: "Madhya Pradesh" },
  { city: "Bhopal", state: "Madhya Pradesh" },
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Kanpur", state: "Uttar Pradesh" },
  { city: "Varanasi", state: "Uttar Pradesh" },
  { city: "Chandigarh", state: "Chandigarh" },
  { city: "Mohali", state: "Punjab" },
  { city: "Ludhiana", state: "Punjab" },
  { city: "Bhubaneswar", state: "Odisha" },
  { city: "Patna", state: "Bihar" },
  { city: "Ranchi", state: "Jharkhand" },
  { city: "Raipur", state: "Chhattisgarh" },
  { city: "Guwahati", state: "Assam" },
  { city: "Mysuru", state: "Karnataka" },
  { city: "Mysore", state: "Karnataka" },
  { city: "Mangaluru", state: "Karnataka" },
  { city: "Visakhapatnam", state: "Andhra Pradesh" },
  { city: "Vijayawada", state: "Andhra Pradesh" },
  { city: "Dehradun", state: "Uttarakhand" },
  { city: "Goa", state: "Goa" },
];

const INDIA_HINT_RX =
  /\b(india|indian|bharat|pan[- ]india|anywhere in india|remote india|india remote|work from home india|apac india)\b/i;

const REMOTE_RX = /\b(remote|work from home|wfh|anywhere|distributed)\b/i;
const HYBRID_RX = /\bhybrid\b/i;

/** Country-restricted phrases that exclude Indian candidates. */
const EXCLUSIVE_RX =
  /\b(us[- ]only|usa only|united states only|u\.s\. only|uk only|united kingdom only|europe only|eu only|emea only|canada only|australia only|germany only|singapore only|remote[, ]+(usa|us|united states|uk|europe|eu|canada|australia|germany|latam|emea)\b|must (be|reside|live) in the (us|usa|united states|uk|eu|europe|canada|australia)|authorized to work in the (us|united states|uk|eu)|(us|usa|uk|eu|canada|australia)[- ]based (candidates|applicants) only)\b/i;

const NON_INDIA_COUNTRY_RX =
  /\b(united states|usa|u\.s\.a|new york|san francisco|california|texas|seattle|boston|chicago|austin|london|manchester|berlin|munich|paris|amsterdam|dublin|madrid|barcelona|toronto|vancouver|sydney|melbourne|singapore|dubai|tokyo|warsaw|lisbon|sao paulo|mexico city)\b/i;

export function stripHtml(input: string): string {
  return (input || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isOfficialApplyUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    return !BLOCKED_APPLY_HOSTS.some((b) => host.includes(b));
  } catch {
    return false;
  }
}

/** India-first relevance check. Returns null when the job must be skipped. */
export function indiaRelevance(job: RawJob): { remote_type: "onsite" | "remote" | "hybrid"; city: string | null; state: string | null } | null {
  const loc = job.location_text || "";
  const text = `${job.title} ${loc} ${job.description}`;
  const hay = `${loc} ${job.description}`;

  const match = INDIA_CITIES.find((c) => new RegExp(`\\b${c.city}\\b`, "i").test(loc)) ??
    INDIA_CITIES.find((c) => new RegExp(`\\b${c.city}\\b`, "i").test(job.description.slice(0, 2000)));

  const locSaysIndia = INDIA_HINT_RX.test(loc);
  const descSaysIndia = INDIA_HINT_RX.test(job.description.slice(0, 4000));
  const isRemote = job.remote_hint === true || REMOTE_RX.test(loc) || REMOTE_RX.test(job.title);
  const isHybrid = HYBRID_RX.test(loc) || HYBRID_RX.test(text.slice(0, 1500));

  // Hard exclusions: explicitly restricted to another country and no India signal.
  const restricted = EXCLUSIVE_RX.test(hay.slice(0, 4000));
  const indiaSignal = !!match || locSaysIndia || descSaysIndia;
  if (restricted && !(locSaysIndia || !!match)) return null;

  if (!indiaSignal) {
    // Global-remote jobs qualify only when nothing ties them to another country.
    if (isRemote && !NON_INDIA_COUNTRY_RX.test(loc)) {
      return { remote_type: "remote", city: null, state: null };
    }
    return null;
  }

  const remote_type = isRemote ? "remote" : isHybrid ? "hybrid" : "onsite";
  return { remote_type, city: match?.city ?? null, state: match?.state ?? null };
}

export function normalizeEmployment(raw?: string | null, title = ""): string {
  const s = `${raw ?? ""} ${title}`.toLowerCase();
  if (/intern(ship)?\b/.test(s)) return "internship";
  if (/part[- ]?time/.test(s)) return "part_time";
  if (/contract|contractor|freelance|temporary|consultant/.test(s)) return "contract";
  if (/full[- ]?time|permanent|regular/.test(s)) return "full_time";
  return "full_time";
}

const FRESHER_RX = /\b(fresher|entry[- ]level|graduate|trainee|no experience|0\s*[-–to]*\s*1\s*(year|yr))\b/i;
const SENIOR_RX = /\b(senior|sr\.?|lead|principal|staff|manager|head of|architect|director|([3-9]|1[0-9])\+?\s*(years?|yrs?))\b/i;

export function experienceInfo(text: string): { level: string; label: string | null } {
  const yrs = text.match(/(\d{1,2})\s*[-–to]{1,3}\s*(\d{1,2})\s*(\+)?\s*(years?|yrs?)/i) ?? text.match(/(\d{1,2})\s*\+?\s*(years?|yrs?)\s+(of\s+)?experience/i);
  if (FRESHER_RX.test(text)) return { level: "fresher", label: yrs ? yrs[0].trim() : "Fresher / 0-1 years" };
  if (yrs) return { level: "experienced", label: yrs[0].trim() };
  if (SENIOR_RX.test(text)) return { level: "experienced", label: null };
  return { level: "any", label: null };
}

export function formatSalary(min?: number | null, max?: number | null, currency = "INR"): string | null {
  if (!min && !max) return null;
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : `${currency} `;
  const fmt = (n: number) => {
    if (currency === "INR") {
      if (n >= 10000000) return `${(n / 10000000).toFixed(1)} Cr`;
      if (n >= 100000) return `${(n / 100000).toFixed(1)} L`;
      return n.toLocaleString("en-IN");
    }
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return n.toLocaleString();
  };
  if (min && max && min !== max) return `${sym}${fmt(min)} – ${sym}${fmt(max)}`;
  return `${sym}${fmt((min || max)!)}`;
}

const SKILL_DICT = [
  "React","React Native","Next.js","Angular","Vue","Svelte","JavaScript","TypeScript","Node.js","Express","Python","Django","Flask","FastAPI","Java","Spring Boot","Kotlin","Swift","Flutter","Dart","Go","Golang","Rust","PHP","Laravel","Ruby","Rails","C++","C#",".NET","SQL","MySQL","PostgreSQL","MongoDB","Redis","Elasticsearch","GraphQL","REST API","AWS","Azure","GCP","Docker","Kubernetes","Terraform","Jenkins","CI/CD","Git","Linux","Machine Learning","Data Science","Pandas","NumPy","PyTorch","TensorFlow","Power BI","Tableau","Excel","Salesforce","SAP","HubSpot","SEO","SEM","Google Ads","Content Writing","Copywriting","Figma","Adobe XD","Photoshop","Illustrator","UI/UX","Product Management","Agile","Scrum","JIRA","Communication","Customer Support","Recruitment","Payroll","Accounting","Tally","GST","Financial Modelling","Sales","Business Development","Lead Generation","Cold Calling","Nursing","Pharmacovigilance","Clinical Research",
];

export function extractSkills(text: string, extra: string[] = []): string[] {
  const found = new Set<string>();
  for (const s of extra) if (s && s.length <= 30) found.add(s.trim());
  const hay = text.slice(0, 8000);
  for (const skill of SKILL_DICT) {
    const rx = new RegExp(`(^|[^a-zA-Z0-9+#.])${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-zA-Z0-9+#]|$)`, "i");
    if (rx.test(hay)) found.add(skill);
    if (found.size >= 12) break;
  }
  return [...found].slice(0, 12);
}

const CATEGORY_RULES: [RegExp, string][] = [
  [/\b(bpo|call center|call centre|customer support|voice process|tele[- ]?caller)\b/i, "BPO"],
  [/\b(hr|human resources|recruit|talent acquisition|payroll)\b/i, "HR"],
  [/\b(sales|business development|inside sales|account executive)\b/i, "Sales"],
  [/\b(marketing|seo|growth|content|brand|social media|performance marketing)\b/i, "Marketing"],
  [/\b(finance|accountant|accounts|audit|taxation|financial analyst|ca\b)\b/i, "Finance"],
  [/\b(nurse|doctor|clinical|pharma|healthcare|medical)\b/i, "Healthcare"],
  [/\b(mechanical|civil|electrical|production|manufacturing|site engineer)\b/i, "Engineering"],
  [/\b(developer|engineer|software|frontend|backend|full ?stack|devops|data|qa|sdet|android|ios|cloud|security|it support)\b/i, "IT"],
];

export function detectCategory(text: string, fallback?: string | null): string {
  for (const [rx, label] of CATEGORY_RULES) if (rx.test(text)) return label;
  return fallback?.trim() || "Other";
}

function section(text: string, headings: string[]): string | null {
  const lines = text.split("\n");
  const startRx = new RegExp(`^\\s*(${headings.join("|")})\\b.{0,40}:?\\s*$`, "i");
  const stopRx = /^\s*(responsibilit|what you.ll do|requirement|qualification|what we.re looking|skills|benefit|perks|about (us|the)|why join|compensation)/i;
  const start = lines.findIndex((l) => startRx.test(l));
  if (start === -1) return null;
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (stopRx.test(lines[i]!) && out.length) break;
    out.push(lines[i]!);
    if (out.join("\n").length > 1800) break;
  }
  const body = out.join("\n").trim();
  return body.length > 20 ? body : null;
}

export function makeSummary(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 240) return clean;
  const cut = clean.slice(0, 240);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export function dedupeKey(company: string, title: string, city: string | null, remote: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `${norm(company)}|${norm(title)}|${norm(city ?? remote)}`;
}

/** Convert a connector's raw job into a DB row, or null when it must be skipped. */
export function normalizeJob(raw: RawJob, source: SourceConfig, meta: { label: string; logo: string | null }): NormalizedJob | null {
  if (!raw.title?.trim() || !raw.company_name?.trim()) return null;
  if (!isOfficialApplyUrl(raw.apply_url)) return null;

  const description = stripHtml(raw.description || "");
  const cleaned: RawJob = { ...raw, description };
  const rel = indiaRelevance(cleaned);
  if (!rel) return null;

  const fullText = `${raw.title} ${raw.location_text} ${description}`;
  const exp = experienceInfo(fullText);
  const currency = raw.salary_currency || (rel.city ? "INR" : "INR");
  const title = raw.title.replace(/\s+/g, " ").trim();
  const company = raw.company_name.replace(/\s+/g, " ").trim();
  const city = rel.city;
  const locationText =
    (raw.location_text || "").replace(/\s+/g, " ").trim() ||
    (city ? `${city}, India` : rel.remote_type === "remote" ? "Remote (India)" : "India");

  return {
    source: source.connector,
    source_logo_url: meta.logo,
    external_id: String(raw.external_id),
    dedupe_key: dedupeKey(company, title, city, rel.remote_type),
    company_name: company,
    company_logo_url: raw.company_logo_url ?? source.company_logo_url ?? null,
    company_career_url: raw.company_career_url ?? source.company_career_url ?? null,
    title,
    category: detectCategory(`${title} ${raw.department ?? ""} ${description.slice(0, 1200)}`, raw.category),
    department: raw.department ?? null,
    employment_type: normalizeEmployment(raw.employment_type_hint, title),
    experience: raw.experience_hint ?? exp.label,
    experience_level: exp.level,
    salary_text: raw.salary_text ?? formatSalary(raw.salary_min, raw.salary_max, currency),
    salary_min: raw.salary_min ?? null,
    salary_max: raw.salary_max ?? null,
    salary_currency: currency,
    country: "India",
    state: rel.state,
    city,
    location_text: locationText,
    remote_type: rel.remote_type,
    description,
    summary: makeSummary(description),
    responsibilities: section(description, ["responsibilities", "what you.ll do", "key responsibilities", "the role"]),
    requirements: section(description, ["requirements", "qualifications", "what we.re looking for", "skills required", "who you are"]),
    benefits: section(description, ["benefits", "perks", "what we offer", "why join us"]),
    skills: extractSkills(`${title} ${description}`, raw.tags ?? []),
    apply_url: raw.apply_url,
    published_at: raw.published_at ? new Date(raw.published_at).toISOString() : new Date().toISOString(),
    expires_at: raw.expires_at ? new Date(raw.expires_at).toISOString() : null,
    verified: true,
    is_active: true,
    raw: raw.raw ?? null,
  };
}
