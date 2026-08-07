/**
 * Import pipeline: fetch → normalize → India filter → dedupe → upsert → log.
 * Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getConnector } from "./registry.server";
import { normalizeJob } from "./normalize.server";
import type { NormalizedJob, SourceConfig } from "./types";

export type SyncResult = {
  sources: number;
  fetched: number;
  imported: number;
  updated: number;
  duplicates: number;
  skipped: number;
  failures: number;
  deactivated: number;
  durationMs: number;
};

export async function runJobSync(opts: { connector?: string } = {}): Promise<SyncResult> {
  const startedAll = Date.now();
  let query = supabaseAdmin.from("job_sources").select("*").eq("enabled", true);
  if (opts.connector) query = query.eq("connector", opts.connector);
  const { data: sources, error } = await query;
  if (error) throw new Error(`Could not load job sources: ${error.message}`);

  const totals: SyncResult = {
    sources: 0, fetched: 0, imported: 0, updated: 0, duplicates: 0,
    skipped: 0, failures: 0, deactivated: 0, durationMs: 0,
  };

  for (const src of (sources ?? []) as unknown as SourceConfig[]) {
    const connector = getConnector(src.connector);
    const startedAt = new Date();
    const t0 = Date.now();
    if (!connector) {
      await logRun(src, startedAt, t0, { status: "failed", error: `No connector registered for "${src.connector}"` });
      totals.failures++;
      continue;
    }

    totals.sources++;
    try {
      const raw = await connector.fetchJobs(src);
      const normalized: NormalizedJob[] = [];
      const seen = new Set<string>();
      let duplicates = 0;
      let skipped = 0;

      for (const r of raw) {
        const job = normalizeJob(r, src, { label: connector.label, logo: connector.logo });
        if (!job) {
          skipped++;
          continue;
        }
        if (seen.has(job.dedupe_key)) {
          duplicates++;
          continue;
        }
        seen.add(job.dedupe_key);
        normalized.push(job);
      }

      let imported = 0;
      let failures = 0;
      const importedKeys: string[] = [];
      for (let i = 0; i < normalized.length; i += 100) {
        const chunk = normalized.slice(i, i + 100);
        const { data, error: upErr } = await supabaseAdmin
          .from("external_jobs")
          .upsert(chunk as never, { onConflict: "dedupe_key" })
          .select("id, dedupe_key");
        if (upErr) {
          failures += chunk.length;
          continue;
        }
        imported += data?.length ?? 0;
        for (const row of data ?? []) importedKeys.push((row as { dedupe_key: string }).dedupe_key);
      }

      // Retire listings from this source that disappeared upstream (> 21 days old).
      let deactivated = 0;
      if (importedKeys.length) {
        const cutoff = new Date(Date.now() - 21 * 86400_000).toISOString();
        const { data: stale } = await supabaseAdmin
          .from("external_jobs")
          .update({ is_active: false })
          .eq("source", src.connector)
          .eq("is_active", true)
          .lt("updated_at", cutoff)
          .select("id");
        deactivated = stale?.length ?? 0;
      }

      totals.fetched += raw.length;
      totals.imported += imported;
      totals.duplicates += duplicates;
      totals.skipped += skipped;
      totals.failures += failures;
      totals.deactivated += deactivated;

      await logRun(src, startedAt, t0, {
        status: failures ? "partial" : "success",
        fetched: raw.length,
        imported,
        duplicates,
        skipped,
        failures,
        deactivated,
      });
      await supabaseAdmin
        .from("job_sources")
        .update({ last_synced_at: new Date().toISOString(), last_status: failures ? "partial" : "success", last_error: null })
        .eq("id", src.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      totals.failures++;
      await logRun(src, startedAt, t0, { status: "failed", error: message.slice(0, 500) });
      await supabaseAdmin
        .from("job_sources")
        .update({ last_synced_at: new Date().toISOString(), last_status: "failed", last_error: message.slice(0, 500) })
        .eq("id", src.id);
    }
  }

  totals.durationMs = Date.now() - startedAll;
  return totals;
}

async function logRun(
  src: SourceConfig,
  startedAt: Date,
  t0: number,
  data: {
    status: string;
    fetched?: number;
    imported?: number;
    duplicates?: number;
    skipped?: number;
    failures?: number;
    deactivated?: number;
    error?: string;
  },
) {
  await supabaseAdmin.from("job_import_logs").insert({
    connector: src.connector,
    board_token: src.board_token,
    started_at: startedAt.toISOString(),
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - t0,
    fetched_count: data.fetched ?? 0,
    imported_count: data.imported ?? 0,
    updated_count: data.deactivated ?? 0,
    skipped_count: data.skipped ?? 0,
    duplicate_count: data.duplicates ?? 0,
    failure_count: data.failures ?? 0,
    status: data.status,
    error: data.error ?? null,
  } as never);
}
