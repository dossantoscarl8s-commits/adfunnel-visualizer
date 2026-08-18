import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso restrito a administradores.");
}

export function toEmail(login: string) {
  return login.includes("@") ? login.trim().toLowerCase() : `${login.trim().toLowerCase()}@trafego.local`;
}

export async function listAppUsers() {
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const { data: profiles } = await supabaseAdmin.from("profiles").select("*");
  const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
  return (authUsers?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    created_at: u.created_at,
    username: profiles?.find((p) => p.id === u.id)?.username ?? (u.email ?? "").split("@")[0],
    full_name: profiles?.find((p) => p.id === u.id)?.full_name ?? "",
    role: (roles?.find((r) => r.user_id === u.id)?.role ?? "user") as "admin" | "user",
  }));
}

export async function createAppUser(input: {
  login: string;
  password: string;
  full_name?: string | undefined;
  role: "admin" | "user";
}) {
  const email = toEmail(input.login);
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(error?.message ?? "Não foi possível criar o usuário.");
  await supabaseAdmin.from("profiles").upsert({
    id: data.user.id,
    username: input.login.trim().toLowerCase(),
    full_name: input.full_name ?? input.login,
  });
  await supabaseAdmin.from("user_roles").upsert({ user_id: data.user.id, role: input.role });
  return { id: data.user.id, email };
}

export async function setUserRole(userId: string, role: "admin" | "user") {
  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
  if (error) throw new Error(error.message);
}

export async function deleteAppUser(userId: string) {
  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  await supabaseAdmin.from("profiles").delete().eq("id", userId);
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
}

export async function ensureBootstrapAdmin() {
  const { data: existing } = await supabaseAdmin.from("user_roles").select("id").eq("role", "admin").limit(1);
  if (existing && existing.length > 0) return { created: false as const };
  const email = "admin@trafego.local";
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: "admin",
    email_confirm: true,
  });
  let userId = created?.user?.id;
  if (error || !userId) {
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    userId = list?.users.find((u) => u.email === email)?.id;
    if (!userId) throw new Error(error?.message ?? "Falha ao criar admin");
  }
  await supabaseAdmin.from("profiles").upsert({ id: userId, username: "admin", full_name: "Administrador" });
  await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "admin" });
  return { created: true as const };
}
