import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { JobCard } from "@/components/JobCard";
import { fetchJobs, type JobFilters } from "@/lib/jobs";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const NONE = "__all__";

function HomePage() {
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [workType, setWorkType] = useState<string>(NONE);
  const [empType, setEmpType] = useState<string>(NONE);
  const [category, setCategory] = useState<string>(NONE);

  const filters: JobFilters = useMemo(() => ({
    q: q || undefined,
    location: location || undefined,
    work_type: workType !== NONE ? workType : undefined,
    employment_type: empType !== NONE ? empType : undefined,
    category: category !== NONE ? category : undefined,
  }), [q, location, workType, empType, category]);

  const { data, isLoading } = useQuery({
    queryKey: ["jobs", filters],
    queryFn: () => fetchJobs(filters),
  });

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden gradient-hero dark:gradient-hero-dark">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:pt-20 sm:pb-14">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border bg-card/60 px-3 py-1 text-xs shadow-soft backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Fresh jobs added daily</span>
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              Find your next role on <span className="text-gradient">HireSetu</span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Discover, share, and apply to jobs across India — sign in with Google, apply in seconds.
            </p>
          </div>

          {/* Search bar */}
          <div className="mx-auto mt-8 max-w-4xl">
            <div className="glass rounded-2xl p-3 shadow-elevated">
              <div className="flex flex-col gap-2 md:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title, company, or keyword" className="h-11 pl-9 bg-background/70" />
                </div>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="h-11 md:w-56 bg-background/70" />
                <Button className="h-11 gradient-primary text-primary-foreground shadow-soft">Search</Button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 px-1 text-xs text-muted-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <Select value={workType} onValueChange={setWorkType}>
                  <SelectTrigger className="h-8 w-auto min-w-32 bg-background/70"><SelectValue placeholder="Work type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Any work type</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={empType} onValueChange={setEmpType}>
                  <SelectTrigger className="h-8 w-auto min-w-36 bg-background/70"><SelectValue placeholder="Employment" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Any employment</SelectItem>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="part_time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-8 w-auto min-w-36 bg-background/70"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>All categories</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Data">Data</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Product">Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feed */}
      <section className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-semibold">Latest jobs</h2>
          <span className="text-xs text-muted-foreground">{data?.length ?? 0} results</span>
        </div>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-5">
                <div className="flex gap-4"><Skeleton className="h-12 w-12 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-1/2" /></div></div>
              </div>
            ))}
          </div>
        ) : data && data.length ? (
          <div className="space-y-4 animate-in fade-in duration-500">
            {data.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No jobs match your filters. Try clearing them.
          </div>
        )}
      </section>
    </>
  );
}
