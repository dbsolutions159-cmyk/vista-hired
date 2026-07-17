import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, FileText, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Stat({ label, value, icon: Icon }: { label: string; value: number | string; icon: any }) {
  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-3xl font-bold">{value}</div>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-xl gradient-primary text-primary-foreground shadow-soft"><Icon className="h-5 w-5" /></div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [j, a, p] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("applications").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return { jobs: j.count ?? 0, applications: a.count ?? 0, users: p.count ?? 0 };
    },
  });

  const recent = useQuery({
    queryKey: ["admin-recent-apps"],
    queryFn: async () => {
      const { data } = await supabase.from("applications").select("id, full_name, email, created_at, jobs(title, company_name)").order("created_at", { ascending: false }).limit(8);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />) : (
          <>
            <Stat label="Total jobs" value={stats.data!.jobs} icon={Briefcase} />
            <Stat label="Applications" value={stats.data!.applications} icon={FileText} />
            <Stat label="Users" value={stats.data!.users} icon={Users} />
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
              <div className="text-xs text-muted-foreground shrink-0">{timeAgo(a.created_at)}</div>
            </div>
          ))}
          {recent.data?.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">No applications yet.</div>}
        </div>
      </Card>
    </div>
  );
}
