import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Scheduled job-import endpoint. Called by the database scheduler every 30 min.
 * Public prefix, so it authenticates the caller with the project key itself.
 */
export const Route = createFileRoute("/api/public/hooks/sync-jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey =
          request.headers.get("apikey") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        const expected = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
        if (!apiKey || !expected || apiKey !== expected) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let connector: string | undefined;
        try {
          const body = await request.json();
          connector = z.object({ connector: z.string().min(1).max(40).optional() }).parse(body ?? {}).connector;
        } catch {
          connector = undefined;
        }

        try {
          const { runJobSync } = await import("@/lib/aggregator/sync.server");
          const result = await runJobSync(connector ? { connector } : {});
          return Response.json({ ok: true, ...result });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[sync-jobs] failed:", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
