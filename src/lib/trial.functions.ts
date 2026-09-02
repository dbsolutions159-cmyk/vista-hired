import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ApplyAccess = {
  now: string;
  canApply: boolean;
  membershipActive: boolean;
  membership: { plan: string; status: string; expires_at: string | null } | null;
  trialActive: boolean;
  trial: { trial_start_at: string; trial_end_at: string; trial_status: "active" | "expired" } | null;
};

/**
 * Single source of truth for Apply access.
 * Expiry is evaluated against database time — never the browser clock.
 */
export async function readApplyAccess(userId: string): Promise<ApplyAccess> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Flip any due trials to `expired` (also writes the audit row).
  await supabaseAdmin.rpc("expire_due_trials" as never);
  const { data } = await supabaseAdmin.rpc("apply_access_state" as never, {
    _user_id: userId,
  } as never);
  const s = (data ?? {}) as Record<string, unknown>;
  return {
    now: (s['now'] as string) ?? new Date().toISOString(),
    canApply: !!s['can_apply'],
    membershipActive: !!s['membership_active'],
    membership: (s['membership'] as ApplyAccess["membership"]) ?? null,
    trialActive: !!s['trial_active'],
    trial: (s['trial'] as ApplyAccess["trial"]) ?? null,
  };
}

export async function logAccess(userId: string, event: string, detail?: Record<string, unknown>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("access_audit_logs").insert({
    user_id: userId,
    event,
    detail: (detail ?? null) as never,
  } as never);
}

/** Server-verified access snapshot for the signed-in candidate. */
export const getApplyAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ApplyAccess> => readApplyAccess(context.userId));

/* ------------------------------------------------------------------ */
/* Admin: trial + membership overview                                  */
/* ------------------------------------------------------------------ */

const adminInput = z.object({
  filter: z
    .enum(["all", "trial_active", "trial_expired", "membership_active", "membership_expired", "no_access"])
    .default("all"),
  search: z.string().trim().max(120).optional(),
});

export type AccessRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  trial_status: string | null;
  trial_start_at: string | null;
  trial_end_at: string | null;
  membership_status: string | null;
  membership_plan: string | null;
  membership_expires_at: string | null;
  can_apply: boolean;
};

export const listAccessOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => adminInput.parse(data ?? {}))
  .handler(async ({ data, context }): Promise<AccessRow[]> => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("expire_due_trials" as never);

    const [{ data: profiles }, { data: trials }, { data: memberships }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, full_name").limit(1000),
      supabaseAdmin.from("apply_trials").select("user_id, trial_status, trial_start_at, trial_end_at").limit(1000),
      supabaseAdmin.from("memberships").select("user_id, status, plan, expires_at").limit(1000),
    ]);

    const tMap = new Map((trials ?? []).map((t: any) => [t.user_id, t]));
    const mMap = new Map((memberships ?? []).map((m: any) => [m.user_id, m]));

    const now = Date.now();
    let rows: AccessRow[] = (profiles ?? []).map((p: any) => {
      const t = tMap.get(p.id);
      const m = mMap.get(p.id);
      return {
        user_id: p.id,
        email: p.email ?? null,
        full_name: p.full_name ?? null,
        trial_status: t?.trial_status ?? null,
        trial_start_at: t?.trial_start_at ?? null,
        trial_end_at: t?.trial_end_at ?? null,
        membership_status: m?.status ?? null,
        membership_plan: m?.plan ?? null,
        membership_expires_at: m?.expires_at ?? null,
        can_apply: false,
      };
    });

    const memberActive = (r: AccessRow) =>
      r.membership_status === "active" &&
      (!r.membership_expires_at || new Date(r.membership_expires_at).getTime() > now);

    rows = rows.map((r) => ({
      ...r,
      can_apply:
        (r.membership_status === "active" &&
          (!r.membership_expires_at || new Date(r.membership_expires_at).getTime() > now)) ||
        (r.trial_status === "active" &&
          !!r.trial_end_at &&
          new Date(r.trial_end_at).getTime() > now),
    }));

    if (data.filter === "no_access") rows = rows.filter((r) => !r.can_apply);
    if (data.filter === "trial_active") rows = rows.filter((r) => r.trial_status === "active");
    if (data.filter === "trial_expired") rows = rows.filter((r) => r.trial_status === "expired");
    if (data.filter === "membership_active") rows = rows.filter(memberActive);
    if (data.filter === "membership_expired") rows = rows.filter((r) => !!r.membership_status && !memberActive(r));

    const q = data.search?.toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) => r.email?.toLowerCase().includes(q) || r.full_name?.toLowerCase().includes(q),
      );
    }
    return rows.slice(0, 300);
  });
