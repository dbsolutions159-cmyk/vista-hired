import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, Building2, Calendar, Download, GraduationCap, Mail, MapPin, MessageCircle,
  Phone, Send, StickyNote, Video, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { timeAgo } from "@/lib/jobs";
import { computeCompletion } from "@/lib/profile-completion";
import { CompletionRing } from "@/components/CompletionRing";
import { StageBadge } from "@/components/StageBadge";
import { ApplicationTimeline } from "@/components/ApplicationTimeline";
import { InterviewDialog, type InterviewDraft } from "@/components/InterviewDialog";
import { formatDateTime, interviewModeLabel, stageLabel, type Stage } from "@/lib/pipeline";
import { signedAvatarUrl, signedResumeUrl } from "@/lib/hiring";

const NEXT_ACTIONS: { stage: Stage; label: string; tone?: "default" | "danger" }[] = [
  { stage: "under_review", label: "Mark Under Review" },
  { stage: "shortlisted", label: "Shortlist" },
  { stage: "interview_completed", label: "Interview Completed" },
  { stage: "selected", label: "Select Candidate" },
  { stage: "offer_sent", label: "Mark Offer Sent" },
  { stage: "offer_accepted", label: "Mark Offer Accepted" },
  { stage: "hired", label: "Mark Hired" },
  { stage: "rejected", label: "Reject", tone: "danger" },
];

