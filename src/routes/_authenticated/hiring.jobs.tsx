import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Eye, Pause, Play, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchManagedApplications, fetchManagedJobs } from "@/lib/hiring";
import { timeAgo } from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/hiring/jobs")({
  component: MyJobs,
});

function MyJobs() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();

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

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("jobs").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hiring"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const countFor = (jobId: string) => (appsQ.data ?? []).filter((a: any) => a.job_id === jobId).length;

  if (jobsQ.isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!jobsQ.data?.length)
    return (
      <Card className="p-10 text-center">
        <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">You haven't posted any jobs yet.</p>
        <Button asChild size="sm" className="mt-3 gradient-primary text-primary-foreground"><Link to="/post-job">Post a job</Link></Button>
      </Card>
    );

  return (
    <div className="space-y-3">
      {jobsQ.data.map((j: any) => (
        <Card key={j.id} className="p-4 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link to="/jobs/$id" params={{ id: j.id }} className="font-display text-lg font-semibold hover:text-primary">{j.title}</Link>
                <Badge variant="outline" className="rounded-full capitalize">{j.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">{j.company_name} · {j.location}</div>
              <div className="mt-1 text-xs text-muted-foreground">Posted {timeAgo(j.created_at)} · {countFor(j.id)} applicants · {j.view_count ?? 0} views</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline"><Link to="/hiring/applicants"><Users className="mr-1.5 h-3.5 w-3.5" />Manage applicants</Link></Button>
              <Button asChild size="sm" variant="ghost"><Link to="/jobs/$id" params={{ id: j.id }}><Eye className="mr-1.5 h-3.5 w-3.5" />View</Link></Button>
              {j.status === "live" ? (
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: j.id, status: "paused" })}><Pause className="mr-1.5 h-3.5 w-3.5" />Pause</Button>
              ) : j.status === "paused" ? (
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: j.id, status: "live" })}><Play className="mr-1.5 h-3.5 w-3.5" />Resume</Button>
              ) : null}
              {j.status !== "closed" && (
                <Button size="sm" variant="outline" className="border-destructive/40 text-destructive" onClick={() => setStatus.mutate({ id: j.id, status: "closed" })}>
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />Close
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
