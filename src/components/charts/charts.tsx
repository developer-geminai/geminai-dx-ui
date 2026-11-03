"use client";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";
import { cn } from "@/lib/utils";

/**
 * Accessible bar charts.
 * - Colours come from validated CSS tokens (--chart-1..4, --chart-other), resolved at runtime so
 *   light/dark each use their own validated steps (SVG presentation attributes can't read var()).
 * - Every chart has a hover tooltip, a legend for >= 2 series, and a "table view" toggle.
 * - Text always uses ink tokens, never the series colour.
 */

export interface Series {
  key: string;
  label: string;
  /** CSS colour, e.g. "rgb(var(--chart-1))". */
  color: string;
}

function useResolvedColors(colors: string[]): string[] {
  const [resolved, setResolved] = useState<string[]>(colors.map(() => "#888"));
  const signature = colors.join("|");
  useEffect(() => {
    const read = () => {
      const style = getComputedStyle(document.documentElement);
      setResolved(
        signature.split("|").map((c) => {
          const m = /^rgb\(var\((--[a-z0-9-]+)\)\)$/.exec(c);
          return m ? `rgb(${style.getPropertyValue(m[1]!).trim().split(/\s+/).join(",")})` : c;
        }),
      );
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", read);
    return () => {
      obs.disconnect();
      mq.removeEventListener("change", read);
    };
  }, [signature]);
  return resolved;
}

function useInk() {
  const [ink, setInk] = useState({ muted: "#5e6568", line: "#e5e6e3", surface: "#fff" });
  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const v = (n: string) => `rgb(${s.getPropertyValue(n).trim().split(/\s+/).join(",")})`;
      setInk({ muted: v("--muted"), line: v("--line"), surface: v("--surface") });
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return ink;
}

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => Number(p.value) > 0);
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-card">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {(rows.length ? rows : payload).map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2 text-muted">
          <span className="inline-block size-2.5 rounded-[3px]" style={{ background: p.color }} aria-hidden />
          <span className="flex-1">{p.name}</span>
          <span className="tabular font-medium text-ink">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function Legend({ series, colors }: { series: Series[]; colors: string[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend">
      {series.map((s, i) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-[3px]" style={{ background: colors[i] }} aria-hidden />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function DataTable({ rows, categoryKey, categoryLabel, series }: { rows: Record<string, string | number>[]; categoryKey: string; categoryLabel: string; series: Series[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-muted">
          <tr className="border-b border-line">
            <th scope="col" className="py-2 pr-4 font-medium">
              {categoryLabel}
            </th>
            {series.map((s) => (
              <th key={s.key} scope="col" className="py-2 pr-4 text-right font-medium">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r[categoryKey])} className="border-b border-line/60">
              <th scope="row" className="py-1.5 pr-4 font-normal">
                {r[categoryKey]}
              </th>
              {series.map((s) => (
                <td key={s.key} className="tabular py-1.5 pr-4 text-right">
                  {r[s.key] ?? 0}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface BarChartCardProps {
  rows: Record<string, string | number>[];
  categoryKey: string;
  categoryLabel: string;
  series: Series[];
  layout?: "vertical-bars" | "horizontal-bars";
  stacked?: boolean;
  height?: number;
  ariaLabel: string;
  className?: string;
}

export function BarChartCard({ rows, categoryKey, categoryLabel, series, layout = "vertical-bars", stacked = true, height = 240, ariaLabel, className }: BarChartCardProps) {
  const [table, setTable] = useState(false);
  const colors = useResolvedColors(series.map((s) => s.color));
  const ink = useInk();
  const horizontal = layout === "horizontal-bars";
  const rowHeight = stacked || series.length === 1 ? 38 : series.length * 14 + 22;
  const computedHeight = horizontal ? Math.max(120, rows.length * rowHeight + 40) : height;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-2 flex justify-end">
        <button type="button" className="text-xs font-medium text-brand underline-offset-2 hover:underline" onClick={() => setTable((t) => !t)} aria-pressed={table}>
          {table ? "Show chart" : "Show table"}
        </button>
      </div>
      {table ? (
        <DataTable rows={rows} categoryKey={categoryKey} categoryLabel={categoryLabel} series={series} />
      ) : (
        <>
          <div role="img" aria-label={ariaLabel} style={{ height: computedHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 4, right: 12, bottom: 4, left: horizontal ? 8 : -12 }} barCategoryGap={horizontal ? 10 : "22%"}>
                <CartesianGrid stroke={ink.line} strokeDasharray="0" vertical={horizontal} horizontal={!horizontal} />
                {horizontal ? (
                  <>
                    <XAxis type="number" allowDecimals={false} tick={{ fill: ink.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey={categoryKey} width={150} tick={{ fill: ink.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                  </>
                ) : (
                  <>
                    <XAxis dataKey={categoryKey} tick={{ fill: ink.muted, fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
                    <YAxis allowDecimals={false} tick={{ fill: ink.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  </>
                )}
                <Tooltip content={<ChartTooltip />} cursor={{ fill: ink.line, opacity: 0.5 }} />
                {series.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    stackId={stacked ? "a" : undefined}
                    fill={colors[i]}
                    stroke={ink.surface}
                    strokeWidth={stacked && series.length > 1 ? 1 : 0}
                    radius={stacked && i !== series.length - 1 ? 0 : horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                    maxBarSize={horizontal ? (stacked ? 22 : 12) : 36}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Legend series={series} colors={colors} />
        </>
      )}
    </div>
  );
}
