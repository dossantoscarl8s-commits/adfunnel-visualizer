import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getWhatsappSettings() {
  const { data } = await supabaseAdmin.from("app_settings").select("value").eq("key", "whatsapp").maybeSingle();
  return (data?.value ?? {}) as {
    phone_number_id?: string;
    waba_id?: string;
    access_token?: string;
    verify_token?: string;
    app_secret?: string;
  };
}

async function resolveUnit(phoneNumberId?: string) {
  if (!phoneNumberId) return { unit_name: null as string | null, ad_account_id: null as string | null };
  const { data } = await supabaseAdmin
    .from("ad_accounts")
    .select("id, unit_name")
    .eq("whatsapp_number", phoneNumberId)
    .maybeSingle();
  return { unit_name: data?.unit_name ?? null, ad_account_id: data?.id ?? null };
}

type WaValue = {
  metadata?: { phone_number_id?: string; display_phone_number?: string };
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
  messages?: Array<{
    id?: string;
    from?: string;
    timestamp?: string;
    text?: { body?: string };
    type?: string;
    referral?: Record<string, unknown>;
  }>;
  statuses?: Array<{ recipient_id?: string; status?: string; timestamp?: string }>;
};

export async function processWebhook(payload: {
  entry?: Array<{ changes?: Array<{ value?: WaValue }> }>;
}) {
  let processed = 0;
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;
      const unit = await resolveUnit(value.metadata?.phone_number_id);

      for (const msg of value.messages ?? []) {
        const phone = msg.from ?? "";
        if (!phone) continue;
        const contact = value.contacts?.find((c) => c.wa_id === phone);
        const ts = msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString();
        const ref = (msg.referral ?? {}) as Record<string, string>;

        const { data: existing } = await supabaseAdmin
          .from("whatsapp_leads")
          .select("id")
          .eq("phone", phone)
          .eq("unit_name", unit.unit_name ?? "")
          .maybeSingle();

        let leadId = existing?.id;
        if (!leadId) {
          const { data: inserted } = await supabaseAdmin
            .from("whatsapp_leads")
            .insert({
              phone,
              wa_id: contact?.wa_id ?? phone,
              name: contact?.profile?.name ?? null,
              unit_name: unit.unit_name,
              ad_account_id: unit.ad_account_id,
              first_contact_at: ts,
              last_message_at: ts,
              first_message: msg.text?.body ?? msg.type ?? null,
              source_type: ref["source_type"] ?? (Object.keys(ref).length ? "ad" : "organico"),
              ctwa_clid: ref["ctwa_clid"] ?? null,
              campaign_id: ref["source_id"] ?? null,
              campaign_name: ref["headline"] ?? null,
              headline: ref["headline"] ?? null,
              source_url: ref["source_url"] ?? null,
              raw: { referral: ref } as unknown as never,
            })
            .select("id")
            .single();
          leadId = inserted?.id;
        } else {
          await supabaseAdmin
            .from("whatsapp_leads")
            .update({ last_message_at: ts, name: contact?.profile?.name ?? null })
            .eq("id", leadId);
        }

        if (leadId) {
          await supabaseAdmin.from("whatsapp_messages").insert({
            lead_id: leadId,
            direction: "in",
            body: msg.text?.body ?? `[${msg.type ?? "mídia"}]`,
            wa_message_id: msg.id ?? null,
            sent_at: ts,
            raw: msg as unknown as never,
          });
          processed += 1;
        }
      }

      for (const status of value.statuses ?? []) {
        if (!status.recipient_id) continue;
        if (status.status !== "sent" && status.status !== "delivered" && status.status !== "read") continue;
        await supabaseAdmin
          .from("whatsapp_leads")
          .update({ replied: true, replied_at: new Date().toISOString(), status: "em_atendimento" })
          .eq("phone", status.recipient_id)
          .eq("replied", false);
      }
    }
  }
  return processed;
}

export async function fetchCloudApiNumbers() {
  const cfg = await getWhatsappSettings();
  if (!cfg.access_token || !cfg.waba_id) throw new Error("Configure o WABA ID e o token da WhatsApp Cloud API.");
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${cfg.waba_id}/phone_numbers?access_token=${cfg.access_token}`,
  );
  const json = (await res.json()) as {
    data?: Array<{ id: string; display_phone_number: string; verified_name: string }>;
    error?: { message?: string };
  };
  if (json.error) throw new Error(json.error.message || "Erro na WhatsApp Cloud API");
  return json.data ?? [];
}
