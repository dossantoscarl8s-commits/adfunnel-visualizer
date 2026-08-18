import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, listAppUsers } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    return listAppUsers();
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        login: z.string().min(3),
        password: z.string().min(5),
        full_name: z.string().optional(),
        role: z.enum(["admin", "user"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { assertAdmin, createAppUser } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    return createAppUser(data);
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["admin", "user"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { assertAdmin, setUserRole } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    if (data.userId === context.userId && data.role === "user") {
      throw new Error("Você não pode remover o próprio acesso de administrador.");
    }
    await setUserRole(data.userId, data.role);
    return { ok: true };
  });

export const removeUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { assertAdmin, deleteAppUser } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("Você não pode excluir a própria conta.");
    await deleteAppUser(data.userId);
    return { ok: true };
  });
