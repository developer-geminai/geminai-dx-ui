"use client";
import { BarTrend, LineTrend } from "@/components/charts/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/i18n/client";
import { fmt } from "@/lib/format";
import type { AgentPerformance } from "@/lib/api/types";
import { agentsMsg } from "./messages";

/** Separate single-axis charts (never dual axis): runs, % without intervention, hours, avg time. */
export function PerformanceCharts({ weekly, showHours }: { weekly: AgentPerformance["weekly"]; showHours: boolean }) {
  const lang = useLang();
  const m = agentsMsg[lang].perf;
  const f = fmt(lang);
  const rows = weekly.map((w) => ({ week: w.weekStart, runs: w.runs, rate: Math.round(w.noInterventionRate * 1000) / 10, hours: w.hoursSaved, avg: w.avgDurationSec }));
  const label = (l: string) => f.date(l);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle as="h3">{m.runsWeek}</CardTitle>
        </CardHeader>
        <CardContent>
          <BarTrend rows={rows} xKey="week" series={[{ key: "runs", label: m.runsWeek }]} format={(v) => f.number(v)} labelFormat={label} ariaLabel={m.runsWeek} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle as="h3">{m.noInterventionWeek}</CardTitle>
        </CardHeader>
        <CardContent>
          <LineTrend rows={rows} xKey="week" series={[{ key: "rate", label: m.noInterventionWeek }]} format={(v) => `${f.decimal(v)} %`} labelFormat={label} ariaLabel={m.noInterventionWeek} domain={[0, 100]} />
        </CardContent>
      </Card>
      {showHours ? (
        <Card>
          <CardHeader>
            <CardTitle as="h3">{m.hoursWeek}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarTrend rows={rows} xKey="week" series={[{ key: "hours", label: m.hoursWeek }]} format={(v) => f.hours(v)} labelFormat={label} ariaLabel={m.hoursWeek} />
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle as="h3">{m.avgTime}</CardTitle>
        </CardHeader>
        <CardContent>
          <LineTrend rows={rows} xKey="week" series={[{ key: "avg", label: m.avgTime }]} format={(v) => f.duration(v)} labelFormat={label} ariaLabel={m.avgTime} />
        </CardContent>
      </Card>
    </div>
  );
}
