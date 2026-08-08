import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  KeyRound,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { getImportStatus } from "@/lib/aggregator/status.functions";
import { triggerJobSync } from "@/lib/aggregator/sync.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/imports")({
  head: () => ({
    meta: [
      { title: "Import Status · HireSetu Admin" },
      { name: "description", content: "Live health of every HireSetu job import connector." },
      { property: "og:title", content: "Import Status · HireSetu Admin" },
      { property: "og:description", content: "Live health of every HireSetu job import connector." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportsPage,
});

function when(value: string | null | undefined) {
  if (!value) return "Never";
  const d = new Date(value);
  return `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

function ImportsPage() {
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getImportStatus);
  const runSync = useServerFn(triggerJobSync);

  const { data, isLoading } = useQuery({
    queryKey: ["import-status"],
    queryFn: () => fetchStatus({} as never),
    refetchInterval: 60_000,
  });

  const sync = useMutation({
    mutationFn: (connector?: string) => runSync({ data: connector ? { connector } : {} }),
    onSuccess: (res: any) => {
      toast.success(`Import finished — ${res.imported} saved, ${res.fetched} fetched, ${res.failures} failed`);
      qc.invalidateQueries({ queryKey: ["import-status"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Import failed"),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading import status…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Import Status</h2>
          <p className="text-sm text-muted-foreground">
            {data.totals.jobs} imported jobs ({data.totals.active} active) across {data.totals.sources} sources ·{" "}
            {data.scheduleLabel} · next sync {when(data.nextSyncAt)}
          </p>
        </div>
        <Button onClick={() => sync.mutate(undefined)} disabled={sync.isPending}>
          {sync.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Run import now
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.connectors.map((c) => (
          <Card key={c.connector}>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  {c.missingEnv.length ? (
                    <KeyRound className="h-4 w-4 text-amber-500" />
                  ) : c.connected ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  {c.label}
                </span>
                <Badge variant={c.connected ? "default" : "destructive"}>
                  {c.missingEnv.length ? "Credentials missing" : c.connected ? "Connected" : "Not connected"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {c.missingEnv.length > 0 && (
                <p className="flex items-start gap-2 rounded-md bg-amber-500/10 p-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Missing credentials: {c.missingEnv.join(", ")} — this provider cannot import until they are added.
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-muted p-2">
                  <div className="text-muted-foreground">Imported jobs</div>
                  <div className="text-base font-semibold">{c.imported_count}</div>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />Last success
                  </div>
                  <div className="font-semibold">{when(c.last_success_at)}</div>
                </div>
              </div>

              {c.last_error && (
                <p className="break-words rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  Last error: {c.last_error}
                </p>
              )}

              <ul className="space-y-1.5">
                {c.sources.length === 0 && <li className="text-xs text-muted-foreground">No sources configured.</li>}
                {c.sources.map((s) => (
                  <li key={s.id} className="rounded-md border p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {s.company_name ?? s.board_token ?? "—"}
                        {s.board_token && <span className="ml-1 text-muted-foreground">({s.board_token})</span>}
                      </span>
                      <Badge variant={s.last_status === "success" ? "secondary" : s.last_status ? "destructive" : "outline"}>
                        {s.last_status ?? "not run"}
                      </Badge>
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {s.imported_count} jobs · last run {when(s.last_synced_at)}
                    </div>
                    {s.last_error && <div className="mt-1 break-words text-destructive">{s.last_error}</div>}
                  </li>
                ))}
              </ul>

              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={sync.isPending}
                onClick={() => sync.mutate(c.connector)}
              >
                Run {c.label} import
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent runs</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="p-2">Connector</th>
                <th className="p-2">Board</th>
                <th className="p-2">Status</th>
                <th className="p-2">Fetched</th>
                <th className="p-2">Imported</th>
                <th className="p-2">Failed</th>
                <th className="p-2">When</th>
                <th className="p-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {data.recentRuns.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-muted-foreground">
                    No imports have run yet.
                  </td>
                </tr>
              )}
              {data.recentRuns.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 font-medium">{r.connector}</td>
                  <td className="p-2">{r.board_token ?? "—"}</td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2">{r.fetched_count}</td>
                  <td className="p-2">{r.imported_count}</td>
                  <td className="p-2">{r.failure_count}</td>
                  <td className="p-2">{when(r.finished_at ?? r.started_at)}</td>
                  <td className="max-w-[280px] break-words p-2 text-destructive">{r.error ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
