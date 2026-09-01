import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listAccessOverview } from "@/lib/trial.functions";

export const Route = createFileRoute("/_authenticated/admin/access")({
  component: AccessOverview,
  head: () => ({
    meta: [
      { title: "Trials & Memberships · HireSetu Admin" },
      { name: "description", content: "Monitor free Apply trials and paid memberships across HireSetu accounts." },
    ],
  }),
});

const FILTERS = [
  { key: "all", label: "All" },
  { key: "trial_active", label: "Active Trial" },
  { key: "trial_expired", label: "Expired Trial" },
  { key: "membership_active", label: "Active Membership" },
  { key: "membership_expired", label: "Expired Membership" },
] as const;

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—");

function AccessOverview() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [search, setSearch] = useState("");
  const list = useServerFn(listAccessOverview);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-access", filter, search],
    queryFn: () => list({ data: { filter, search } }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email"
          className="h-9 w-full sm:w-64"
        />
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Trial</th>
              <th className="p-3">Trial start</th>
              <th className="p-3">Trial end</th>
              <th className="p-3">Membership</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Expires</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && data.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No accounts match this filter.</td></tr>
            )}
            {data.map((r) => (
              <tr key={r.user_id} className="border-t">
                <td className="p-3">
                  <div className="font-medium">{r.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                </td>
                <td className="p-3">
                  <Badge variant={r.trial_status === "active" ? "default" : "secondary"}>
                    {r.trial_status ?? "none"}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground">{fmt(r.trial_start_at)}</td>
                <td className="p-3 text-muted-foreground">{fmt(r.trial_end_at)}</td>
                <td className="p-3">
                  <Badge variant={r.membership_status === "active" ? "default" : "secondary"}>
                    {r.membership_status ?? "none"}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground">{r.membership_plan ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{fmt(r.membership_expires_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-muted-foreground">
        Trials are read-only: they are created once per account at signup and expire automatically after 3 days.
      </p>
    </div>
  );
}
