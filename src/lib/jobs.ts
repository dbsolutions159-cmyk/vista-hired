import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Job = Tables<"jobs">;
export type Application = Tables<"applications">;

export const employmentTypeLabels: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

export const workTypeLabels: Record<string, string> = {
  onsite: "On-site",
  remote: "Remote",
  hybrid: "Hybrid",
};

export function formatSalary(job: Pick<Job, "salary_min" | "salary_max" | "salary_currency">) {
  const { salary_min, salary_max, salary_currency } = job;
  if (!salary_min && !salary_max) return "Not disclosed";
  const cur = salary_currency || "INR";
  const symbol = cur === "INR" ? "₹" : cur === "USD" ? "$" : cur + " ";
  const fmt = (n: number) => {
    if (cur === "INR") {
      if (n >= 10000000) return `${(n / 10000000).toFixed(1)} Cr`;
      if (n >= 100000) return `${(n / 100000).toFixed(1)} L`;
      return n.toLocaleString("en-IN");
    }
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
    return n.toLocaleString();
  };
  if (salary_min && salary_max) return `${symbol}${fmt(salary_min)} – ${symbol}${fmt(salary_max)}`;
  return `${symbol}${fmt((salary_min || salary_max)!)}`;
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export interface JobFilters {
  q?: string;
  location?: string;
  category?: string;
  work_type?: string;
  employment_type?: string;
  min_salary?: number;
}

export async function fetchJobs(filters: JobFilters = {}) {
  let query = supabase.from("jobs").select("*").eq("published", true).order("created_at", { ascending: false });
  if (filters.q) query = query.or(`title.ilike.%${filters.q}%,company_name.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
  if (filters.location) query = query.ilike("location", `%${filters.location}%`);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.work_type) query = query.eq("work_type", filters.work_type as any);
  if (filters.employment_type) query = query.eq("employment_type", filters.employment_type as any);
  if (filters.min_salary) query = query.gte("salary_min", filters.min_salary);
  const { data, error } = await query.limit(50);
  if (error) throw error;
  return data ?? [];
}
