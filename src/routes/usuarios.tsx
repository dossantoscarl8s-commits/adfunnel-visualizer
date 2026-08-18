import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/dashboard/app-shell";
import { useRequireAuth } from "@/lib/use-auth";
import { createUser, listUsers, removeUser, updateUserRole } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários e permissões | Painel de Tráfego" },
      { name: "description", content: "Crie usuários e defina quem é administrador do painel de tráfego." },
      { property: "og:title", content: "Usuários e permissões | Painel de Tráfego" },
      { property: "og:description", content: "Crie usuários e defina permissões do painel." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const auth = useRequireAuth(true);
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const addUser = useServerFn(createUser);
  const setRole = useServerFn(updateUserRole);
  const delUser = useServerFn(removeUser);

  const [form, setForm] = useState({ login: "", password: "", full_name: "", role: "user" as "user" | "admin" });

  const { data: users } = useQuery({
    queryKey: ["users"],
    enabled: auth.isAdmin,
    queryFn: () => fetchUsers(),
  });

  const create = useMutation({
    mutationFn: () => addUser({ data: form }),
    onSuccess: () => {
      toast.success("Usuário criado.");
      setForm({ login: "", password: "", full_name: "", role: "user" });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Usuários e permissões" subtitle="Somente administradores" isAdmin={auth.isAdmin} username={auth.username}>
      <div className="grid gap-4 lg:grid-cols-3">
        <form
          className="panel space-y-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <p className="flex items-center gap-2 text-sm font-semibold">
            <UserPlus className="h-4 w-4 text-primary" /> Novo usuário
          </p>
          <div className="space-y-1.5">
            <Label>Login</Label>
            <Input value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Nome completo</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Senha</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Papel</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "user" | "admin" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário comum</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? "Criando…" : "Criar usuário"}
          </Button>
        </form>

        <div className="panel overflow-x-auto p-0 lg:col-span-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Login</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.full_name || u.username}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">{u.username}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                      <Select
                        value={u.role}
                        onValueChange={async (v) => {
                          try {
                            await setRole({ data: { userId: u.id, role: v as "user" | "admin" } });
                            toast.success("Papel atualizado.");
                            qc.invalidateQueries({ queryKey: ["users"] });
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (!confirm(`Excluir ${u.username}?`)) return;
                        try {
                          await delUser({ data: { userId: u.id } });
                          toast.success("Usuário excluído.");
                          qc.invalidateQueries({ queryKey: ["users"] });
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