export function CandidateDetail({ applicationId }: { applicationId: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [draft, setDraft] = useState<InterviewDraft | null>(null);
  const [confirmStage, setConfirmStage] = useState<Stage | null>(null);

  const appQ = useQuery({
    queryKey: ["hiring", "application", applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, jobs(id, title, company_name, location, poster_user_id)")
        .eq("id", applicationId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const candidateId = appQ.data?.user_id as string | undefined;

  const profileQ = useQuery({
    enabled: !!candidateId,
    queryKey: ["hiring", "candidate-profile", candidateId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", candidateId!).maybeSingle();
      return data as any;
    },
  });

  const eduQ = useQuery({
    enabled: !!candidateId,
    queryKey: ["hiring", "candidate-education", candidateId],
    queryFn: async () => {
      const { data } = await supabase.from("candidate_education").select("*").eq("user_id", candidateId!);
      return data ?? [];
    },
  });

  const expQ = useQuery({
    enabled: !!candidateId,
    queryKey: ["hiring", "candidate-experience", candidateId],
    queryFn: async () => {
      const { data } = await supabase.from("candidate_experience").select("*").eq("user_id", candidateId!);
      return data ?? [];
    },
  });

  const interviewsQ = useQuery({
    queryKey: ["interviews", applicationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("interviews")
        .select("*")
        .eq("application_id", applicationId)
        .order("scheduled_at", { ascending: false });
      return data ?? [];
    },
  });

  const notesQ = useQuery({
    queryKey: ["hiring", "notes", applicationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("application_notes")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => {
    (async () => {
      setResumeUrl(await signedResumeUrl(appQ.data?.resume_path));
      setAvatar(await signedAvatarUrl(profileQ.data?.avatar_url));
    })();
  }, [appQ.data?.resume_path, profileQ.data?.avatar_url]);

  const setStage = useMutation({
    mutationFn: async (stage: Stage) => {
      const status = stage === "rejected" ? "rejected" : stage === "applied" ? "submitted" : "approved";
      const { error } = await supabase.from("applications").update({ stage, status }).eq("id", applicationId);
      if (error) throw error;
    },
    onSuccess: (_d, stage) => {
      qc.invalidateQueries({ queryKey: ["hiring"] });
      qc.invalidateQueries({ queryKey: ["application-events", applicationId] });
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success(`Moved to ${stageLabel(stage)}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addNote = useMutation({
    mutationFn: async () => {
      if (!note.trim()) throw new Error("Write a note first");
      const { error } = await supabase
        .from("application_notes")
        .insert({ application_id: applicationId, author_id: user!.id, body: note.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setNote("");
      notesQ.refetch();
      toast.success("Note added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const interviewAction = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("interviews").update({ status }).eq("id", id);
      if (error) throw error;
      if (status === "completed") {
        await supabase.from("applications").update({ stage: "interview_completed" }).eq("id", applicationId);
      }
    },
    onSuccess: () => {
      interviewsQ.refetch();
      qc.invalidateQueries({ queryKey: ["hiring"] });
      qc.invalidateQueries({ queryKey: ["application-events", applicationId] });
      toast.success("Interview updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (appQ.isLoading) return <div className="space-y-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (!appQ.data) return <Card className="p-8 text-center text-muted-foreground">Application not found.</Card>;

  const a = appQ.data;
  const p = profileQ.data;
  const pct = computeCompletion(p);
  const phone = (a.mobile || p?.phone || "").replace(/[^\d+]/g, "");
  const initials = (a.full_name || "U").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
  const skills: string[] = p?.skills ?? [];

  const openSchedule = (existing?: any) => {
    setDraft({
      id: existing?.id,
      application_id: a.id,
      job_id: a.job_id,
      candidate_id: a.user_id,
      scheduled_at: existing?.scheduled_at,
      duration_minutes: existing?.duration_minutes,
      mode: existing?.mode,
      meeting_link: existing?.meeting_link,
      location: existing?.location,
      interviewer_name: existing?.interviewer_name,
      notes: existing?.notes,
    });
    setInterviewOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-primary/20">
              <AvatarImage src={avatar ?? undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-bold sm:text-2xl">{a.full_name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <StageBadge stage={a.stage} />
                <span>Applied {timeAgo(a.created_at)}</span>
                {a.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{a.city}</span>}
              </div>
            </div>
          </div>
          <div className="shrink-0"><CompletionRing pct={pct} size={72} /></div>
        </div>

        {/* Quick actions */}
        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
          {phone && <Button asChild size="sm" variant="outline"><a href={`tel:${phone}`}><Phone className="mr-1.5 h-3.5 w-3.5" />Call</a></Button>}
          {phone && <Button asChild size="sm" variant="outline"><a href={`https://wa.me/${phone.replace(/^\+/, "")}`} target="_blank" rel="noreferrer"><MessageCircle className="mr-1.5 h-3.5 w-3.5" />WhatsApp</a></Button>}
          <Button asChild size="sm" variant="outline"><a href={`mailto:${a.email}`}><Mail className="mr-1.5 h-3.5 w-3.5" />Email</a></Button>
          {resumeUrl && <Button asChild size="sm" variant="outline"><a href={resumeUrl} target="_blank" rel="noreferrer"><Download className="mr-1.5 h-3.5 w-3.5" />Resume</a></Button>}
          <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => openSchedule()}>
            <Calendar className="mr-1.5 h-3.5 w-3.5" />Schedule interview
          </Button>
        </div>
      </Card>

      {/* Stage actions */}
      <Card className="p-5 shadow-soft">
        <h2 className="mb-3 font-display text-base font-semibold">Move candidate</h2>
        <div className="flex flex-wrap gap-2">
          {NEXT_ACTIONS.map((act) => (
            <Button
              key={act.stage}
              size="sm"
              variant={act.tone === "danger" ? "outline" : "secondary"}
              disabled={a.stage === act.stage || setStage.isPending}
              className={act.tone === "danger" ? "border-destructive/40 text-destructive hover:bg-destructive/10" : ""}
              onClick={() => (act.tone === "danger" ? setConfirmStage(act.stage) : setStage.mutate(act.stage))}
            >
              {act.label}
            </Button>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Contact + application */}
        <Card className="p-5 shadow-soft">
          <h2 className="mb-3 font-display text-base font-semibold">Contact & application</h2>
          <dl className="space-y-2 text-sm">
            <Row icon={Mail} label="Email" value={a.email} />
            <Row icon={Phone} label="Mobile" value={a.mobile} />
            <Row icon={MapPin} label="Location" value={a.city || p?.city} />
            <Row icon={GraduationCap} label="Qualification" value={a.qualification} />
            <Row icon={Briefcase} label="Experience" value={a.experience} />
            <Row icon={Building2} label="Current company" value={a.current_company || p?.current_company} />
            <Row icon={Briefcase} label="Applied for" value={`${a.jobs?.title} · ${a.jobs?.company_name}`} />
          </dl>
          {a.cover_letter && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Cover letter</div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{a.cover_letter}</p>
            </div>
          )}
        </Card>

        {/* Timeline */}
        <Card className="p-5 shadow-soft">
          <h2 className="mb-3 font-display text-base font-semibold">Application timeline</h2>
          <ApplicationTimeline applicationId={applicationId} />
        </Card>

        {/* Skills + preferences */}
        <Card className="p-5 shadow-soft">
          <h2 className="mb-3 font-display text-base font-semibold">Skills & preferences</h2>
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => <Badge key={s} variant="secondary" className="rounded-full">{s}</Badge>)}
            </div>
          ) : <p className="text-sm text-muted-foreground">No skills listed.</p>}
          <dl className="mt-4 space-y-2 text-sm">
            <Row icon={Briefcase} label="Preferred role" value={p?.headline} />
            <Row icon={MapPin} label="Preferred location" value={p?.preferred_location} />
            <Row icon={Briefcase} label="Employment type" value={p?.employment_pref} />
            <Row icon={Briefcase} label="Expected salary" value={p?.expected_salary} />
          </dl>
          {p?.experience_summary && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{p.experience_summary}</p>}
        </Card>

        {/* Experience + education */}
        <Card className="p-5 shadow-soft">
          <h2 className="mb-3 font-display text-base font-semibold">Experience & education</h2>
          <div className="space-y-3">
            {(expQ.data ?? []).map((e: any) => (
              <div key={e.id} className="rounded-lg border p-3">
                <div className="text-sm font-medium">{e.job_title} · {e.company}</div>
                <div className="text-xs text-muted-foreground">{e.start_date} – {e.is_current ? "Present" : e.end_date || "—"}{e.location ? ` · ${e.location}` : ""}</div>
                {e.description && <p className="mt-1 text-xs">{e.description}</p>}
              </div>
            ))}
            {(eduQ.data ?? []).map((e: any) => (
              <div key={e.id} className="rounded-lg border p-3">
                <div className="text-sm font-medium">{e.degree}{e.field_of_study ? ` · ${e.field_of_study}` : ""}</div>
                <div className="text-xs text-muted-foreground">{e.institution} · {e.start_year} – {e.end_year || "—"}{e.grade ? ` · ${e.grade}` : ""}</div>
              </div>
            ))}
            {(expQ.data ?? []).length === 0 && (eduQ.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Candidate hasn't added detailed history yet.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Interviews */}
      <Card className="p-5 shadow-soft">
        <h2 className="mb-3 font-display text-base font-semibold">Interviews</h2>
        {(interviewsQ.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>}
        <div className="space-y-2">
          {(interviewsQ.data ?? []).map((iv: any) => (
            <div key={iv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Video className="h-4 w-4 text-primary" />{interviewModeLabel(iv.mode)} interview
                  <Badge variant="outline" className="rounded-full capitalize">{iv.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{formatDateTime(iv.scheduled_at)} · {iv.duration_minutes} min{iv.interviewer_name ? ` · ${iv.interviewer_name}` : ""}</div>
                {iv.meeting_link && <a href={iv.meeting_link} target="_blank" rel="noreferrer" className="text-xs text-primary underline">{iv.meeting_link}</a>}
                {iv.location && <div className="text-xs text-muted-foreground">{iv.location}</div>}
              </div>
              {iv.status === "scheduled" && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openSchedule(iv)}>Reschedule</Button>
                  <Button size="sm" variant="secondary" onClick={() => interviewAction.mutate({ id: iv.id, status: "completed" })}>Mark completed</Button>
                  <Button size="sm" variant="outline" className="border-destructive/40 text-destructive" onClick={() => interviewAction.mutate({ id: iv.id, status: "cancelled" })}>
                    <X className="mr-1 h-3.5 w-3.5" />Cancel
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Internal notes */}
      <Card className="p-5 shadow-soft">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold"><StickyNote className="h-4 w-4" />Internal notes</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Textarea rows={2} placeholder="Visible only to the hiring team…" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button className="shrink-0 gradient-primary text-primary-foreground" disabled={addNote.isPending} onClick={() => addNote.mutate()}>
            <Send className="mr-1.5 h-3.5 w-3.5" />Add note
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {(notesQ.data ?? []).map((n: any) => (
            <div key={n.id} className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="whitespace-pre-wrap">{n.body}</p>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{timeAgo(n.created_at)}</div>
            </div>
          ))}
          {(notesQ.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
        </div>
      </Card>

      <InterviewDialog open={interviewOpen} onOpenChange={setInterviewOpen} draft={draft} />

      <AlertDialog open={!!confirmStage} onOpenChange={(o) => !o && setConfirmStage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              {a.full_name} will be notified that their application was not successful. You can still change the stage later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (confirmStage) setStage.mutate(confirmStage); setConfirmStage(null); }}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="break-words text-sm">{value}</dd>
      </div>
    </div>
  );
}
