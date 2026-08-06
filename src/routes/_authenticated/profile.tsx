import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, FileText, ExternalLink, Pencil, Sparkles, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/jobs";
import { CompletionRing } from "@/components/CompletionRing";
import { computeCompletion } from "@/lib/profile-completion";
import { ShareSubscriptionButton, SubscriptionButton } from "@/components/SubscriptionButtons";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const profileQ = useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

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
      const { data, error } = await supabase.from("saved_external_jobs").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const eduQ = useQuery({
    enabled: !!user,
    queryKey: ["candidate-education", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("candidate_education").select("*").eq("user_id", user!.id).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const expQ = useQuery({
    enabled: !!user,
    queryKey: ["candidate-experience", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("candidate_experience").select("*").eq("user_id", user!.id).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const profile = profileQ.data as any;
  const detail = computeCompletionDetail(profile, eduQ.data ?? [], expQ.data ?? []);
  const pct = detail.pct;

  useEffect(() => {
    (async () => {
      const a = profile?.avatar_url;
      if (!a) return setAvatarUrl(null);
      if (a.startsWith("http")) return setAvatarUrl(a);
      const { data } = await supabase.storage.from("avatars").createSignedUrl(a, 3600);
      setAvatarUrl(data?.signedUrl ?? null);
    })();
  }, [profile?.avatar_url]);

  const initials = (profile?.full_name || user?.email || "U").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-16">
      {/* Header card */}
      <Card className="overflow-hidden shadow-soft">
        <div className="gradient-primary h-20" />
        <div className="p-5 pt-0">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar className="h-20 w-20 shrink-0 -mt-10 ring-4 ring-background">
                <AvatarImage src={avatarUrl ?? undefined} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 pt-2">
                <h1 className="truncate font-display text-xl font-bold sm:text-2xl">{profile?.full_name || user?.email?.split("@")[0]}</h1>
                <p className="truncate text-sm text-muted-foreground">{profile?.headline || profile?.education || user?.email}</p>
                {profile?.city && <p className="truncate text-xs text-muted-foreground mt-0.5">📍 {profile.city}</p>}
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="shrink-0"><Link to="/profile/edit"><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Link></Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <SubscriptionButton />
            <ShareSubscriptionButton />
          </div>
        </div>
      </Card>


      {/* Dashboard grid */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4 sm:col-span-1 flex flex-col items-center justify-center">
          <CompletionRing pct={pct} size={110} />
          {pct < 100 && <Button asChild size="sm" variant="link" className="mt-1"><Link to="/profile/edit">Complete now →</Link></Button>}
          {pct === 100 && (
            <div className="mt-2 flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3 w-3" /> One-Click Apply enabled
            </div>
          )}
        </Card>
        <Card className="p-4 flex flex-col justify-center">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Applications</div>
          <div className="font-display text-3xl font-bold">{applications.data?.length ?? 0}</div>
          <div className="text-xs text-muted-foreground">Submitted</div>
        </Card>
        <Card className="p-4 flex flex-col justify-center">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Saved jobs</div>
          <div className="font-display text-3xl font-bold">{saved.data?.length ?? 0}</div>
          <div className="text-xs text-muted-foreground">Bookmarked</div>
        </Card>
      </div>

      <Tabs defaultValue="applications" className="mt-6">
        <TabsList>
          <TabsTrigger value="applications"><FileText className="mr-1.5 h-4 w-4" />Applied</TabsTrigger>
          <TabsTrigger value="saved"><Bookmark className="mr-1.5 h-4 w-4" />Saved</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="mt-4 space-y-3">
          {applications.isLoading && <Skeleton className="h-24 w-full" />}
          {applications.data?.length === 0 && (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <Briefcase className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">You haven't applied to any jobs yet.</p>
              <Button asChild size="sm" className="mt-3 gradient-primary text-primary-foreground"><Link to="/">Browse jobs</Link></Button>
            </div>
          )}
          {applications.data?.map((a: any) => (
            <Card key={a.id} className="p-4 hover:shadow-soft transition-shadow">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link to="/jobs/$id" params={{ id: a.job_id }} className="font-semibold hover:text-primary">{a.jobs?.title}</Link>
                  <div className="text-sm text-muted-foreground truncate">{a.jobs?.company_name} · {a.jobs?.location}</div>
                  <div className="text-xs text-muted-foreground mt-1">Applied {timeAgo(a.created_at)}</div>
                </div>
                <Badge variant="secondary" className="rounded-full capitalize shrink-0">{a.status}</Badge>
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
                  <Button asChild variant="outline" size="sm" className="shrink-0">
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
