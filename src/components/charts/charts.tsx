"use client";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n/client";

/**
 * Small chart kit. Colors come from the validated --chart-1..4 tokens (see globals.css), assigned
 * in fixed order and never cycled. Single axis only. ≥2 series → legend. Every chart has a
 * hover tooltip and a "table" view for accessibility.
 */
export const SERIES_COLORS = ["rgb(var(--chart-1))", "rgb(var(--chart-2))", "rgb(var(--chart-3))", "rgb(var(--chart-4))"];
const OTHER = "rgb(var(--chart-other))";

export interface SeriesDef {
  key: string;
  label: string;
}

const t = { es: { table: "Ver tabla", chart: "Ver gráfico" }, en: { table: "Show table", chart: "Show chart" } };

function Legend({ series }: { series: SeriesDef[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {series.map((s, i) => (
        <li key={s.key} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: SERIES_COLORS[i] ?? OTHER }} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function ChartTooltip({ active, payload, label, format, labelFormat }: { active?: boolean; payload?: { name: string; value: number; color: string; dataKey: string }[]; label?: string; format: (v: number) => string; labelFormat?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-card">
      <p className="mb-1 font-medium text-ink">{labelFormat && label ? labelFormat(label) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-muted">
          <span aria-hidden className="size-2 rounded-[2px]" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="tabular ml-auto pl-3 font-medium text-ink">{format(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

function TableView({ rows, xKey, series, format, labelFormat }: { rows: Record<string, number | string>[]; xKey: string; series: SeriesDef[]; format: (v: number) => string; labelFormat?: (l: string) => string }) {
  return (
    <div className="max-h-72 overflow-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th />
            {series.map((s) => (
              <th key={s.key} className="text-right">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r[xKey])}>
              <td>{labelFormat ? labelFormat(String(r[xKey])) : String(r[xKey])}</td>
              {series.map((s) => (
                <td key={s.key} className="tabular text-right">
                  {format(Number(r[s.key] ?? 0))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface BaseProps {
  rows: Record<string, number | string>[];
  xKey: string;
  series: SeriesDef[];
  height?: number;
  format?: (v: number) => string;
  labelFormat?: (l: string) => string;
  ariaLabel: string;
  className?: string;
}

function Frame({ children, table, className }: { children: React.ReactNode; table: React.ReactNode; className?: string }) {
  const lang = useLang();
  const [showTable, setShowTable] = useState(false);
  return (
    <div className={cn("relative", className)}>
      <div className="mb-1 flex justify-end">
        <button type="button" className="text-xs font-medium text-brand-ink hover:underline" onClick={() => setShowTable((v) => !v)}>
          {showTable ? t[lang].chart : t[lang].table}
        </button>
      </div>
      {showTable ? table : children}
    </div>
  );
}

const axisProps = { tick: { fontSize: 11, fill: "rgb(var(--muted))" }, tickLine: false, axisLine: false } as const;

export function BarTrend({ rows, xKey, series, height = 220, format = (v) => String(v), labelFormat, ariaLabel, stacked = true, className }: BaseProps & { stacked?: boolean }) {
  return (
    <Frame className={className} table={<TableView rows={rows} xKey={xKey} series={series} format={format} labelFormat={labelFormat} />}>
      <div role="img" aria-label={ariaLabel} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -12 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="rgb(var(--line))" />
            <XAxis dataKey={xKey} {...axisProps} tickFormatter={labelFormat} interval="preserveStartEnd" minTickGap={12} />
            <YAxis {...axisProps} width={44} tickFormatter={(v: number) => format(v)} />
            <Tooltip cursor={{ fill: "rgb(var(--paper-alt))" }} content={<ChartTooltip format={format} labelFormat={labelFormat} />} />
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId={stacked ? "a" : undefined}
                fill={SERIES_COLORS[i] ?? OTHER}
                stroke="rgb(var(--surface))"
                strokeWidth={stacked && series.length > 1 ? 1 : 0}
                radius={!stacked || i === series.length - 1 ? [4, 4, 0, 0] : 0}
                maxBarSize={28}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Legend series={series} />
    </Frame>
  );
}

export function LineTrend({ rows, xKey, series, height = 220, format = (v) => String(v), labelFormat, ariaLabel, className, domain }: BaseProps & { domain?: [number, number] }) {
  return (
    <Frame className={className} table={<TableView rows={rows} xKey={xKey} series={series} format={format} labelFormat={labelFormat} />}>
      <div role="img" aria-label={ariaLabel} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="rgb(var(--line))" />
            <XAxis dataKey={xKey} {...axisProps} tickFormatter={labelFormat} interval="preserveStartEnd" minTickGap={12} />
            <YAxis {...axisProps} width={44} tickFormatter={(v: number) => format(v)} domain={domain ?? ["auto", "auto"]} />
            <Tooltip cursor={{ stroke: "rgb(var(--muted))", strokeDasharray: "3 3" }} content={<ChartTooltip format={format} labelFormat={labelFormat} />} />
            {series.map((s, i) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={SERIES_COLORS[i] ?? OTHER} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "rgb(var(--surface))" }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Legend series={series} />
    </Frame>
  );
}

export { HBars } from "./hbars";
