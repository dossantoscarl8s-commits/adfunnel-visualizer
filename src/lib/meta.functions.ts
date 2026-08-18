import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMetaOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ since: z.string(), until: z.string(), accountIds: z.array(z.string()).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const meta = await import("@/lib/meta.server");
    const { token, version } = await meta.getMetaToken(supabaseAdmin);
    const { data: accounts } = await supabaseAdmin
      .from("ad_accounts")
      .select("id, act_id, unit_name, active")
      .eq("active", true)
      .order("unit_name");
    const selected = (accounts ?? []).filter(
      (a) => !data.accountIds?.length || data.accountIds.includes(a.id),
    );
    if (!token) {
      return { configured: false, rows: [], daily: [], accounts: selected, errors: ["Token da Meta não configurado."] };
    }
    const rows: Awaited<ReturnType<typeof meta.toRow>>[] = [];
    const dailySeries: Array<ReturnType<typeof meta.toDaily>> = [];
    const errors: string[] = [];
    await Promise.all(
      selected.map(async (acc) => {
        try {
          const [total, daily] = await Promise.all([
            meta.fetchAccountInsights(token, version, acc.act_id, data.since, data.until, false),
            meta.fetchAccountInsights(token, version, acc.act_id, data.since, data.until, true),
          ]);
          rows.push(meta.toRow(acc.act_id, acc.unit_name, total));
          dailySeries.push(meta.toDaily(daily));
        } catch (e) {
          errors.push(`${acc.unit_name} (${acc.act_id}): ${(e as Error).message}`);
        }
      }),
    );
    rows.sort((a, b) => b.spend - a.spend);
    return { configured: true, rows, daily: meta.mergeDaily(dailySeries), accounts: selected, errors };
  });
