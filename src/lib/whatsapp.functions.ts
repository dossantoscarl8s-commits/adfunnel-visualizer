import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listWhatsappNumbers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { fetchCloudApiNumbers } = await import("@/lib/whatsapp.server");
    return fetchCloudApiNumbers();
  });

export const sendWhatsappReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ leadId: z.string().uuid(), text: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getWhatsappSettings } = await import("@/lib/whatsapp.server");
    const cfg = await getWhatsappSettings();
    if (!cfg.access_token || !cfg.phone_number_id) throw new Error("Configure a WhatsApp Cloud API.");
    const { data: lead } = await supabaseAdmin
      .from("whatsapp_leads")
      .select("phone, ad_account_id")
      .eq("id", data.leadId)
      .maybeSingle();
    if (!lead) throw new Error("Lead não encontrado.");
    const res = await fetch(`https://graph.facebook.com/v21.0/${cfg.phone_number_id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: lead.phone,
        type: "text",
        text: { body: data.text },
      }),
    });
    const json = (await res.json()) as { error?: { message?: string }; messages?: Array<{ id: string }> };
    if (json.error) throw new Error(json.error.message ?? "Falha ao enviar mensagem.");
    await supabaseAdmin.from("whatsapp_messages").insert({
      lead_id: data.leadId,
      direction: "out",
      body: data.text,
      wa_message_id: json.messages?.[0]?.id ?? null,
    });
    await supabaseAdmin
      .from("whatsapp_leads")
      .update({ replied: true, replied_at: new Date().toISOString(), status: "em_atendimento" })
      .eq("id", data.leadId);
    return { ok: true };
  });
