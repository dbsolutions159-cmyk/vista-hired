import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { fetchManagedInterviews } from "@/lib/hiring";
import { formatDateTime, interviewModeLabel } from "@/lib/pipeline";

export const Route = createFileRoute("/_authenticated/hiring/interviews")({
  component: Interviews,
});

function Interviews() {
  const { user, isAdmin } = useAuth();
  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["interviews", "all", user?.id, isAdmin],
    queryFn: () => fetchManagedInterviews(user!.id, isAdmin, false),
  });

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!data?.length)
    return (
      <Card className="p-10 text-center">
        <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No interviews scheduled yet.</p>
      </Card>
    );

  return (
    <div className="space-y-3">
      {data.map((iv: any) => (
        <Card key={iv.id} className="flex flex-wrap items-center justify-between gap-3 p-4 shadow-soft">
          <div className="min-w-0">
            <Link to="/hiring/candidates/$appId" params={{ appId: iv.application_id }} className="font-medium hover:text-primary">
              {iv.applications?.full_name}
            </Link>
            <div className="text-xs text-muted-foreground">{iv.jobs?.title} · {interviewModeLabel(iv.mode)} · {iv.status}</div>
            {iv.meeting_link && <a href={iv.meeting_link} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Join link</a>}
          </div>
          <div className="text-sm text-muted-foreground">{formatDateTime(iv.scheduled_at)}</div>
        </Card>
      ))}
    </div>
  );
}
