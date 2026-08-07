import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only manual trigger for the import engine. */
export const triggerJobSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ connector: z.string().min(1).max(40).optional() }).parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { runJobSync } = await import("@/lib/aggregator/sync.server");
    return runJobSync(data.connector ? { connector: data.connector } : {});
  });
