import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, FileText, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/admin/applications")({
  component: AdminApplications,
});

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "approved" ? "bg-emerald-500/15 text-emerald-600" :
    status === "rejected" ? "bg-rose-500/15 text-rose-600" :
    "bg-amber-500/15 text-amber-600";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}>{status}</span>;
}

function AdminApplications() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const applications = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("applications").select("*, jobs(title, company_name)").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("applications").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-recent-apps"] });
      toast.success(v.status === "approved" ? "Application approved" : v.status === "rejected" ? "Application rejected" : "Updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    return (applications.data ?? []).filter((a: any) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!query) return true;
      return (
        a.full_name.toLowerCase().includes(query) ||
        a.email.toLowerCase().includes(query) ||
        a.jobs?.title?.toLowerCase().includes(query) ||
        a.jobs?.company_name?.toLowerCase().includes(query)
      );
    });
  }, [applications.data, q, statusFilter]);

  const openResume = async (path: string) => {
    const { data } = await supabase.storage.from("resumes").createSignedUrl(path, 60 * 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const downloadCSV = () => {
    const rows = filtered.map((a: any) => ({
      name: a.full_name, email: a.email, mobile: a.mobile, city: a.city,
      qualification: a.qualification, experience: a.experience, current_company: a.current_company || "",
      job: a.jobs?.title || "", company: a.jobs?.company_name || "",
      status: a.status, applied_at: a.created_at,
    }));
    const headers = Object.keys(rows[0] || { name: "" });
    const csv = [headers.join(","), ...rows.map((r: any) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `applications-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, job…" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="submitted">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={downloadCSV} variant="outline"><Download className="mr-1.5 h-4 w-4" />Export CSV</Button>
      </div>

      <Card className="overflow-hidden p-0 shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Experience</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((a: any) => (
                <tr key={a.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3"><div className="font-medium">{a.full_name}</div><div className="text-xs text-muted-foreground">{a.city}</div></td>
                  <td className="px-4 py-3"><div className="font-medium">{a.jobs?.title}</div><div className="text-xs text-muted-foreground">{a.jobs?.company_name}</div></td>
                  <td className="px-4 py-3"><div>{a.email}</div><div className="text-xs text-muted-foreground">{a.mobile}</div></td>
                  <td className="px-4 py-3">{a.experience}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{timeAgo(a.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => openResume(a.resume_path)}><FileText className="mr-1 h-3.5 w-3.5" />Resume</Button>
                      <Button
                        size="sm"
                        disabled={a.status === "approved" || updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: a.id, status: "approved" })}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      ><Check className="mr-1 h-3.5 w-3.5" />Approve</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={a.status === "rejected" || updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: a.id, status: "rejected" })}
                        className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                      ><X className="mr-1 h-3.5 w-3.5" />Reject</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">No applications.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
