import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Sparkles, SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImportedJobCard, type ImportedJob } from "@/components/ImportedJobCard";
import { JobCard } from "@/components/JobCard";
import { LocationPicker } from "@/components/LocationPicker";
import { supabase } from "@/integrations/supabase/client";
import type { Job } from "@/lib/jobs";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "HireSetu — Verified India Jobs from Official Company Career Pages" },
      {
        name: "description",
        content:
          "Discover verified jobs across India — Bengaluru, Hyderabad, Pune, Delhi NCR and Remote India — imported from official company career pages. Apply directly, no aggregators.",
      },
      { property: "og:title", content: "HireSetu — Verified India Jobs" },
      { property: "og:description", content: "Verified India-first jobs from official company career pages. Apply directly on the employer's site." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const PAGE_SIZE = 20;

type FilterKey =
  | "all" | "verified" | "remote" | "hybrid" | "wfh" | "freshers" | "experienced"
  | "internship" | "part_time" | "full_time"
  | "IT" | "BPO" | "HR" | "Sales" | "Marketing" | "Engineering" | "Finance" | "Healthcare";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Latest" },
  { key: "verified", label: "Verified" },
  { key: "remote", label: "Remote India" },
  { key: "hybrid", label: "Hybrid" },
  { key: "wfh", label: "Work From Home" },
  { key: "freshers", label: "Freshers" },
  { key: "experienced", label: "Experienced" },
  { key: "internship", label: "Internship" },
  { key: "part_time", label: "Part Time" },
  { key: "full_time", label: "Full Time" },
  { key: "IT", label: "IT" },
  { key: "BPO", label: "BPO" },
  { key: "HR", label: "HR" },
  { key: "Sales", label: "Sales" },
  { key: "Marketing", label: "Marketing" },
  { key: "Engineering", label: "Engineering" },
  { key: "Finance", label: "Finance" },
  { key: "Healthcare", label: "Healthcare" },
];

const CATEGORY_FILTERS = new Set(["IT", "BPO", "HR", "Sales", "Marketing", "Engineering", "Finance", "Healthcare"]);

function escapeLike(value: string) {
  return value.replace(/[%,()]/g, " ").trim();
}

