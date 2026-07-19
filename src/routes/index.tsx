import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Sparkles, SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalJobCard } from "@/components/ExternalJobCard";
import { LocationPicker } from "@/components/LocationPicker";
import { fetchExternalJobs, type ExternalJob } from "@/lib/external-jobs.functions";

export const Route = createFileRoute("/")({
  component: HomePage,
});

type FilterKey = "all" | "remote" | "wfh" | "full_time" | "part_time" | "internship" | "freshers" | "experienced";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All Jobs" },
  { key: "remote", label: "Remote" },
  { key: "wfh", label: "Work From Home" },
  { key: "full_time", label: "Full Time" },
  { key: "part_time", label: "Part Time" },
  { key: "internship", label: "Internship" },
  { key: "freshers", label: "Freshers" },
  { key: "experienced", label: "Experienced" },
];

const FRESHER_RX = /\b(fresher|entry[- ]level|graduate|trainee|0[-–]?1\s*(yr|year)|no experience)\b/i;
const EXP_RX = /\b(senior|sr\.?|lead|principal|staff|manager|architect|[3-9]\+?\s*(yrs?|years?)|10\+\s*years?)\b/i;

function matches(job: ExternalJob, filter: FilterKey, query: string): boolean {
  if (filter !== "all") {
    if (filter === "remote" && !job.remote) return false;
    if (filter === "wfh" && !(job.remote || /work from home|wfh/i.test(job.location + " " + job.description))) return false;
    if (filter === "full_time" && job.employment_type !== "full_time") return false;
    if (filter === "part_time" && job.employment_type !== "part_time") return false;
    if (filter === "internship" && job.employment_type !== "internship") return false;
    if (filter === "freshers" && !FRESHER_RX.test(job.title + " " + job.description)) return false;
    if (filter === "experienced" && !EXP_RX.test(job.title + " " + job.description)) return false;
  }
  if (query) {
    const q = query.toLowerCase();
    const hay = `${job.title} ${job.company} ${job.location} ${job.tags.join(" ")} ${job.description}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function HomePage() {
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [committed, setCommitted] = useState<{ q: string; location: string }>({ q: "", location: "" });
  const [filter, setFilter] = useState<FilterKey>("all");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["external-jobs", committed],
    queryFn: () => fetchExternalJobs({ data: { q: committed.q || undefined, location: committed.location || undefined } }),
    staleTime: 60_000,
  });

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setCommitted({ q: q.trim(), location: location.trim() });
  };

  const filtered = useMemo(() => (data?.jobs ?? []).filter((j) => matches(j, filter, "")), [data, filter]);

  return (
    <>
      <section className="relative overflow-hidden gradient-hero dark:gradient-hero-dark">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:pt-20 sm:pb-14">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border bg-card/60 px-3 py-1 text-xs shadow-soft backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Live jobs from Adzuna & Remotive</span>
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              Find your next role on <span className="text-gradient">HireSetu</span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Real, active openings — search by title, company, location, or skills. Apply directly on the employer's site.
            </p>
          </div>

          <form onSubmit={submit} className="mx-auto mt-8 max-w-4xl">
            <div className="glass rounded-2xl p-3 shadow-elevated">
              <div className="flex flex-col gap-2 md:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, company, or skill (e.g. React, Marketing)" className="h-11 pl-9 bg-background/70" />
                </div>
                <LocationPicker value={location} onChange={setLocation} />
                <Button type="submit" className="h-11 gradient-primary text-primary-foreground shadow-soft">Search</Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 px-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={`rounded-full border px-3 py-1 text-xs transition-all ${filter === f.key ? "border-primary bg-primary text-primary-foreground shadow-soft" : "bg-background/70 hover:border-primary/40"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-semibold">Latest jobs</h2>
          <span className="text-xs text-muted-foreground">
            {isFetching ? "Loading…" : `${filtered.length} of ${data?.counts.total ?? 0} results`}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-5">
                <div className="flex gap-4"><Skeleton className="h-12 w-12 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-1/2" /></div></div>
              </div>
            ))}
          </div>
        ) : filtered.length ? (
          <div className="space-y-4 animate-in fade-in duration-500">
            {filtered.map((j) => <ExternalJobCard key={j.id} job={j} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <SearchX className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No jobs found</p>
            <p className="mt-1 text-xs text-muted-foreground">Try a different keyword, clear the location, or switch to "All Jobs".</p>
            {(committed.q || committed.location || filter !== "all") && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => { setQ(""); setLocation(""); setCommitted({ q: "", location: "" }); setFilter("all"); }}>Reset filters</Button>
            )}
          </div>
        )}
      </section>
    </>
  );
}
