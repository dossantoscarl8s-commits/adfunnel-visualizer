import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, Medal } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { PeriodPicker } from "@/components/dashboard/period-picker";
import { useRequireAuth } from "@/lib/use-auth";
import { brl, num, presetPeriod, type Period } from "@/lib/period";
import { getMetaOverview } from "@/lib/meta.functions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking de unidades | Painel de Tráfego" },
      { name: "description", content: "Compare unidades por leads, investimento, CPL, CTR e CPM no período escolhido." },
      { property: "og:title", content: "Ranking de unidades | Painel de Tráfego" },
      { property: "og:description", content: "Compare unidades por leads, investimento, CPL, CTR e CPM." },
    ],
  }),
  component: RankingPage,
});

const COLUMNS = [
  { id: "leads", label: "Leads", format: (v: number) => num(v) },
  { id: "spend", label: "Investimento", format: brl },
  { id: "cpl", label: "CPL", format: brl },
  { id: "cpc", label: "CPC", format: brl },
  { id: "cpm", label: "CPM", format: brl },
  { id: "ctr", label: "CTR", format: (v: number) => `${num(v, 2)}%` },
  { id: "clicks", label: "Cliques", format: (v: number) => num(v) },
  { id: "impressions", label: "Impressões", format: (v: number) => num(v) },
] as const;

function RankingPage() {
  const auth = useRequireAuth();
  const [period, setPeriod] = useState<Period>(presetPeriod("30d"));
  const [sortBy, setSortBy] = useState<string>("leads");
  const [desc, setDesc] = useState(true);
  const [visible, setVisible] = useState<string[]>(["leads", "spend", "cpl", "ctr"]);
  const fetchOverview = useServerFn(getMetaOverview);

  const { data, isFetching } = useQuery({
    queryKey: ["meta-ranking", period.since, period.until],
    enabled: !!auth.session,
    queryFn: () => fetchOverview({ data: { since: period.since, until: period.until } }),
  });

  const rows = useMemo(() => {
    const list = (data?.rows ?? []).map((r) => ({ ...r, leads: r.leads + r.messaging }));
    return list.sort((a, b) => {
      const va = Number((a as never)[sortBy] ?? 0);
      const vb = Number((b as never)[sortBy] ?? 0);
      return desc ? vb - va : va - vb;
    });
  }, [data, sortBy, desc]);

  return (
    <AppShell
      title="Ranking de unidades"
      subtitle={`${period.label} · ordenado por ${COLUMNS.find((c) => c.id === sortBy)?.label}`}
      isAdmin={auth.isAdmin}
      username={auth.username}
      actions={
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Colunas</Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 space-y-2">
              {COLUMNS.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={visible.includes(c.id)}
                    onCheckedChange={(v) =>
                      setVisible((prev) => (v ? [...prev, c.id] : prev.filter((x) => x !== c.id)))
                    }
                  />
                  {c.label}
                </label>
              ))}
            </PopoverContent>
          </Popover>
          <PeriodPicker period={period} onChange={setPeriod} />
        </div>
      }
    >
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Unidade</th>
              {COLUMNS.filter((c) => visible.includes(c.id)).map((c) => (
                <th key={c.id} className="px-4 py-3">
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => {
                      if (sortBy === c.id) setDesc((d) => !d);
                      else {
                        setSortBy(c.id);
                        setDesc(true);
                      }
                    }}
                  >
                    {c.label}
                    {sortBy === c.id && (desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isFetching && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                  Carregando métricas…
                </td>
              </tr>
            )}
            {!isFetching && rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhuma conta com dados no período. Cadastre os act_id em Configurações.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.act_id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                <td className="px-4 py-3 text-muted-foreground">
                  {i < 3 ? <Medal className="h-4 w-4 text-primary" /> : i + 1}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{r.unit_name}</p>
                  <p className="text-xs text-muted-foreground">{r.act_id}</p>
                </td>
                {COLUMNS.filter((c) => visible.includes(c.id)).map((c) => (
                  <td key={c.id} className="px-4 py-3">
                    {c.format(Number((r as never)[c.id] ?? 0))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
