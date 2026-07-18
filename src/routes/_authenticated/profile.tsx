import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, FileText, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();

  const applications = useQuery({
    enabled: !!user,
    queryKey: ["my-applications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("applications").select("*, jobs(*)").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saved = useQuery({
    enabled: !!user,
    queryKey: ["saved-external-jobs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_external_jobs")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });


  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold">My profile</h1>
      <p className="text-sm text-muted-foreground">{user?.email}</p>

      <Tabs defaultValue="applications" className="mt-6">
        <TabsList>
          <TabsTrigger value="applications"><FileText className="mr-1.5 h-4 w-4" />Applied</TabsTrigger>
          <TabsTrigger value="saved"><Bookmark className="mr-1.5 h-4 w-4" />Saved</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="mt-4 space-y-3">
          {applications.isLoading && <Skeleton className="h-24 w-full" />}
          {applications.data?.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">You haven't applied to any jobs yet.</p>}
          {applications.data?.map((a: any) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link to="/jobs/$id" params={{ id: a.job_id }} className="font-semibold hover:text-primary">{a.jobs?.title}</Link>
                  <div className="text-sm text-muted-foreground truncate">{a.jobs?.company_name} · {a.jobs?.location}</div>
                  <div className="text-xs text-muted-foreground mt-1">Applied {timeAgo(a.created_at)}</div>
                </div>
                <Badge variant="secondary" className="rounded-full capitalize">{a.status}</Badge>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="saved" className="mt-4 space-y-3">
          {saved.isLoading && <Skeleton className="h-24 w-full" />}
          {saved.data?.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nothing saved yet.</p>}
          {saved.data?.map((s: any) => {
            const p = s.payload || {};
            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{p.title}</div>
                    <div className="text-sm text-muted-foreground truncate">{p.company} · {p.location}</div>
                    <div className="text-xs text-muted-foreground mt-1">{p.salary || "Salary not disclosed"} · {s.source}</div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a href={p.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Apply</a>
                  </Button>
                </div>
              </Card>
            );
          })}

        </TabsContent>
      </Tabs>
    </div>
  );
}
