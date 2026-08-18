import { useState } from "react";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { monthPeriod, presetPeriod, yearPeriod, type Period } from "@/lib/period";

const PRESETS = [
  ["hoje", "Hoje"],
  ["ontem", "Ontem"],
  ["7d", "Últimos 7 dias"],
  ["14d", "Últimos 14 dias"],
  ["30d", "Últimos 30 dias"],
  ["90d", "Últimos 90 dias"],
  ["mes_atual", "Mês atual"],
  ["mes_passado", "Mês passado"],
  ["ano_atual", "Ano atual"],
] as const;

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function PeriodPicker({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  const now = new Date();
  const [since, setSince] = useState(period.since);
  const [until, setUntil] = useState(period.until);
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CalendarRange className="h-4 w-4" />
          <span className="max-w-[180px] truncate">{period.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map(([id, label]) => (
            <Button key={id} variant="secondary" size="sm" onClick={() => onChange(presetPeriod(id))}>
              {label}
            </Button>
          ))}
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Por mês</Label>
          <div className="flex gap-2">
            <Select onValueChange={(v) => onChange(monthPeriod(now.getFullYear(), Number(v)))}>
              <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={(v) => onChange(yearPeriod(Number(v)))}>
              <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Personalizado</Label>
          <div className="flex items-center gap-2">
            <Input type="date" value={since} onChange={(e) => setSince(e.target.value)} />
            <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </div>
          <Button
            className="w-full"
            size="sm"
            onClick={() =>
              onChange({
                since,
                until,
                label: `${since.split("-").reverse().join("/")} – ${until.split("-").reverse().join("/")}`,
              })
            }
          >
            Aplicar período
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
