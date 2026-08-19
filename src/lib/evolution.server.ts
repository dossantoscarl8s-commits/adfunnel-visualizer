import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type EvolutionSettings = {
  base_url?: string;
  api_key?: string;
  webhook_token?: string;
};

export async function getEvolutionSettings(): Promise<EvolutionSettings> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "evolution")
    .maybeSingle();
  return (data?.value ?? {}) as EvolutionSettings;
}

function normalize(url: string) {
  return url.replace(/\/+$/, "");
}

async function evoFetch(path: string, init?: RequestInit) {
  const cfg = await getEvolutionSettings();
  if (!cfg.base_url || !cfg.api_key) {
    throw new Error("Configure a URL e a API key da Evolution API na aba WhatsApp QR Code.");
  }
  const res = await fetch(`${normalize(cfg.base_url)}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.api_key,
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const msg = json?.response?.message ?? json?.message ?? json?.error ?? `Evolution API: erro ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return json;
}

async function publicWebhookUrl() {
  const cfg = await getEvolutionSettings();
  const base = process.env["PUBLIC_SITE_URL"] ?? "";
  const token = cfg.webhook_token ?? "";
  return `${normalize(base)}/api/public/evolution/webhook${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

const EVENTS = ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "SEND_MESSAGE"];

/** Cria (se necessário) a instância da unidade e retorna o QR Code em base64. */
export async function connectUnit(adAccountId: string, siteOrigin: string) {
  const cfg = await getEvolutionSettings();
  const token = cfg.webhook_token ?? "";
  const webhook = `${normalize(siteOrigin)}/api/public/evolution/webhook${token ? `?token=${encodeURIComponent(token)}` : ""}`;

  let created: any = null;
  try {
    created = await evoFetch("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName: adAccountId,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        webhook: { url: webhook, byEvents: false, base64: true, events: EVENTS },
      }),
    });
  } catch (e) {
    // instância já existe -> segue para o connect
    if (!/already|exists|in use/i.test((e as Error).message)) throw e;
  }

  const qrFromCreate = created?.qrcode?.base64 ?? null;
  if (qrFromCreate) return { qr: qrFromCreate as string, state: "connecting" };

  const conn = await evoFetch(`/instance/connect/${encodeURIComponent(adAccountId)}`);
  return {
    qr: (conn?.base64 as string) ?? null,
    code: (conn?.code as string) ?? null,
    state: (conn?.instance?.state as string) ?? "connecting",
  };
}

export async function unitState(adAccountId: string) {
  try {
    const json = await evoFetch(`/instance/connectionState/${encodeURIComponent(adAccountId)}`);
    return (json?.instance?.state as string) ?? "close";
  } catch {
    return "not_found";
  }
}

export async function disconnectUnit(adAccountId: string) {
  await evoFetch(`/instance/logout/${encodeURIComponent(adAccountId)}`, { method: "DELETE" });
  return { ok: true };
}

export async function deleteUnitInstance(adAccountId: string) {
  await evoFetch(`/instance/delete/${encodeURIComponent(adAccountId)}`, { method: "DELETE" });
  return { ok: true };
}

export async function sendEvolutionText(adAccountId: string, phone: string, text: string) {
  return evoFetch(`/message/sendText/${encodeURIComponent(adAccountId)}`, {
    method: "POST",
    body: JSON.stringify({ number: phone, text }),
  });
}

export { publicWebhookUrl };

type EvoPayload = {
  event?: string;
  instance?: string;
  data?: any;
};

function digits(jid: string) {
  return (jid || "").split("@")[0]?.split(":")[0] ?? "";
}

function extractText(message: any): string | null {
  if (!message) return null;
  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    message.videoMessage?.caption ??
    null
  );
}

/** Processa eventos da Evolution API e grava leads/mensagens com atribuição de anúncio. */
export async function processEvolutionWebhook(payload: EvoPayload) {
  const event = (payload.event ?? "").toLowerCase().replace(/_/g, ".");
  const instance = payload.instance ?? "";
  if (!instance) return 0;

  const { data: account } = await supabaseAdmin
    .from("ad_accounts")
    .select("id, unit_name")
    .eq("id", instance)
    .maybeSingle();

  if (event !== "messages.upsert") return 0;

  const items = Array.isArray(payload.data) ? payload.data : [payload.data];
  let processed = 0;

  for (const item of items) {
    if (!item?.key?.remoteJid) continue;
    const jid = item.key.remoteJid as string;
    if (jid.endsWith("@g.us") || jid.includes("status@")) continue;
    const phone = digits(jid);
    if (!phone) continue;

    const fromMe = Boolean(item.key.fromMe);
    const ts = item.messageTimestamp
      ? new Date(Number(item.messageTimestamp) * 1000).toISOString()
      : new Date().toISOString();
    const body = extractText(item.message);

    const ctx =
      item.message?.extendedTextMessage?.contextInfo ??
      item.message?.imageMessage?.contextInfo ??
      item.contextInfo ??
      {};
    const ad = ctx?.externalAdReply ?? null;

    const { data: existing } = await supabaseAdmin
      .from("whatsapp_leads")
      .select("id, replied")
      .eq("phone", phone)
      .eq("unit_name", account?.unit_name ?? "")
      .maybeSingle();

    let leadId = existing?.id;

    if (!leadId && !fromMe) {
      const { data: inserted } = await supabaseAdmin
        .from("whatsapp_leads")
        .insert({
          phone,
          wa_id: phone,
          name: item.pushName ?? null,
          unit_name: account?.unit_name ?? null,
          ad_account_id: account?.id ?? null,
          first_contact_at: ts,
          last_message_at: ts,
          first_message: body,
          source_type: ad ? "ad" : "organico",
          ctwa_clid: ad?.ctwaClid ?? null,
          campaign_id: ad?.sourceId ?? null,
          campaign_name: ad?.title ?? null,
          headline: ad?.title ?? null,
          source_url: ad?.sourceUrl ?? null,
          raw: { externalAdReply: ad ?? null, provider: "evolution" } as unknown as never,
        })
        .select("id")
        .single();
      leadId = inserted?.id;
    }

    if (!leadId) continue;

    await supabaseAdmin
      .from("whatsapp_leads")
      .update({
        last_message_at: ts,
        ...(fromMe && !existing?.replied
          ? { replied: true, replied_at: ts, status: "em_atendimento" }
          : {}),
      })
      .eq("id", leadId);

    await supabaseAdmin.from("whatsapp_messages").insert({
      lead_id: leadId,
      direction: fromMe ? "out" : "in",
      body: body ?? "[mídia]",
      wa_message_id: item.key.id ?? null,
      sent_at: ts,
      raw: item as unknown as never,
    });
    processed += 1;
  }

  return processed;
}
