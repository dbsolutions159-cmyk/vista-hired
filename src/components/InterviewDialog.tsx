import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { INTERVIEW_MODES } from "@/lib/pipeline";

export interface InterviewDraft {
  id?: string;
  application_id: string;
  job_id: string;
  candidate_id: string;
  scheduled_at?: string;
  duration_minutes?: number;
  mode?: string;
  meeting_link?: string | null;
  location?: string | null;
  interviewer_name?: string | null;
  notes?: string | null;
}

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function InterviewDialog({
  open,
  onOpenChange,
  draft,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  draft: InterviewDraft | null;
}) {
  const qc = useQueryClient();
  const [when, setWhen] = useState("");
  const [duration, setDuration] = useState("30");
  const [mode, setMode] = useState("video");
  const [link, setLink] = useState("");
  const [location, setLocation] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!draft) return;
    setWhen(toLocalInput(draft.scheduled_at));
    setDuration(String(draft.duration_minutes ?? 30));
    setMode(draft.mode ?? "video");
    setLink(draft.meeting_link ?? "");
    setLocation(draft.location ?? "");
    setInterviewer(draft.interviewer_name ?? "");
    setNotes(draft.notes ?? "");
  }, [draft?.id, draft?.application_id, open]);

  const save = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      if (!when) throw new Error("Pick an interview date and time");
      const payload = {
        application_id: draft.application_id,
        job_id: draft.job_id,
        candidate_id: draft.candidate_id,
        scheduled_at: new Date(when).toISOString(),
        duration_minutes: Number(duration) || 30,
        mode,
        meeting_link: link || null,
        location: location || null,
        interviewer_name: interviewer || null,
        notes: notes || null,
        status: "scheduled",
      };
      if (draft.id) {
        const { error } = await supabase.from("interviews").update(payload).eq("id", draft.id);
        if (error) throw error;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase.from("interviews").insert({ ...payload, created_by: userData.user?.id });
        if (error) throw error;
      }
      // move the application into the interview stage
      const { error: stageErr } = await supabase
        .from("applications")
        .update({ stage: "interview_scheduled" })
        .eq("id", draft.application_id);
      if (stageErr) throw stageErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interviews"] });
      qc.invalidateQueries({ queryKey: ["hiring"] });
      qc.invalidateQueries({ queryKey: ["application-events"] });
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      toast.success(draft?.id ? "Interview rescheduled" : "Interview scheduled");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{draft?.id ? "Reschedule interview" : "Schedule interview"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Date & time *</Label>
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Duration (minutes)</Label>
            <Input type="number" min={10} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Interview type</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              {INTERVIEW_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          {mode !== "in_person" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Meeting link</Label>
              <Input placeholder="https://meet.google.com/…" value={link} onChange={(e) => setLink(e.target.value)} />
            </div>
          )}
          {mode === "in_person" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Location</Label>
              <Input placeholder="Office address" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Interviewer name</Label>
            <Input value={interviewer} onChange={(e) => setInterviewer(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notes for the candidate</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="gradient-primary text-primary-foreground" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : draft?.id ? "Reschedule" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
