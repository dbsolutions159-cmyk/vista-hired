import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, CalendarDays, CheckCircle2, FileText, Star, TrendingUp, UserCheck, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { fetchManagedApplications, fetchManagedInterviews, fetchManagedJobs } from "@/lib/hiring";
import { StageBadge } from "@/components/StageBadge";
import { formatDateTime, interviewModeLabel } from "@/lib/pipeline";
import { timeAgo } from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/hiring/")({
  component: HiringDashboard,
});

function HiringDashboard() {
  const { user, isAdmin } = useAuth();

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

  const interviewsQ = useQuery({
    enabled: !!user,
    queryKey: ["interviews", "upcoming", user?.id, isAdmin],
    queryFn: () => fetchManagedInterviews(user!.id, isAdmin, true),
  });

  const apps = appsQ.data ?? [];
  const jobs = jobsQ.data ?? [];
  const count = (s: string) => apps.filter((a: any) => a.stage === s).length;
  const sevenDaysAgo = Date.now() - 7 * 86400000;

  const stats = [
    { label: "Active jobs", value: jobs.filter((j: any) => j.status === "live").length, icon: Briefcase },
    { label: "Total applications", value: apps.length, icon: FileText },
    { label: "New (7 days)", value: apps.filter((a: any) => new Date(a.created_at).getTime() > sevenDaysAgo).length, icon: TrendingUp },
    { label: "Shortlisted", value: count("shortlisted"), icon: Star },
    { label: "Interviews", value: (interviewsQ.data ?? []).length, icon: CalendarDays },
    { label: "Selected", value: count("selected"), icon: CheckCircle2 },
    { label: "Hired", value: count("hired"), icon: UserCheck },
    { label: "Under review", value: count("under_review"), icon: Users },
  ];

  const loading = appsQ.isLoading || jobsQ.isLoading;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : stats.map((s) => (
              <Card key={s.label} className="p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</div>
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-1 font-display text-3xl font-bold">{s.value}</div>
              </Card>
            ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Recent applications</h2>
            <Button asChild size="sm" variant="ghost"><Link to="/hiring/applicants">View all</Link></Button>
          </div>
          {loading && <Skeleton className="h-32 w-full" />}
          {!loading && apps.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No applications yet.</p>}
          <div className="space-y-2">
            {apps.slice(0, 6).map((a: any) => (
              <Link
                key={a.id}
                to="/hiring/candidates/$appId"
                params={{ appId: a.id }}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{a.full_name}</div>
                  <div className="truncate text-xs text-muted-foreground">{a.jobs?.title} · {timeAgo(a.created_at)}</div>
                </div>
                <StageBadge stage={a.stage} />
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Upcoming interviews</h2>
            <Button asChild size="sm" variant="ghost"><Link to="/hiring/interviews">View all</Link></Button>
          </div>
          {interviewsQ.isLoading && <Skeleton className="h-32 w-full" />}
          {!interviewsQ.isLoading && (interviewsQ.data ?? []).length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nothing scheduled.</p>
          )}
          <div className="space-y-2">
            {(interviewsQ.data ?? []).slice(0, 6).map((iv: any) => (
              <Link
                key={iv.id}
                to="/hiring/candidates/$appId"
                params={{ appId: iv.application_id }}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{iv.applications?.full_name}</div>
                  <div className="truncate text-xs text-muted-foreground">{iv.jobs?.title} · {interviewModeLabel(iv.mode)}</div>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">{formatDateTime(iv.scheduled_at)}</div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5 shadow-soft">
        <h2 className="mb-3 font-display text-base font-semibold">Recent hiring activity</h2>
        <RecentActivity />
      </Card>
    </div>
  );
}

function RecentActivity() {
  const { user, isAdmin } = useAuth();
  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["hiring", "activity", user?.id, isAdmin],
    queryFn: async () => {
      const apps = await fetchManagedApplications(user!.id, isAdmin);
      const ids = apps.map((a: any) => a.id);
      if (!ids.length) return [];
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("application_events")
        .select("*")
        .in("application_id", ids)
        .order("created_at", { ascending: false })
        .limit(12);
      const byId = new Map(apps.map((a: any) => [a.id, a]));
      return (data ?? []).map((e: any) => ({ ...e, app: byId.get(e.application_id) }));
    },
  });

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!data?.length) return <p className="text-sm text-muted-foreground">No activity yet.</p>;

  return (
    <div className="space-y-2">
      {data.map((e: any) => (
        <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          <div className="min-w-0 truncate">
            <span className="font-medium">{e.app?.full_name ?? "Candidate"}</span>
            <span className="text-muted-foreground"> · {e.app?.jobs?.title}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StageBadge stage={e.to_stage} />
            <span className="text-xs text-muted-foreground">{timeAgo(e.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
