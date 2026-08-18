import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/dashboard/app-shell";
import { useRequireAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getAdminSettings, saveAdminSettings } from "@/lib/settings.functions";
import {
  CHART_CATALOG,
  DEFAULT_AI,
  DEFAULT_APPEARANCE,
  DEFAULT_OVERVIEW,
  KPI_CATALOG,
  type AiSettings,
  type Appearance,
  type MetaSettings,
  type OverviewConfig,
  type WhatsappSettings,
} from "@/lib/settings-defaults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações | Painel de Tráfego" },
      { name: "description", content: "Tokens Meta, contas de anúncio, WhatsApp Cloud API, IA e aparência do painel." },
      { property: "og:title", content: "Configurações | Painel de Tráfego" },
      { property: "og:description", content: "Tokens Meta, contas, WhatsApp, IA e aparência." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

const MODELS = [
  "google/gemini-3.7-flash",
  "google/gemini-2.5-pro",
  "openai/gpt-5.6-terra",
  "openai/gpt-5.6-sol",
];

function SettingsPage() {
  const auth = useRequireAuth(true);
  const qc = useQueryClient();
  const load = useServerFn(getAdminSettings);
  const save = useServerFn(saveAdminSettings);

  const [meta, setMeta] = useState<MetaSettings>({ api_version: "v21.0" });
  const [wa, setWa] = useState<WhatsappSettings>({});
  const [ai, setAi] = useState<AiSettings>(DEFAULT_AI);
  const [look, setLook] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [overview, setOverview] = useState<OverviewConfig>(DEFAULT_OVERVIEW);
  const [account, setAccount] = useState({ act_id: "", unit_name: "", whatsapp_number: "" });

  const { data: settings } = useQuery<Record<string, Record<string, any>>>({
    queryKey: ["admin-settings"],
    enabled: auth.isAdmin,
    queryFn: () => load(),
  });

  const { data: publicSettings } = useQuery({
    queryKey: ["public-settings"],
    enabled: auth.isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("public_settings").select("key, value");
      const out: Record<string, any> = {};
      for (const r of data ?? []) out[r.key] = r.value ?? {};
      return out;
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ["ad-accounts"],
    enabled: auth.isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("ad_accounts").select("*").order("unit_name");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!settings) return;
    setMeta({ api_version: "v21.0", ...(settings["meta"] as MetaSettings) });
    setWa({ ...(settings["whatsapp"] as WhatsappSettings) });
    setAi({ ...DEFAULT_AI, ...(settings["ai"] as AiSettings) });
  }, [settings]);

  useEffect(() => {
    if (!publicSettings) return;
    setLook({ ...DEFAULT_APPEARANCE, ...(publicSettings["appearance"] ?? {}) });
    setOverview({ ...DEFAULT_OVERVIEW, ...(publicSettings["overview"] ?? {}) });
  }, [publicSettings]);

  async function saveSecret(key: string, value: Record<string, unknown>) {
    try {
      await save({ data: { key, value } });
      toast.success("Configuração salva.");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function savePublic(key: string, value: Record<string, unknown>) {
    const { error } = await supabase
      .from("public_settings")
      .upsert({ key, value: value as never, updated_at: new Date().toISOString() });
    if (error) toast.error(error.message);
    else {
      toast.success("Configuração salva.");
      qc.invalidateQueries({ queryKey: ["public-settings"] });
    }
  }

  const webhookUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/public/whatsapp/webhook` : "";

  return (
    <AppShell title="Configurações" subtitle="Somente administradores" isAdmin={auth.isAdmin} username={auth.username}>
      <Tabs defaultValue="meta">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="meta">Meta API</TabsTrigger>
          <TabsTrigger value="contas">Contas / Unidades</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="ia">Inteligência artificial</TabsTrigger>
          <TabsTrigger value="painel">Painel e aparência</TabsTrigger>
        </TabsList>

        <TabsContent value="meta">
          <div className="panel max-w-2xl space-y-4 p-5">
            <div className="space-y-1.5">
              <Label>Token permanente (System User)</Label>
              <Input
                type="password"
                value={meta.permanent_token ?? ""}
                onChange={(e) => setMeta({ ...meta, permanent_token: e.target.value })}
                placeholder="EAAG..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Token temporário</Label>
              <Input
                type="password"
                value={meta.temp_token ?? ""}
                onChange={(e) => setMeta({ ...meta, temp_token: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Usado apenas quando não houver token permanente cadastrado.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Versão da API</Label>
                <Input value={meta.api_version ?? ""} onChange={(e) => setMeta({ ...meta, api_version: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Business ID (opcional)</Label>
                <Input value={meta.business_id ?? ""} onChange={(e) => setMeta({ ...meta, business_id: e.target.value })} />
              </div>
            </div>
            <Button onClick={() => saveSecret("meta", meta as Record<string, unknown>)}>
              <Save className="mr-2 h-4 w-4" /> Salvar
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="contas">
          <div className="grid gap-4 lg:grid-cols-3">
            <form
              className="panel space-y-3 p-5"
              onSubmit={async (e) => {
                e.preventDefault();
                const { error } = await supabase.from("ad_accounts").insert({
                  act_id: account.act_id.startsWith("act_") ? account.act_id : `act_${account.act_id}`,
                  unit_name: account.unit_name,
                  whatsapp_number: account.whatsapp_number || null,
                });
                if (error) {
                  toast.error(error.message);
                  return;
                }
                setAccount({ act_id: "", unit_name: "", whatsapp_number: "" });
                qc.invalidateQueries({ queryKey: ["ad-accounts"] });
                toast.success("Unidade cadastrada.");
              }}
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Plus className="h-4 w-4 text-primary" /> Nova unidade
              </p>
              <div className="space-y-1.5">
                <Label>act_id</Label>
                <Input value={account.act_id} onChange={(e) => setAccount({ ...account, act_id: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Nome da unidade</Label>
                <Input value={account.unit_name} onChange={(e) => setAccount({ ...account, unit_name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp (phone number id / número)</Label>
                <Input
                  value={account.whatsapp_number}
                  onChange={(e) => setAccount({ ...account, whatsapp_number: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">Cadastrar</Button>
            </form>

            <div className="panel overflow-x-auto p-0 lg:col-span-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Unidade</th>
                    <th className="px-4 py-3">act_id</th>
                    <th className="px-4 py-3">WhatsApp</th>
                    <th className="px-4 py-3">Ativa</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {(accounts ?? []).map((a) => (
                    <tr key={a.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-medium">{a.unit_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.act_id}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.whatsapp_number ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={a.active}
                          onCheckedChange={async (v) => {
                            await supabase.from("ad_accounts").update({ active: v }).eq("id", a.id);
                            qc.invalidateQueries({ queryKey: ["ad-accounts"] });
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            await supabase.from("ad_accounts").delete().eq("id", a.id);
                            qc.invalidateQueries({ queryKey: ["ad-accounts"] });
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(accounts ?? []).length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Cadastre as 17 contas de anúncio para começar o monitoramento.
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="whatsapp">
          <div className="panel max-w-2xl space-y-4 p-5">
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs">
              <p className="font-medium">URL do webhook (Meta → WhatsApp → Configuração)</p>
              <code className="break-all text-muted-foreground">{webhookUrl}</code>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Phone Number ID</Label>
                <Input value={wa.phone_number_id ?? ""} onChange={(e) => setWa({ ...wa, phone_number_id: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>WABA ID</Label>
                <Input value={wa.waba_id ?? ""} onChange={(e) => setWa({ ...wa, waba_id: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Access token (WhatsApp Cloud API)</Label>
              <Input type="password" value={wa.access_token ?? ""} onChange={(e) => setWa({ ...wa, access_token: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Verify token</Label>
                <Input value={wa.verify_token ?? ""} onChange={(e) => setWa({ ...wa, verify_token: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>App secret</Label>
                <Input type="password" value={wa.app_secret ?? ""} onChange={(e) => setWa({ ...wa, app_secret: e.target.value })} />
              </div>
            </div>
            <Button onClick={() => saveSecret("whatsapp", wa as Record<string, unknown>)}>
              <Save className="mr-2 h-4 w-4" /> Salvar
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="ia">
          <div className="panel max-w-2xl space-y-4 p-5">
            <div className="space-y-1.5">
              <Label>Modelo</Label>
              <Select value={ai.model ?? ""} onValueChange={(v) => setAi({ ...ai, model: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Temperatura ({ai.temperature})</Label>
              <Input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={ai.temperature ?? 0.3}
                onChange={(e) => setAi({ ...ai, temperature: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prompt de sistema</Label>
              <Textarea
                rows={6}
                value={ai.system_prompt ?? ""}
                onChange={(e) => setAi({ ...ai, system_prompt: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Insights automáticos</p>
                <p className="text-xs text-muted-foreground">Gera leitura da performance ao abrir a visão geral.</p>
              </div>
              <Switch checked={!!ai.auto_insights} onCheckedChange={(v) => setAi({ ...ai, auto_insights: v })} />
            </div>
            <Button onClick={() => saveSecret("ai", ai as Record<string, unknown>)}>
              <Save className="mr-2 h-4 w-4" /> Salvar
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="painel">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="panel space-y-4 p-5">
              <p className="text-sm font-semibold">Aparência</p>
              <div className="space-y-1.5">
                <Label>Nome da marca</Label>
                <Input value={look.brand_name} onChange={(e) => setLook({ ...look, brand_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>URL do logo</Label>
                <Input value={look.logo_url} onChange={(e) => setLook({ ...look, logo_url: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Densidade</Label>
                <Select
                  value={look.density}
                  onValueChange={(v) => setLook({ ...look, density: v as Appearance["density"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comfortable">Confortável</SelectItem>
                    <SelectItem value="compact">Compacta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => savePublic("appearance", look as unknown as Record<string, unknown>)}>
                <Save className="mr-2 h-4 w-4" /> Salvar aparência
              </Button>
            </div>

            <div className="panel space-y-4 p-5">
              <p className="text-sm font-semibold">Indicadores e gráficos da visão geral</p>
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">KPIs</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {KPI_CATALOG.map((k) => (
                    <label key={k.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={overview.kpis.includes(k.id)}
                        onCheckedChange={(v) =>
                          setOverview({
                            ...overview,
                            kpis: v ? [...overview.kpis, k.id] : overview.kpis.filter((x) => x !== k.id),
                          })
                        }
                      />
                      {k.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Gráficos</p>
                <div className="grid gap-2">
                  {CHART_CATALOG.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={overview.charts.includes(c.id)}
                        onCheckedChange={(v) =>
                          setOverview({
                            ...overview,
                            charts: v ? [...overview.charts, c.id] : overview.charts.filter((x) => x !== c.id),
                          })
                        }
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={() => savePublic("overview", overview as unknown as Record<string, unknown>)}>
                <Save className="mr-2 h-4 w-4" /> Salvar painel
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
