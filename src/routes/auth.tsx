import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | Painel de Gestão de Tráfego" },
      { name: "description", content: "Acesse o painel de gestão de tráfego pago das suas unidades." },
      { property: "og:title", content: "Entrar | Painel de Gestão de Tráfego" },
      { property: "og:description", content: "Acesse o painel de gestão de tráfego pago das suas unidades." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const email = login.includes("@") ? login.trim() : `${login.trim().toLowerCase()}@trafego.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Usuário ou senha inválidos.");
      return;
    }
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="panel w-full max-w-sm p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Painel de Tráfego</h1>
            <p className="text-xs text-muted-foreground">Acesso restrito à equipe</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login">Usuário</Label>
            <Input id="login" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="admin" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
