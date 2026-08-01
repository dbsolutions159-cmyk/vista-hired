import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, stageLabel } from "@/lib/pipeline";

export function ApplicationTimeline({ applicationId }: { applicationId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["application-events", applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_events")
        .select("id, from_stage, to_stage, note, created_at")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!data?.length) return <p className="text-sm text-muted-foreground">No activity yet.</p>;

  return (
    <ol className="relative space-y-4 border-l pl-5">
      {data.map((e: any, i: number) => {
        const last = i === data.length - 1;
        return (
          <li key={e.id} className="relative">
            <span className="absolute -left-[27px] top-0.5 grid h-4 w-4 place-items-center rounded-full bg-background">
              {last ? <Circle className="h-3.5 w-3.5 text-primary" /> : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
            </span>
            <div className="text-sm font-medium">{stageLabel(e.to_stage)}</div>
            <div className="text-xs text-muted-foreground">{formatDateTime(e.created_at)}</div>
            {e.note && <div className="mt-0.5 text-xs">{e.note}</div>}
          </li>
        );
      })}
    </ol>
  );
}
