import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  Trophy,
  Users,
  Menu,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DEFAULT_APPEARANCE, type Appearance } from "@/lib/settings-defaults";

const NAV = [
  { to: "/", label: "Visão geral", icon: LayoutDashboard, admin: false },
  { to: "/ranking", label: "Ranking", icon: Trophy, admin: false },
  { to: "/leads-whatsapp", label: "Leads WhatsApp", icon: MessageCircle, admin: false },
  { to: "/usuarios", label: "Usuários", icon: Users, admin: true },
  { to: "/configuracoes", label: "Configurações", icon: Settings, admin: true },
] as const;

export function AppShell({
  children,
  title,
  subtitle,
  actions,
  isAdmin,
  username,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  isAdmin: boolean;
  username: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);

  useEffect(() => {
    supabase
      .from("public_settings")
      .select("value")
      .eq("key", "appearance")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setAppearance({ ...DEFAULT_APPEARANCE, ...(data.value as Appearance) });
      });
  }, []);

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-3 px-5">
          {appearance.logo_url ? (
            <img src={appearance.logo_url} alt="Logotipo" className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-lg">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <div className="leading-tight">
            <p className="text-sm font-semibold">{appearance.brand_name}</p>
            <p className="text-[11px] text-muted-foreground">Gestão de tráfego</p>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {NAV.filter((i) => !i.admin || isAdmin).map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-full border-t border-sidebar-border p-3">
          <div className="flex items-center justify-between rounded-lg px-2 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{username || "usuário"}</p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {isAdmin ? "administrador" : "operador"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sair"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border bg-background/85 px-4 py-4 backdrop-blur md:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((v) => !v)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="mr-auto">
            <h1 className="text-lg font-semibold tracking-tight md:text-xl">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground md:text-sm">{subtitle}</p>}
          </div>
          {actions}
        </header>
        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
