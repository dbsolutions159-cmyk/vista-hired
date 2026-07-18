import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, Check, Download, Mail, MapPin, Phone, User, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/admin/applications/$id")({
  component: CandidateDetails,
});

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "approved" ? "bg-emerald-500/15 text-emerald-600" :
    status === "rejected" ? "bg-rose-500/15 text-rose-600" :
    "bg-amber-500/15 text-amber-600";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}>{status}</span>;
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm break-words">{value}</div>
      </div>
    </div>
  );
}

function CandidateDetails() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const app = useQuery({
    queryKey: ["admin-application", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("applications").select("*, jobs(id, title, company_name, location)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("applications").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, status) => {
      qc.invalidateQueries({ queryKey: ["admin-application", id] });
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-recent-apps"] });
      toast.success(`Application ${status}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openResume = async () => {
    if (!app.data?.resume_path) return;
    const { data } = await supabase.storage.from("resumes").createSignedUrl(app.data.resume_path, 60 * 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  if (app.isLoading) return <Skeleton className="h-96 rounded-lg" />;
  if (!app.data) return (
    <Card className="p-8 text-center">
      <div className="text-muted-foreground">Application not found.</div>
      <Button variant="outline" className="mt-4" onClick={() => nav({ to: "/admin/applications" })}>Back</Button>
    </Card>
  );

  const a = app.data as any;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild><Link to="/admin/applications"><ArrowLeft className="mr-1.5 h-4 w-4" />Back to applications</Link></Button>

      <Card className="p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">{a.full_name}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <StatusBadge status={a.status} />
              <span>· Applied {timeAgo(a.created_at)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openResume}><Download className="mr-1.5 h-4 w-4" />Resume</Button>
            <Button
              disabled={a.status === "approved" || updateStatus.isPending}
              onClick={() => updateStatus.mutate("approved")}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            ><Check className="mr-1.5 h-4 w-4" />Approve</Button>
            <Button
              variant="outline"
              disabled={a.status === "rejected" || updateStatus.isPending}
              onClick={() => updateStatus.mutate("rejected")}
              className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
            ><X className="mr-1.5 h-4 w-4" />Reject</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5 shadow-soft">
          <h2 className="font-display text-base font-semibold mb-2">Contact</h2>
          <Row icon={Mail} label="Email" value={a.email} />
          <Row icon=  {Phone} label="Mobile" value={a.mobile} />
          <Row icon={MapPin} label="City" value={a.city} />
        </Card>

        <Card className="p-5 shadow-soft">
          <h2 className="font-display text-base font-semibold mb-2">Background</h2>
          <Row icon={User} label="Qualification" value={a.qualification} />
          <Row icon={Briefcase} label="Experience" value={a.experience} />
          <Row icon={Briefcase} label="Current company" value={a.current_company} />
          <Row icon={Briefcase} label="Notice period" value={a.notice_period} />
        </Card>
      </div>

      <Card className="p-5 shadow-soft">
        <h2 className="font-display text-base font-semibold mb-2">Applied for</h2>
        <div className="text-sm">
          <div className="font-medium">{a.jobs?.title}</div>
          <div className="text-muted-foreground">{a.jobs?.company_name} · {a.jobs?.location}</div>
        </div>
        {a.cover_letter && (
          <div className="mt-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Cover letter</div>
            <div className="whitespace-pre-wrap text-sm">{a.cover_letter}</div>
          </div>
        )}
      </Card>
    </div>
  );
}
