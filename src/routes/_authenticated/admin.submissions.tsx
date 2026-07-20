import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, XCircle, MessageSquareWarning, ExternalLink, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/admin/submissions")({
  component: Submissions,
});

const STATUS: Array<{ key: string; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "live", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function Submissions() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [rejectFor, setRejectFor] = useState<{ id: string; type: "reject" | "changes" } | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-submissions", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .neq("poster_role", "admin")
        .eq("status", status as any)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, action, note }: { id: string; action: "approve" | "reject" | "changes"; note?: string }) => {
      const job = (data || []).find((j: any) => j.id === id);
      const patch: any = action === "approve"
        ? { status: "live", verified: true, rejection_reason: null }
        : action === "reject"
        ? { status: "rejected", rejection_reason: note || null }
        : { status: "pending", rejection_reason: note || null };
      const { error } = await supabase.from("jobs").update(patch).eq("id", id);
      if (error) throw error;

      if (job?.poster_user_id) {
        const notif = action === "approve"
          ? { type: "job_approved", title: "Job approved & live", body: `${job.title} is now live on HireSetu.`, link: `/jobs/${id}` }
          : action === "reject"
          ? { type: "job_rejected", title: "Job rejected", body: note || "Please review the guidelines and try again.", link: `/profile` }
          : { type: "job_changes", title: "Changes requested", body: note || "Please update your submission.", link: `/profile` };
        await supabase.from("notifications").insert({ user_id: job.poster_user_id, ...notif });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-submissions"] });
      qc.invalidateQueries({ queryKey: ["admin-jobs"] });
      setRejectFor(null);
      setReason("");
      toast.success("Updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Tabs value={status} onValueChange={setStatus}>
        <TabsList>
          {STATUS.map((s) => <TabsTrigger key={s.key} value={s.key}>{s.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {isLoading && <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>}
      {!isLoading && data?.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">No {status} submissions.</Card>
      )}

      <div className="space-y-3">
        {data?.map((j: any) => (
          <Card key={j.id} className="p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border bg-primary/5">
                {j.company_logo_url ? <img src={j.company_logo_url} className="h-11 w-11 rounded-xl object-cover" alt="" /> : <Building2 className="h-5 w-5 text-primary" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{j.company_name}</span>
                  <Badge variant="outline" className="rounded-full capitalize">{j.poster_role}</Badge>
                  <span>· {timeAgo(j.created_at)}</span>
                </div>
                <div className="font-display text-lg font-semibold">{j.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{j.location} · {j.experience}</div>
                <div className="mt-1 text-xs">
                  <span className="text-muted-foreground">HR:</span> {j.hr_name} · <a href={`mailto:${j.hr_email}`} className="text-primary underline">{j.hr_email}</a>
                  {j.hr_phone && <> · {j.hr_phone}</>}
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{j.description}</p>
                {j.rejection_reason && <div className="mt-2 rounded bg-rose-500/10 p-2 text-xs text-rose-600">Reason: {j.rejection_reason}</div>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2 border-t pt-3">
              <Button asChild variant="outline" size="sm"><a href={`/jobs/${j.id}`} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Preview</a></Button>
              {status !== "live" && (
                <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => decide.mutate({ id: j.id, action: "approve" })}>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Approve
                </Button>
              )}
              {status === "pending" && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setRejectFor({ id: j.id, type: "changes" })}>
                    <MessageSquareWarning className="mr-1.5 h-3.5 w-3.5" />Request changes
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setRejectFor({ id: j.id, type: "reject" })}>
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />Reject
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!rejectFor} onOpenChange={(o) => { if (!o) { setRejectFor(null); setReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{rejectFor?.type === "reject" ? "Reject job" : "Request changes"}</DialogTitle></DialogHeader>
          <Textarea rows={4} placeholder="Share a short note for the recruiter…" value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>Cancel</Button>
            <Button
              className={rejectFor?.type === "reject" ? "bg-rose-600 text-white hover:bg-rose-700" : "gradient-primary text-primary-foreground"}
              onClick={() => rejectFor && decide.mutate({ id: rejectFor.id, action: rejectFor.type, note: reason })}
            >
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
