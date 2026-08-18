export type Period = { since: string; until: string; label: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function presetPeriod(preset: string): Period {
  const now = new Date();
  const start = new Date(now);
  switch (preset) {
    case "hoje":
      return { since: iso(now), until: iso(now), label: "Hoje" };
    case "ontem": {
      start.setDate(now.getDate() - 1);
      return { since: iso(start), until: iso(start), label: "Ontem" };
    }
    case "7d":
      start.setDate(now.getDate() - 6);
      return { since: iso(start), until: iso(now), label: "Últimos 7 dias" };
    case "14d":
      start.setDate(now.getDate() - 13);
      return { since: iso(start), until: iso(now), label: "Últimos 14 dias" };
    case "90d":
      start.setDate(now.getDate() - 89);
      return { since: iso(start), until: iso(now), label: "Últimos 90 dias" };
    case "mes_atual":
      return { since: iso(new Date(now.getFullYear(), now.getMonth(), 1)), until: iso(now), label: "Mês atual" };
    case "mes_passado": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { since: iso(s), until: iso(e), label: "Mês passado" };
    }
    case "ano_atual":
      return { since: iso(new Date(now.getFullYear(), 0, 1)), until: iso(now), label: "Ano atual" };
    default: {
      start.setDate(now.getDate() - 29);
      return { since: iso(start), until: iso(now), label: "Últimos 30 dias" };
    }
  }
}

export function monthPeriod(year: number, month: number): Period {
  const s = new Date(year, month, 1);
  const e = new Date(year, month + 1, 0);
  const label = s.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return { since: iso(s), until: iso(e), label: label.charAt(0).toUpperCase() + label.slice(1) };
}

export function yearPeriod(year: number): Period {
  return { since: `${year}-01-01`, until: `${year}-12-31`, label: String(year) };
}

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
export const num = (n: number, d = 0) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
