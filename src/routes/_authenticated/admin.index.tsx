import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, CheckCircle2, Clock, Eye, FileText, Plus, Users, XCircle } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Stat({ label, value, icon: Icon, tone = "primary" }: { label: string; value: number | string; icon: any; tone?: "primary" | "success" | "warning" | "danger" | "info" }) {
  const toneClass = {
    primary: "gradient-primary text-primary-foreground",
    success: "bg-emerald-500 text-white",
    warning: "bg-amber-500 text-white",
    danger: "bg-rose-500 text-white",
    info: "bg-sky-500 text-white",
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

function last14Days() {
  const days: { key: string; label: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) });
  }
  return days;
}

function Dashboard() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [j, jPub, a, aPending, aApproved, aRejected, p, views] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("published", true),
        supabase.from("applications").select("id", { count: "exact", head: true }),
        supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "submitted"),
        supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "rejected"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("view_count"),
      ]);
      const totalViews = (views.data ?? []).reduce((s: number, r: any) => s + (r.view_count ?? 0), 0);
      return {
        jobs: j.count ?? 0,
        jobsPublished: jPub.count ?? 0,
        applications: a.count ?? 0,
        pending: aPending.count ?? 0,
        approved: aApproved.count ?? 0,
        rejected: aRejected.count ?? 0,
        users: p.count ?? 0,
        views: totalViews,
      };
    },
  });

  const trend = useQuery({
    queryKey: ["admin-apps-trend"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 13);
      const { data } = await supabase.from("applications").select("created_at, status").gte("created_at", since.toISOString());
      const days = last14Days();
      const map = new Map(days.map((d) => [d.key, { day: d.label, applications: 0, approved: 0 }]));
      (data ?? []).forEach((row: any) => {
        const key = row.created_at.slice(0, 10);
        const bucket = map.get(key);
        if (bucket) {
          bucket.applications += 1;
          if (row.status === "approved") bucket.approved += 1;
        }
      });
      return Array.from(map.values());
    },
  });

  const topJobs = useQuery({
    queryKey: ["admin-top-jobs"],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("title, view_count").order("view_count", { ascending: false }).limit(6);
      return (data ?? []).map((j: any) => ({ name: j.title.length > 18 ? j.title.slice(0, 18) + "…" : j.title, views: j.view_count ?? 0 }));
    },
  });

  const recent = useQuery({
    queryKey: ["admin-recent-apps"],
    queryFn: async () => {
      const { data } = await supabase.from("applications").select("id, full_name, email, status, created_at, jobs(title, company_name)").order("created_at", { ascending: false }).limit(8);
      return data ?? [];
    },
  });

  const pieData = stats.data
    ? [
        { name: "Pending", value: stats.data.pending, color: "hsl(38 92% 50%)" },
        { name: "Approved", value: stats.data.approved, color: "hsl(160 84% 39%)" },
        { name: "Rejected", value: stats.data.rejected, color: "hsl(346 87% 55%)" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">Overview of jobs, applications, users, and views.</div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/admin/applications"><FileText className="mr-1.5 h-4 w-4" />Applications</Link></Button>
          <Button asChild size="sm" className="gradient-primary text-primary-foreground shadow-soft"><Link to="/admin/jobs"><Plus className="mr-1.5 h-4 w-4" />Post new job</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />) : (
          <>
            <Stat label="Total jobs" value={stats.data!.jobs} icon={Briefcase} />
            <Stat label="Active jobs" value={stats.data!.jobsPublished} icon={CheckCircle2} tone="success" />
            <Stat label="Applications" value={stats.data!.applications} icon={FileText} tone="info" />
            <Stat label="Users" value={stats.data!.users} icon={Users} />
            <Stat label="Total views" value={stats.data!.views} icon={Eye} tone="warning" />
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.isLoading ? null : (
          <>
            <Stat label="Pending" value={stats.data!.pending} icon={Clock} tone="warning" />
            <Stat label="Approved" value={stats.data!.approved} icon={CheckCircle2} tone="success" />
            <Stat label="Rejected" value={stats.data!.rejected} icon={XCircle} tone="danger" />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 shadow-soft lg:col-span-2">
          <h2 className="font-display text-base font-semibold">Applications · last 14 days</h2>
          <div className="mt-2 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend.data ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gApp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} tickMargin={6} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="applications" stroke="hsl(217 91% 60%)" fill="url(#gApp)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 shadow-soft">
          <h2 className="font-display text-base font-semibold">Status breakdown</h2>
          <div className="mt-2 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={45}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-4 shadow-soft">
        <h2 className="font-display text-base font-semibold">Top jobs by views</h2>
        <div className="mt-2 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topJobs.data ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" fontSize={11} interval={0} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="views" fill="hsl(217 91% 60%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">Recent applications</h2>
        <div className="mt-3 divide-y">
          {recent.data?.map((a: any) => (
            <Link
              key={a.id}
              to="/admin/applications/$id"
              params={{ id: a.id }}
              className="flex items-center justify-between py-3 text-sm hover:bg-muted/30 rounded-md px-2 -mx-2"
            >
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
            </Link>
          ))}
          {recent.data?.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">No applications yet.</div>}
        </div>
      </Card>
    </div>
  );
}
