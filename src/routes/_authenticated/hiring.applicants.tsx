import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, KanbanSquare, List, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchManagedApplications, fetchManagedJobs } from "@/lib/hiring";
import { PIPELINE_COLUMNS, STAGES, stageLabel, type Stage } from "@/lib/pipeline";
import { StageBadge } from "@/components/StageBadge";
import { timeAgo } from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/hiring/applicants")({
  component: Applicants,
});

function Applicants() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [q, setQ] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [qualFilter, setQualFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [dragId, setDragId] = useState<string | null>(null);

  const jobsQ = useQuery({
    enabled: !!user,
    queryKey: ["hiring", "jobs", user?.id, isAdmin],
    queryFn: () => fetchManagedJobs(user!.id, isAdmin),
  });

  const appsQ = useQuery({
    enabled: !!user,
    queryKey: ["hiring", "applications", user?.id, isAdmin],
    queryFn: () => fetchManagedApplications(user!.id, isAdmin),
  });

  const move = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: Stage }) => {
      const status = stage === "rejected" ? "rejected" : stage === "applied" ? "submitted" : "approved";
      const { error } = await supabase.from("applications").update({ stage, status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["hiring"] });
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      toast.success(`Moved to ${stageLabel(v.stage)}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    const loc = locationFilter.toLowerCase().trim();
    const qual = qualFilter.toLowerCase().trim();
    const cutoff =
      dateFilter === "7" ? Date.now() - 7 * 86400000 :
      dateFilter === "30" ? Date.now() - 30 * 86400000 :
      dateFilter === "1" ? Date.now() - 86400000 : 0;
    return (appsQ.data ?? []).filter((a: any) => {
      if (jobFilter !== "all" && a.job_id !== jobFilter) return false;
      if (stageFilter !== "all" && a.stage !== stageFilter) return false;
      if (loc && !(a.city || "").toLowerCase().includes(loc)) return false;
      if (qual && !(a.qualification || "").toLowerCase().includes(qual)) return false;
      if (cutoff && new Date(a.created_at).getTime() < cutoff) return false;
      if (!query) return true;
      return [a.full_name, a.email, a.experience, a.jobs?.title, a.jobs?.company_name]
        .some((v: string) => (v || "").toLowerCase().includes(query));
    });
  }, [appsQ.data, q, jobFilter, stageFilter, locationFilter, qualFilter, dateFilter]);

  const exportCsv = () => {
    if (!filtered.length) return toast.error("Nothing to export");
    const rows = filtered.map((a: any) => ({
      name: a.full_name, email: a.email, mobile: a.mobile, city: a.city,
      qualification: a.qualification, experience: a.experience,
      job: a.jobs?.title ?? "", stage: stageLabel(a.stage), applied_at: a.created_at,
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r: any) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const el = document.createElement("a");
    el.href = url; el.download = `applicants-${Date.now()}.csv`; el.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search candidate, email, job…" className="pl-9" />
          </div>
          <div className="flex gap-1 rounded-full bg-muted p-1">
            <Button size="sm" variant={view === "pipeline" ? "secondary" : "ghost"} className="rounded-full" onClick={() => setView("pipeline")}>
              <KanbanSquare className="mr-1.5 h-4 w-4" />Pipeline
            </Button>
            <Button size="sm" variant={view === "list" ? "secondary" : "ghost"} className="rounded-full" onClick={() => setView("list")}>
              <List className="mr-1.5 h-4 w-4" />List
            </Button>
          </div>
          <Button variant="outline" onClick={exportCsv}><Download className="mr-1.5 h-4 w-4" />CSV</Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Select value={jobFilter} onValueChange={setJobFilter}>
            <SelectTrigger><SelectValue placeholder="Job" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All jobs</SelectItem>
              {(jobsQ.data ?? []).map((j: any) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STAGES.map((s) => <SelectItem key={s} value={s}>{stageLabel(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Location" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} />
          <Input placeholder="Qualification" value={qualFilter} onChange={(e) => setQualFilter(e.target.value)} />
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger><SelectValue placeholder="Applied" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any time</SelectItem>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {appsQ.isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {!appsQ.isLoading && filtered.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">No applicants match these filters yet.</p>
          <Button asChild size="sm" variant="outline" className="mt-3"><Link to="/post-job">Post a job</Link></Button>
        </Card>
      )}

      {!appsQ.isLoading && filtered.length > 0 && view === "pipeline" && (
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="flex min-w-max gap-3">
            {PIPELINE_COLUMNS.map((col) => {
              const items = filtered.filter((a: any) => a.stage === col);
              return (
                <div
                  key={col}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragId) move.mutate({ id: dragId, stage: col }); setDragId(null); }}
                  className="w-64 shrink-0 rounded-xl bg-muted/40 p-2"
                >
                  <div className="flex items-center justify-between px-1 pb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stageLabel(col)}</span>
                    <span className="rounded-full bg-background px-2 text-xs font-semibold">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((a: any) => (
                      <div key={a.id} draggable onDragStart={() => setDragId(a.id)} onDragEnd={() => setDragId(null)}>
                        <Card className="cursor-grab p-3 shadow-soft active:cursor-grabbing">
                          <Link to="/hiring/candidates/$appId" params={{ appId: a.id }} className="block">
                            <div className="truncate text-sm font-semibold hover:text-primary">{a.full_name}</div>
                            <div className="truncate text-xs text-muted-foreground">{a.jobs?.title}</div>
                            <div className="mt-1 truncate text-[11px] text-muted-foreground">{a.city} · {a.experience}</div>
                            <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">{timeAgo(a.created_at)}</div>
                          </Link>
                          <div className="mt-2 sm:hidden">
                            <Select value={a.stage} onValueChange={(v) => move.mutate({ id: a.id, stage: v as Stage })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {STAGES.map((s) => <SelectItem key={s} value={s}>{stageLabel(s)}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </Card>
                      </div>
                    ))}
                    {items.length === 0 && <div className="rounded-lg border border-dashed p-4 text-center text-[11px] text-muted-foreground">Drop here</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!appsQ.isLoading && filtered.length > 0 && view === "list" && (
        <Card className="overflow-hidden p-0 shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Experience</th>
                  <th className="px-4 py-3">Qualification</th>
                  <th className="px-4 py-3">Applied</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Move to</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((a: any) => (
                  <tr key={a.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link to="/hiring/candidates/$appId" params={{ appId: a.id }} className="font-medium text-primary hover:underline">{a.full_name}</Link>
                      <div className="text-xs text-muted-foreground">{a.email}</div>
                    </td>
                    <td className="px-4 py-3">{a.jobs?.title}</td>
                    <td className="px-4 py-3">{a.city}</td>
                    <td className="px-4 py-3">{a.experience}</td>
                    <td className="px-4 py-3">{a.qualification}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{timeAgo(a.created_at)}</td>
                    <td className="px-4 py-3"><StageBadge stage={a.stage} /></td>
                    <td className="px-4 py-3">
                      <Select value={a.stage} onValueChange={(v) => move.mutate({ id: a.id, stage: v as Stage })}>
                        <SelectTrigger className="ml-auto h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => <SelectItem key={s} value={s}>{stageLabel(s)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
