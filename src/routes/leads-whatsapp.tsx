import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  MessageCircle,
  Phone,
  Search,
  Sparkles,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/dashboard/app-shell";
import { useRequireAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/leads-whatsapp")({
  head: () => ({
    meta: [
      { title: "Leads WhatsApp | Painel de Tráfego" },
      {
        name: "description",
        content: "Conversas do WhatsApp rastreadas por unidade, campanha, conjunto e anúncio de origem.",
      },
      { property: "og:title", content: "Leads WhatsApp | Painel de Tráfego" },
      { property: "og:description", content: "Conversas rastreadas por unidade e campanha de origem." },
    ],
  }),
  component: LeadsPage,
});

const PAGE_SIZE = 12;

type Lead = {
  id: string;
  name: string | null;
  phone: string;
  unit_name: string | null;
  first_contact_at: string;
  last_message_at: string | null;
  replied: boolean;
  status: string;
  first_message: string | null;
  source_type: string | null;
  ctwa_clid: string | null;
  campaign_name: string | null;
  adset_name: string | null;
  ad_name: string | null;
  campaign_id: string | null;
  adset_id: string | null;
  ad_id: string | null;
  headline: string | null;
  source_url: string | null;
};

function fmt(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function LeadsPage() {
  const auth = useRequireAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [unit, setUnit] = useState("todas");
  const [status, setStatus] = useState("todos");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: units } = useQuery({
    queryKey: ["units"],
    enabled: !!auth.session,
    queryFn: async () => {
      const { data } = await supabase.from("ad_accounts").select("unit_name").order("unit_name");
      return [...new Set((data ?? []).map((d) => d.unit_name))];
    },
  });

  const { data, isFetching } = useQuery({
    queryKey: ["leads", page, search, unit, status],
    enabled: !!auth.session,
    queryFn: async () => {
      let q = supabase
        .from("whatsapp_leads")
        .select("*", { count: "exact" })
        .order("first_contact_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      if (unit !== "todas") q = q.eq("unit_name", unit);
      if (status === "respondidos") q = q.eq("replied", true);
      if (status === "pendentes") q = q.eq("replied", false);
      const { data: rows, count, error } = await q;
      if (error) throw error;
      return { rows: (rows ?? []) as Lead[], count: count ?? 0 };
    },
  });

  useEffect(() => setPage(0), [search, unit, status]);

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));

  async function toggleReplied(lead: Lead) {
    const { error } = await supabase
      .from("whatsapp_leads")
      .update({
        replied: !lead.replied,
        replied_at: !lead.replied ? new Date().toISOString() : null,
        status: !lead.replied ? "em_atendimento" : "novo",
      })
      .eq("id", lead.id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["leads"] });
  }

  return (
    <AppShell
      title="Leads WhatsApp"
      subtitle={`${data?.count ?? 0} conversas rastreadas`}
      isAdmin={auth.isAdmin}
      username={auth.username}
      actions={
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-52 pl-9"
              placeholder="Nome ou telefone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas unidades</SelectItem>
              {(units ?? []).map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendentes">Sem resposta</SelectItem>
              <SelectItem value="respondidos">Respondidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      {isFetching && <p className="mb-4 text-sm text-muted-foreground">Carregando conversas…</p>}
      {!isFetching && (data?.rows.length ?? 0) === 0 && (
        <div className="panel p-8 text-center">
          <MessageCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Nenhuma conversa rastreada ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure a WhatsApp Cloud API em Configurações e aponte o webhook para começar a receber conversas.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {(data?.rows ?? []).map((lead) => {
          const open = expanded === lead.id;
          return (
            <article key={lead.id} className="panel p-4">
              <div className="flex flex-wrap items-start gap-4">
                <div className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-primary-foreground">
                  {(lead.name ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-[180px] flex-1">
                  <p className="font-medium">{lead.name || "Sem nome"}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> {lead.phone}
                  </p>
                </div>
                <div className="text-xs">
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3 w-3" /> Primeiro contato
                  </p>
                  <p className="font-medium">{fmt(lead.first_contact_at)}</p>
                </div>
                <div className="text-xs">
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Building2 className="h-3 w-3" /> Unidade
                  </p>
                  <p className="font-medium">{lead.unit_name || "Não mapeada"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={lead.replied ? "default" : "destructive"}>
                    {lead.replied ? "Respondido" : "Sem resposta"}
                  </Badge>
                  {lead.source_type === "ad" && (
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="h-3 w-3" /> Anúncio
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => toggleReplied(lead)}>
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setExpanded(open ? null : lead.id)}>
                    Expandir <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
                  </Button>
                </div>
              </div>

              {open && (
                <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-3">
                  <Field label="Campanha" value={lead.campaign_name || lead.campaign_id} />
                  <Field label="Conjunto" value={lead.adset_name || lead.adset_id} />
                  <Field label="Anúncio" value={lead.ad_name || lead.ad_id} />
                  <Field label="Título do anúncio" value={lead.headline} />
                  <Field label="Origem" value={lead.source_type} />
                  <Field label="CTWA CLID" value={lead.ctwa_clid} />
                  <Field label="URL de origem" value={lead.source_url} />
                  <Field label="Última mensagem" value={fmt(lead.last_message_at)} />
                  <Field label="Primeira mensagem" value={lead.first_message} />
                </div>
              )}
            </article>
          );
        })}
      </div>

      {(data?.count ?? 0) > PAGE_SIZE && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Página {page + 1} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="break-words text-sm">{value || "—"}</p>
    </div>
  );
}
