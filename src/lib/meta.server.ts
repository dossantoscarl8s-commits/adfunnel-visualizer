import type { SupabaseClient } from "@supabase/supabase-js";

export type MetaRow = {
  act_id: string;
  unit_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  leads: number;
  messaging: number;
  cpl: number;
  ctr: number;
  cpm: number;
  cpc: number;
  error?: string;
};

export type DailyPoint = {
  date: string;
  spend: number;
  leads: number;
  clicks: number;
  impressions: number;
};

const LEAD_ACTIONS = new Set([
  "lead",
  "leadgen_grouped",
  "onsite_conversion.lead_grouped",
  "offsite_conversion.fb_pixel_lead",
  "onsite_web_lead",
]);
const MSG_ACTIONS = new Set([
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.total_messaging_connection",
]);

function sumActions(actions: Array<{ action_type: string; value: string }> | undefined, set: Set<string>) {
  if (!actions) return 0;
  return actions.reduce((acc, a) => (set.has(a.action_type) ? acc + Number(a.value || 0) : acc), 0);
}

export async function getMetaToken(supabase: SupabaseClient) {
  const { data } = await supabase.from("app_settings").select("value").eq("key", "meta").maybeSingle();
  const meta = (data?.value ?? {}) as { permanent_token?: string; temp_token?: string; api_version?: string };
  const token = meta.permanent_token?.trim() || meta.temp_token?.trim() || "";
  return { token, version: meta.api_version?.trim() || "v21.0" };
}

export async function fetchAccountInsights(
  token: string,
  version: string,
  actId: string,
  since: string,
  until: string,
  daily: boolean,
) {
  const normalized = actId.startsWith("act_") ? actId : `act_${actId}`;
  const params = new URLSearchParams({
    access_token: token,
    level: "account",
    fields: "spend,impressions,clicks,reach,ctr,cpm,cpc,actions",
    time_range: JSON.stringify({ since, until }),
    limit: "500",
  });
  if (daily) params.set("time_increment", "1");
  const res = await fetch(`https://graph.facebook.com/${version}/${normalized}/insights?${params}`);
  const json = (await res.json()) as {
    data?: Array<Record<string, unknown>>;
    error?: { message?: string };
  };
  if (json.error) throw new Error(json.error.message || "Erro na API da Meta");
  return json.data ?? [];
}

export function toRow(actId: string, unitName: string, rows: Array<Record<string, unknown>>): MetaRow {
  const agg = rows.reduce(
    (acc, r) => {
      acc.spend += Number(r["spend"] || 0);
      acc.impressions += Number(r["impressions"] || 0);
      acc.clicks += Number(r["clicks"] || 0);
      acc.reach += Number(r["reach"] || 0);
      const actions = r["actions"] as Array<{ action_type: string; value: string }> | undefined;
      acc.leads += sumActions(actions, LEAD_ACTIONS);
      acc.messaging += sumActions(actions, MSG_ACTIONS);
      return acc;
    },
    { spend: 0, impressions: 0, clicks: 0, reach: 0, leads: 0, messaging: 0 },
  );
  const totalLeads = agg.leads + agg.messaging;
  return {
    act_id: actId,
    unit_name: unitName,
    ...agg,
    cpl: totalLeads > 0 ? agg.spend / totalLeads : 0,
    ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
    cpm: agg.impressions > 0 ? (agg.spend / agg.impressions) * 1000 : 0,
    cpc: agg.clicks > 0 ? agg.spend / agg.clicks : 0,
  };
}

export function toDaily(rows: Array<Record<string, unknown>>): DailyPoint[] {
  return rows.map((r) => {
    const actions = r["actions"] as Array<{ action_type: string; value: string }> | undefined;
    return {
      date: String(r["date_start"] ?? ""),
      spend: Number(r["spend"] || 0),
      leads: sumActions(actions, LEAD_ACTIONS) + sumActions(actions, MSG_ACTIONS),
      clicks: Number(r["clicks"] || 0),
      impressions: Number(r["impressions"] || 0),
    };
  });
}

export function mergeDaily(all: DailyPoint[][]): DailyPoint[] {
  const map = new Map<string, DailyPoint>();
  for (const series of all) {
    for (const p of series) {
      const cur = map.get(p.date) ?? { date: p.date, spend: 0, leads: 0, clicks: 0, impressions: 0 };
      cur.spend += p.spend;
      cur.leads += p.leads;
      cur.clicks += p.clicks;
      cur.impressions += p.impressions;
      map.set(p.date, cur);
    }
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}