async function fetchImportedPage(params: { q: string; location: string; filter: FilterKey; page: number }) {
  const from = params.page * PAGE_SIZE;
  let query = supabase
    .from("external_jobs")
    .select(EXTERNAL_JOB_COLUMNS)
    .eq("is_active", true)
    .order("published_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const f = params.filter;
  if (f === "verified") query = query.eq("verified", true);
  if (f === "remote") query = query.eq("remote_type", "remote");
  if (f === "hybrid") query = query.eq("remote_type", "hybrid");
  if (f === "wfh") query = query.in("remote_type", ["remote", "hybrid"]);
  if (f === "freshers") query = query.eq("experience_level", "fresher");
  if (f === "experienced") query = query.eq("experience_level", "experienced");
  if (f === "internship" || f === "part_time" || f === "full_time") query = query.eq("employment_type", f);
  if (CATEGORY_FILTERS.has(f)) query = query.eq("category", f);

  const q = escapeLike(params.q);
  if (q) {
    query = query.or(
      [
        `title.ilike.%${q}%`,
        `company_name.ilike.%${q}%`,
        `category.ilike.%${q}%`,
        `city.ilike.%${q}%`,
        `state.ilike.%${q}%`,
        `location_text.ilike.%${q}%`,
        `summary.ilike.%${q}%`,
      ].join(","),
    );
  }
  const loc = escapeLike(params.location);
  if (loc) query = query.or(`city.ilike.%${loc}%,state.ilike.%${loc}%,location_text.ilike.%${loc}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ImportedJob[];
}

function matchesInternal(job: Job, filter: FilterKey, committed: { q: string; location: string }): boolean {
  const hay = `${job.title} ${job.company_name} ${job.description ?? ""} ${(job as any).skills?.join?.(" ") ?? ""}`;
  const isRemote = job.work_type === "remote";
  const isHybrid = job.work_type === "hybrid";
  if (filter === "remote" && !isRemote) return false;
  if (filter === "hybrid" && !isHybrid) return false;
  if (filter === "wfh" && !(isRemote || isHybrid)) return false;
  if ((filter === "full_time" || filter === "part_time" || filter === "internship") && job.employment_type !== filter) return false;
  if (filter === "freshers" && !/\b(fresher|entry[- ]level|graduate|trainee)\b/i.test(hay)) return false;
  if (filter === "experienced" && !/\b(senior|lead|manager|\d\+?\s*years?)\b/i.test(hay)) return false;
  if (CATEGORY_FILTERS.has(filter) && (job.category ?? "").toLowerCase() !== filter.toLowerCase()) return false;
  if (committed.q && !hay.toLowerCase().includes(committed.q.toLowerCase())) return false;
  if (committed.location && !(job.location || "").toLowerCase().includes(committed.location.toLowerCase())) return false;
  return true;
}

function HomePage() {
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [committed, setCommitted] = useState({ q: "", location: "" });
  const [filter, setFilter] = useState<FilterKey>("all");
  const queryClient = useQueryClient();
  const sentinel = useRef<HTMLDivElement | null>(null);

  const imported = useInfiniteQuery({
    queryKey: ["imported-jobs", committed, filter],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchImportedPage({ ...committed, filter, page: pageParam as number }),
    getNextPageParam: (last, all) => (last.length === PAGE_SIZE ? all.length : undefined),
    staleTime: 60_000,
  });

  const { data: internalJobs, isLoading: internalLoading } = useQuery({
    queryKey: ["internal-jobs"],
    queryFn: async (): Promise<Job[]> => {
      const { data, error } = await supabase
        .from("jobs")
        .select(JOB_COLUMNS)
        .eq("status", "live")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Job[];
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("jobs-home-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => {
        queryClient.invalidateQueries({ queryKey: ["internal-jobs"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Infinite scroll
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = imported;
  const observe = useCallback(
    (node: HTMLDivElement | null) => {
      sentinel.current = node;
      if (!node) return;
      const io = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
      }, { rootMargin: "400px" });
      io.observe(node);
      return () => io.disconnect();
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setCommitted({ q: q.trim(), location: location.trim() });
  };

  const importedJobs = useMemo(() => imported.data?.pages.flat() ?? [], [imported.data]);
  const filteredInternal = useMemo(
    () => (internalJobs ?? []).filter((j) => matchesInternal(j, filter, committed)),
    [internalJobs, filter, committed],
  );

  const loading = imported.isLoading && internalLoading;
  const empty = !loading && !importedJobs.length && !filteredInternal.length;

  return (
    <>
      <section className="relative overflow-hidden gradient-hero dark:gradient-hero-dark">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:pt-20 sm:pb-14">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border bg-card/60 px-3 py-1 text-xs shadow-soft backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Verified India jobs · official company career pages</span>
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              Find your next role on <span className="text-gradient">HireSetu</span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Real, active openings across India and Remote India — refreshed every 30 minutes. Apply directly on the employer's site.
            </p>
          </div>

          <form onSubmit={submit} className="mx-auto mt-8 max-w-4xl">
            <div className="glass rounded-2xl p-3 shadow-elevated">
              <div className="flex flex-col gap-2 md:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, company, skill or category (e.g. React, BPO)" className="h-11 pl-9 bg-background/70" />
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
            {loading ? "Loading…" : `${filteredInternal.length + importedJobs.length}${hasNextPage ? "+" : ""} results`}
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-5">
                <div className="flex gap-4"><Skeleton className="h-12 w-12 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-1/2" /></div></div>
              </div>
            ))}
          </div>
        ) : empty ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <SearchX className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No jobs available</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {committed.q || committed.location || filter !== "all"
                ? 'Try a different keyword, clear the location, or switch back to "Latest".'
                : "Check back soon — new verified roles are imported every 30 minutes."}
            </p>
            {(committed.q || committed.location || filter !== "all") && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => { setQ(""); setLocation(""); setCommitted({ q: "", location: "" }); setFilter("all"); }}>Reset filters</Button>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-500">
            {filteredInternal.map((j) => <JobCard key={j.id} job={j} />)}
            {importedJobs.map((j) => <ImportedJobCard key={j.id} job={j} />)}
            <div ref={observe} />
            {isFetchingNextPage && (
              <div className="rounded-xl border p-5">
                <div className="flex gap-4"><Skeleton className="h-12 w-12 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-5 w-2/3" /></div></div>
              </div>
            )}
            {!hasNextPage && importedJobs.length > 0 && (
              <p className="pt-2 text-center text-xs text-muted-foreground">You've reached the end of the feed.</p>
            )}
          </div>
        )}
      </section>
    </>
  );
}
