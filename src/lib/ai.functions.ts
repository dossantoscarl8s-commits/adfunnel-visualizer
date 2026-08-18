import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_AI } from "@/lib/settings-defaults";

export const askAnalyst = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        question: z.string().min(1),
        context: z.string().default(""),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
          .default([]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { callGateway } = await import("@/lib/ai.server");
    const { data: row } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "ai")
      .maybeSingle();
    const cfg = { ...DEFAULT_AI, ...((row?.value ?? {}) as Record<string, unknown>) };
    const answer = await callGateway(
      String(cfg.model ?? DEFAULT_AI.model),
      [
        { role: "system", content: String(cfg.system_prompt ?? DEFAULT_AI.system_prompt) },
        { role: "system", content: `Dados atuais do painel (JSON):\n${data.context}` },
        ...data.history,
        { role: "user", content: data.question },
      ],
      Number(cfg.temperature ?? 0.3),
    );
    return { answer };
  });
