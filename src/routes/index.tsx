import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DollarSign, Eye, MousePointerClick, Percent, Target, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { PeriodPicker } from "@/components/dashboard/period-picker";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { AiAssistant } from "@/components/dashboard/ai-assistant";
import { useRequireAuth } from "@/lib/use-auth";
import { brl, num, presetPeriod, type Period } from "@/lib/period";
import { getMetaOverview } from "@/lib/meta.functions";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_OVERVIEW, KPI_CATALOG, type OverviewConfig } from "@/lib/settings-defaults";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão geral | Painel de Gestão de Tráfego" },
      {
        name: "description",
        content:
          "Funil consolidado das contas de anúncio da Meta: investimento, leads, CPL e decisões assistidas por IA.",
      },
      { property: "og:title", content: "Visão geral | Painel de Gestão de Tráfego" },
      {
        property: "og:description",
        content: "Funil consolidado das contas de anúncio da Meta com análise assistida por IA.",
      },
    ],
  }),
  component: Overview,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Overview() {
  const auth = useRequireAuth();
  const [period, setPeriod] = useState<Period>(presetPeriod("30d"));
  const [config, setConfig] = useState<OverviewConfig>(DEFAULT_OVERVIEW);
  const fetchOverview = useServerFn(getMetaOverview);

  useEffect(() => {
    if (!auth.session) return;
    supabase
      .from("public_settings")
      .select("value")
      .eq("key", "overview")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setConfig({ ...DEFAULT_OVERVIEW, ...(data.value as OverviewConfig) });
      });
  }, [auth.session]);

  const { data, isFetching } = useQuery({
    queryKey: ["meta-overview", period.since, period.until],
    enabled: !!auth.session,
    queryFn: () => fetchOverview({ data: { since: period.since, until: period.until } }),
  });

  const rows = data?.rows ?? [];
  const totals = useMemo(() => {
    const t = rows.reduce(
      (acc, r) => {
        acc.spend += r.spend;
        acc.leads += r.leads + r.messaging;
        acc.impressions += r.impressions;
        acc.clicks += r.clicks;
        acc.conversations += r.messaging;
        return acc;
      },
      { spend: 0, leads: 0, impressions: 0, clicks: 0, conversations: 0 },
    );
    return {
      ...t,
      cpl: t.leads ? t.spend / t.leads : 0,
      ctr: t.impressions ? (t.clicks / t.impressions) * 100 : 0,
      cpm: t.impressions ? (t.spend / t.impressions) * 1000 : 0,
      cpc: t.clicks ? t.spend / t.clicks : 0,
    };
  }, [rows]);

  const kpiValue: Record<string, { value: string; icon: typeof DollarSign }> = {
    spend: { value: brl(totals.spend), icon: DollarSign },
    leads: { value: num(totals.leads), icon: Target },
    cpl: { value: brl(totals.cpl), icon: TrendingUp },
    impressions: { value: num(totals.impressions), icon: Eye },
    clicks: { value: num(totals.clicks), icon: MousePointerClick },
    ctr: { value: `${num(totals.ctr, 2)}%`, icon: Percent },
    cpm: { value: brl(totals.cpm), icon: DollarSign },
    cpc: { value: brl(totals.cpc), icon: DollarSign },
    conversations: { value: num(totals.conversations), icon: Target },
  };

  const daily = (data?.daily ?? []).map((d) => ({
    ...d,
    dia: d.date.slice(8, 10) + "/" + d.date.slice(5, 7),
    cpl: d.leads ? d.spend / d.leads : 0,
  }));

  const byUnit = rows.map((r) => ({
    unidade: r.unit_name,
    leads: r.leads + r.messaging,
    investimento: Number(r.spend.toFixed(2)),
    cpl: Number(r.cpl.toFixed(2)),
  }));

  const funnel = [
    { etapa: "Impressões", valor: totals.impressions },
    { etapa: "Cliques", valor: totals.clicks },
    { etapa: "Conversas", valor: totals.conversations },
    { etapa: "Leads", valor: totals.leads },
  ];

  const chart = (id: string) => {
    switch (id) {
      case "spend_leads_trend":
        return (
          <Panel key={id} title="Investimento x Leads" wide>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area type="monotone" dataKey="spend" name="Investimento" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.18} />
                <Area type="monotone" dataKey="leads" name="Leads" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.18} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
        );
      case "cpl_trend":
        return (
          <Panel key={id} title="Tendência de CPL" wide>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="cpl" name="CPL" stroke="var(--chart-4)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        );
      case "leads_by_unit":
      case "spend_by_unit":
      case "cpl_by_unit": {
        const key = id === "leads_by_unit" ? "leads" : id === "spend_by_unit" ? "investimento" : "cpl";
        const title =
          id === "leads_by_unit" ? "Leads por unidade" : id === "spend_by_unit" ? "Investimento por unidade" : "CPL por unidade";
        return (
          <Panel key={id} title={title}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[...byUnit].sort((a, b) => (b as never)[key] - (a as never)[key]).slice(0, 12)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="unidade" stroke="var(--muted-foreground)" fontSize={10} interval={0} angle={-25} height={60} textAnchor="end" />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey={key} fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        );
      }
      case "funnel":
        return (
          <Panel key={id} title="Funil geral">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={funnel} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis type="category" dataKey="etapa" stroke="var(--muted-foreground)" fontSize={11} width={90} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                  {funnel.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        );
      case "share_spend":
        return (
          <Panel key={id} title="Participação de investimento">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={byUnit} dataKey="investimento" nameKey="unidade" outerRadius={100} label>
                  {byUnit.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </Panel>
        );
      default:
        return null;
    }
  };

  return (
    <AppShell
      title="Visão geral"
      subtitle={`${period.label} · ${rows.length} contas monitoradas`}
      isAdmin={auth.isAdmin}
      username={auth.username}
      actions={<PeriodPicker period={period} onChange={setPeriod} />}
    >
      {data && !data.configured && (
        <div className="panel mb-6 border-warning/40 p-4 text-sm">
          Token da Meta ainda não configurado. Um administrador precisa cadastrá-lo em Configurações.
        </div>
      )}
      {!!data?.errors?.length && (
        <div className="panel mb-6 border-destructive/40 p-4 text-xs text-destructive">
          {data.errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {config.kpis.map((id) => {
          const meta = KPI_CATALOG.find((k) => k.id === id);
          if (!meta) return null;
          return (
            <KpiCard
              key={id}
              label={meta.label}
              value={isFetching ? "…" : (kpiValue[id]?.value ?? "—")}
              icon={kpiValue[id]?.icon}
            />
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="grid gap-4 xl:col-span-2">{config.charts.map(chart)}</div>
        <AiAssistant context={{ periodo: period, totais: totals, por_unidade: byUnit, diario: daily }} />
      </div>
    </AppShell>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

function Panel({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`panel p-4 ${wide ? "xl:col-span-2" : ""}`}>
      <p className="mb-3 text-sm font-semibold">{title}</p>
      {children}
    </div>
  );
}
