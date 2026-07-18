import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, MapPin, Briefcase, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { employmentTypeLabels, formatSalary, timeAgo, workTypeLabels } from "@/lib/jobs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/jobs/$id")({
  component: JobDetail,
});

function JobDetail() {
  const { id } = useParams({ from: "/jobs/$id" });
  const { data: job, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="mx-auto max-w-3xl p-6 space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-6 w-2/3" /><Skeleton className="h-40 w-full" /></div>;
  }
  if (!job) return <div className="mx-auto max-w-3xl p-10 text-center text-muted-foreground">Job not found.</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to feed</Link>
      <Card className="p-6 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-xl border bg-gradient-to-br from-primary/10 to-primary/5">
            {job.company_logo_url ? <img src={job.company_logo_url} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <Building2 className="h-6 w-6 text-primary" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-muted-foreground">{job.company_name} · {timeAgo(job.created_at)}</div>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">{job.title}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>
              <span className="inline-flex items-center gap-1"><Briefcase className="h-4 w-4" />{job.experience || "Any experience"}</span>
              <span className="font-semibold text-foreground">{formatSalary(job)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="rounded-full">{workTypeLabels[job.work_type]}</Badge>
              <Badge variant="secondary" className="rounded-full">{employmentTypeLabels[job.employment_type]}</Badge>
              {job.category && <Badge variant="outline" className="rounded-full">{job.category}</Badge>}
            </div>
          </div>
        </div>

        <div className="prose prose-sm dark:prose-invert mt-6 max-w-none whitespace-pre-wrap text-foreground/90">
          {job.description}
        </div>

        <div className="mt-8 flex justify-end">
          <Button asChild size="lg" className="gradient-primary text-primary-foreground shadow-soft">
            <Link to="/apply/$id" params={{ id: job.id }}><Send className="mr-2 h-4 w-4" />Apply now</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
