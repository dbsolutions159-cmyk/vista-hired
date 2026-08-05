import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { BarChart3, Briefcase, CalendarDays, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareSubscriptionButton, SubscriptionButton } from "@/components/SubscriptionButtons";

export const Route = createFileRoute("/_authenticated/hiring")({
  component: HiringLayout,
});

function HiringLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-16">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Hiring</h1>
          <p className="text-sm text-muted-foreground">Manage your jobs, applicants and interviews.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SubscriptionButton />
          <ShareSubscriptionButton />
        </div>
        <nav className="flex flex-wrap gap-1 rounded-full bg-muted p-1">
          <Button asChild variant="ghost" size="sm" className="rounded-full"><Link to="/hiring"><BarChart3 className="mr-1.5 h-4 w-4" />Dashboard</Link></Button>
          <Button asChild variant="ghost" size="sm" className="rounded-full"><Link to="/hiring/jobs"><Briefcase className="mr-1.5 h-4 w-4" />My jobs</Link></Button>
          <Button asChild variant="ghost" size="sm" className="rounded-full"><Link to="/hiring/applicants"><Users className="mr-1.5 h-4 w-4" />Applicants</Link></Button>
          <Button asChild variant="ghost" size="sm" className="rounded-full"><Link to="/hiring/interviews"><CalendarDays className="mr-1.5 h-4 w-4" />Interviews</Link></Button>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}

      <Outlet />
    </div>
  );
}
