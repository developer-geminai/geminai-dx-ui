"use client";
import { BarTrend, HBars, LineTrend } from "@/components/charts/charts";
import { useLang } from "@/lib/i18n/client";
import { fmt } from "@/lib/format";

/** Client wrappers: formatters are functions, so they are built here, not passed from the server. */

export function DailyTeamChart({ rows, teams, ariaLabel }: { rows: Record<string, number | string>[]; teams: string[]; ariaLabel: string }) {
  const f = fmt(useLang());
  return <BarTrend rows={rows} xKey="date" series={teams.map((t) => ({ key: t, label: t }))} format={(v) => f.hours(v)} labelFormat={(l) => f.date(l)} ariaLabel={ariaLabel} height={240} />;
}

export function HoursBars({ items, rate }: { items: { label: string; value: number }[]; rate: number | null }) {
  const lang = useLang();
  const f = fmt(lang);
  const yr = lang === "es" ? "/año" : "/yr";
  const wk = lang === "es" ? "/sem" : "/wk";
  return <HBars items={items.map((i) => ({ ...i, hint: rate ? `${f.eur(i.value * 52 * rate)}${yr}` : undefined }))} format={(v) => `${f.hm(v)}${wk}`} />;
}

export function ShareBars({ items }: { items: { label: string; value: number }[] }) {
  return <HBars items={items} format={(v) => `${v} %`} />;
}

export function SingleTrend({ rows, valueKey, label, unit }: { rows: Record<string, number | string>[]; valueKey: string; label: string; unit: "hours" | "count" }) {
  const f = fmt(useLang());
  return (
    <LineTrend
      rows={rows}
      xKey="date"
      series={[{ key: valueKey, label }]}
      format={(v) => (unit === "hours" ? f.hours(v) : f.number(v))}
      labelFormat={(l) => f.date(l)}
      ariaLabel={label}
      height={180}
    />
  );
}
