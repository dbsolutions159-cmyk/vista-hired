import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, CheckCircle2, Clock, FileText, Plus, Users, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Stat({ label, value, icon: Icon, tone = "primary" }: { label: string; value: number | string; icon: any; tone?: "primary" | "success" | "warning" | "danger" }) {
  const toneClass = {
    primary: "gradient-primary text-primary-foreground",
    success: "bg-emerald-500 text-white",
    warning: "bg-amber-500 text-white",
    danger: "bg-rose-500 text-white",
  }[tone];
  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-3xl font-bold">{value}</div>
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-xl shadow-soft ${toneClass}`}><Icon className="h-5 w-5" /></div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [j, jPub, a, aPending, aApproved, aRejected, p] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("published", true),
        supabase.from("applications").select("id", { count: "exact", head: true }),
        supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "submitted"),
        supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "rejected"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return {
        jobs: j.count ?? 0,
        jobsPublished: jPub.count ?? 0,
        applications: a.count ?? 0,
        pending: aPending.count ?? 0,
        approved: aApproved.count ?? 0,
        rejected: aRejected.count ?? 0,
        users: p.count ?? 0,
      };
    },
  });

  const recent = useQuery({
    queryKey: ["admin-recent-apps"],
    queryFn: async () => {
      const { data } = await supabase.from("applications").select("id, full_name, email, status, created_at, jobs(title, company_name)").order("created_at", { ascending: false }).limit(8);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">Overview of jobs, applications, and users.</div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/admin/applications"><FileText className="mr-1.5 h-4 w-4" />Applications</Link></Button>
          <Button asChild size="sm" className="gradient-primary text-primary-foreground shadow-soft"><Link to="/admin/jobs"><Plus className="mr-1.5 h-4 w-4" />Post new job</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />) : (
          <>
            <Stat label="Jobs (live)" value={`${stats.data!.jobsPublished}/${stats.data!.jobs}`} icon={Briefcase} />
            <Stat label="Applications" value={stats.data!.applications} icon={FileText} />
            <Stat label="Pending" value={stats.data!.pending} icon={Clock} tone="warning" />
            <Stat label="Users" value={stats.data!.users} icon={Users} />
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {stats.isLoading ? null : (
          <>
            <Stat label="Approved" value={stats.data!.approved} icon={CheckCircle2} tone="success" />
            <Stat label="Rejected" value={stats.data!.rejected} icon={XCircle} tone="danger" />
          </>
        )}
      </div>

      <Card className="p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">Recent applications</h2>
        <div className="mt-3 divide-y">
          {recent.data?.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between py-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{a.full_name}</div>
                <div className="text-muted-foreground truncate">{a.jobs?.title} · {a.jobs?.company_name}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                  a.status === "approved" ? "bg-emerald-500/15 text-emerald-600" :
                  a.status === "rejected" ? "bg-rose-500/15 text-rose-600" :
                  "bg-amber-500/15 text-amber-600"
                }`}>{a.status}</span>
                <div className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</div>
              </div>
            </div>
          ))}
          {recent.data?.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">No applications yet.</div>}
        </div>
      </Card>
    </div>
  );
}
