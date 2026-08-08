import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ConnectorStatus = {
  connector: string;
  label: string;
  connected: boolean;
  /** Credential env vars this connector needs and which of them are missing. */
  requiresEnv: string[];
  missingEnv: string[];
  sources: {
    id: string;
    board_token: string | null;
    company_name: string | null;
    enabled: boolean;
    last_synced_at: string | null;
    last_status: string | null;
    last_error: string | null;
    imported_count: number;
  }[];
  imported_count: number;
  last_success_at: string | null;
  last_error: string | null;
};

export type ImportStatus = {
  connectors: ConnectorStatus[];
  totals: { jobs: number; active: number; sources: number };
  recentRuns: {
    id: string;
    connector: string;
    board_token: string | null;
    status: string;
    fetched_count: number;
    imported_count: number;
    skipped_count: number;
    duplicate_count: number;
    failure_count: number;
    duration_ms: number | null;
    error: string | null;
    finished_at: string | null;
    started_at: string;
  }[];
  nextSyncAt: string | null;
  scheduleLabel: string;
};

/** Admin-only health view of the multi-source job engine. */
export const getImportStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ImportStatus> => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");

    const { CONNECTORS } = await import("./registry.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: sources }, { data: runs }, { data: jobRows }] = await Promise.all([
      supabaseAdmin.from("job_sources").select("*").order("connector"),
      supabaseAdmin.from("job_import_logs").select("*").order("started_at", { ascending: false }).limit(40),
      supabaseAdmin.from("external_jobs").select("source, is_active, company_name"),
    ]);

    const counts = new Map<string, number>();
    const countsByCompany = new Map<string, number>();
    let active = 0;
    for (const row of (jobRows ?? []) as { source: string; is_active: boolean; company_name: string }[]) {
      counts.set(row.source, (counts.get(row.source) ?? 0) + 1);
      const k = `${row.source}::${(row.company_name ?? "").toLowerCase()}`;
      countsByCompany.set(k, (countsByCompany.get(k) ?? 0) + 1);
      if (row.is_active) active++;
    }

    const connectors: ConnectorStatus[] = Object.values(CONNECTORS).map((c) => {
      const requiresEnv = c.requiresEnv ?? [];
      const missingEnv = requiresEnv.filter((k) => !process.env[k]);
      const rows = ((sources ?? []) as any[]).filter((s) => s.connector === c.id);
      const successRuns = ((runs ?? []) as any[]).filter(
        (r) => r.connector === c.id && (r.status === "success" || r.status === "partial"),
      );
      const errRun = ((runs ?? []) as any[]).find((r) => r.connector === c.id && r.error);
      return {
        connector: c.id,
        label: c.label,
        connected: missingEnv.length === 0 && rows.some((s) => s.enabled),
        requiresEnv,
        missingEnv,
        sources: rows.map((s) => ({
          id: s.id,
          board_token: s.board_token,
          company_name: s.company_name,
          enabled: s.enabled,
          last_synced_at: s.last_synced_at,
          last_status: s.last_status,
          last_error: s.last_error,
          imported_count: countsByCompany.get(`${c.id}::${(s.company_name ?? "").toLowerCase()}`) ?? 0,
        })),
        imported_count: counts.get(c.id) ?? 0,
        last_success_at: successRuns[0]?.finished_at ?? successRuns[0]?.started_at ?? null,
        last_error: errRun?.error ?? rows.find((s) => s.last_error)?.last_error ?? null,
      };
    });

    // Scheduled every 30 minutes on the hour and half-hour.
    const now = new Date();
    const next = new Date(now);
    next.setSeconds(0, 0);
    next.setMinutes(now.getMinutes() < 30 ? 30 : 60);

    return {
      connectors,
      totals: { jobs: jobRows?.length ?? 0, active, sources: sources?.length ?? 0 },
      recentRuns: (runs ?? []) as ImportStatus["recentRuns"],
      nextSyncAt: next.toISOString(),
      scheduleLabel: "Every 30 minutes",
    };
  });
