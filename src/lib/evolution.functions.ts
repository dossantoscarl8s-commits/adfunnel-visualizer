import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const connectWhatsappQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ adAccountId: z.string().uuid(), origin: z.string().url() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { connectUnit } = await import("@/lib/evolution.server");
    return connectUnit(data.adAccountId, data.origin);
  });

export const whatsappQrState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ adAccountId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { unitState } = await import("@/lib/evolution.server");
    return { state: await unitState(data.adAccountId) };
  });

export const disconnectWhatsappQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ adAccountId: z.string().uuid(), remove: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { disconnectUnit, deleteUnitInstance } = await import("@/lib/evolution.server");
    if (data.remove) return deleteUnitInstance(data.adAccountId);
    return disconnectUnit(data.adAccountId);
  });
