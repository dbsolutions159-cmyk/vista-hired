import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Job } from "@/lib/jobs";
import { employmentTypeLabels, workTypeLabels } from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/admin/jobs")({
  component: AdminJobs,
});

interface FormState {
  id?: string;
  title: string;
  company_name: string;
  category: string;
  description: string;
  location: string;
  experience: string;
  salary_min: string;
  salary_max: string;
  work_type: "onsite" | "remote" | "hybrid";
  employment_type: "full_time" | "part_time" | "contract" | "internship" | "freelance";
  published: boolean;
}

const empty: FormState = {
  title: "", company_name: "", category: "Engineering", description: "", location: "",
  experience: "", salary_min: "", salary_max: "",
  work_type: "onsite", employment_type: "full_time", published: true,
};

function AdminJobs() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);

  const jobs = useQuery({
    queryKey: ["admin-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Job[];
    },
  });

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        title: f.title, company_name: f.company_name, category: f.category || null,
        description: f.description, location: f.location, experience: f.experience || null,
        salary_min: f.salary_min ? parseInt(f.salary_min) : null,
        salary_max: f.salary_max ? parseInt(f.salary_max) : null,
        work_type: f.work_type, employment_type: f.employment_type, published: f.published,
      };
      if (f.id) {
        const { error } = await supabase.from("jobs").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("jobs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-jobs"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success(form.id ? "Job updated" : "Job created");
      setOpen(false);
      setForm(empty);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-jobs"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job deleted");
    },
  });

  const togglePub = async (job: Job) => {
    await supabase.from("jobs").update({ published: !job.published }).eq("id", job.id);
    qc.invalidateQueries({ queryKey: ["admin-jobs"] });
    qc.invalidateQueries({ queryKey: ["jobs"] });
  };

  const startEdit = (j: Job) => {
    setForm({
      id: j.id, title: j.title, company_name: j.company_name, category: j.category || "",
      description: j.description, location: j.location, experience: j.experience || "",
      salary_min: j.salary_min?.toString() || "", salary_max: j.salary_max?.toString() || "",
      work_type: j.work_type, employment_type: j.employment_type, published: j.published,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(empty); }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground shadow-soft"><Plus className="mr-1.5 h-4 w-4" />Add job</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit job" : "Create a new job"}</DialogTitle>
              <DialogDescription>Publish a role to appear in the public feed.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Company</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Experience</Label><Input value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} placeholder="e.g. 3-5 years" /></div>
                <div className="space-y-1.5"><Label>Work type</Label>
                  <Select value={form.work_type} onValueChange={(v: any) => setForm({ ...form, work_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="onsite">On-site</SelectItem><SelectItem value="remote">Remote</SelectItem><SelectItem value="hybrid">Hybrid</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Employment</Label>
                  <Select value={form.employment_type} onValueChange={(v: any) => setForm({ ...form, employment_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(employmentTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Salary min (₹)</Label><Input type="number" value={form.salary_min} onChange={(e) => setForm({ ...form, salary_min: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Salary max (₹)</Label><Input type="number" value={form.salary_max} onChange={(e) => setForm({ ...form, salary_max: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>Description</Label><Textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} /><Label>Published</Label></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => save.mutate(form)} disabled={save.isPending} className="gradient-primary text-primary-foreground">
                {save.isPending ? "Saving…" : "Save job"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-3 shadow-soft">
        <div className="divide-y">
          {jobs.data?.map((j) => (
            <div key={j.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{j.title}</div>
                <div className="text-xs text-muted-foreground truncate">{j.company_name} · {j.location} · {workTypeLabels[j.work_type]}</div>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant={j.published ? "default" : "secondary"} className="cursor-pointer" onClick={() => togglePub(j)}>{j.published ? "Live" : "Draft"}</Badge>
                <Button variant="ghost" size="icon" onClick={() => startEdit(j)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this job?")) del.mutate(j.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
          {jobs.data?.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No jobs yet.</div>}
        </div>
      </Card>
    </div>
  );
}
