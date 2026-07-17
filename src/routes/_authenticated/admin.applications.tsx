import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/admin/applications")({
  component: AdminApplications,
});

function AdminApplications() {
  const [q, setQ] = useState("");
  const applications = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("applications").select("*, jobs(title, company_name)").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    if (!query) return applications.data ?? [];
    return (applications.data ?? []).filter((a: any) =>
      a.full_name.toLowerCase().includes(query) ||
      a.email.toLowerCase().includes(query) ||
      a.jobs?.title?.toLowerCase().includes(query) ||
      a.jobs?.company_name?.toLowerCase().includes(query)
    );
  }, [applications.data, q]);

  const openResume = async (path: string) => {
    const { data } = await supabase.storage.from("resumes").createSignedUrl(path, 60 * 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const downloadCSV = () => {
    const rows = filtered.map((a: any) => ({
      name: a.full_name, email: a.email, mobile: a.mobile, city: a.city,
      qualification: a.qualification, experience: a.experience, current_company: a.current_company || "",
      job: a.jobs?.title || "", company: a.jobs?.company_name || "",
      applied_at: a.created_at,
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
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((a: any) => (
                <tr key={a.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3"><div className="font-medium">{a.full_name}</div><div className="text-xs text-muted-foreground">{a.city}</div></td>
                  <td className="px-4 py-3"><div className="font-medium">{a.jobs?.title}</div><div className="text-xs text-muted-foreground">{a.jobs?.company_name}</div></td>
                  <td className="px-4 py-3"><div>{a.email}</div><div className="text-xs text-muted-foreground">{a.mobile}</div></td>
                  <td className="px-4 py-3">{a.experience}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{timeAgo(a.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => openResume(a.resume_path)}><FileText className="mr-1.5 h-3.5 w-3.5" />Resume</Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No applications.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
