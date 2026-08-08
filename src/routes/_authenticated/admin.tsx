import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { BarChart3, Briefcase, ClipboardCheck, FileText, PlugZap, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!role) throw redirect({ to: "/" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-primary" />Admin</h1>
          <p className="text-sm text-muted-foreground">Manage jobs, applications, and users.</p>
        </div>
        <nav className="flex gap-1 rounded-full bg-muted p-1">
          <Button asChild variant="ghost" size="sm" className="rounded-full"><Link to="/admin"><BarChart3 className="mr-1.5 h-4 w-4" />Dashboard</Link></Button>
          <Button asChild variant="ghost" size="sm" className="rounded-full"><Link to="/admin/submissions"><ClipboardCheck className="mr-1.5 h-4 w-4" />Submissions</Link></Button>
          <Button asChild variant="ghost" size="sm" className="rounded-full"><Link to="/admin/jobs"><Briefcase className="mr-1.5 h-4 w-4" />Jobs</Link></Button>
          <Button asChild variant="ghost" size="sm" className="rounded-full"><Link to="/admin/applications"><FileText className="mr-1.5 h-4 w-4" />Applications</Link></Button>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
