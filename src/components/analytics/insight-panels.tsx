import type { HistoricalEvaluation, Insights } from "@/lib/types";
import { humanize } from "@/lib/journey";
import { BarChartCard } from "@/components/charts/charts";
import { EmptyState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

/** Evidence-check dispositions: what the agent found when it compared reported information with sources. */
export function DispositionChart({ insights }: { insights: Insights }) {
  const rows = Object.entries(insights.dispositions)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => ({ outcome: humanize(k), checks: n }));
  if (!rows.length) return <EmptyState title="No evidence checks recorded" />;
  return (
    <BarChartCard
      rows={rows}
      categoryKey="outcome"
      categoryLabel="Check outcome"
      series={[{ key: "checks", label: "Checks", color: "rgb(var(--chart-1))" }]}
      layout="horizontal-bars"
      ariaLabel="Number of saved evidence checks per outcome"
    />
  );
}

export function QuestionStates({ insights }: { insights: Insights }) {
  const entries = Object.entries(insights.questions);
  if (!entries.length) return <p className="text-sm text-muted">No questions recorded.</p>;
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {entries.map(([k, n]) => (
        <div key={k} className="rounded-md border border-line p-3">
          <dt className="text-xs text-muted">{humanize(k)}</dt>
          <dd className="tabular mt-1 font-display text-2xl font-semibold">{n}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Frozen/offline evaluations are shown apart from live data and never presented as live accuracy. */
export function HistoricalEvaluations({ items }: { items: HistoricalEvaluation[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-3">
      {items.map((h) => (
        <div key={`${h.agent_id}-${h.label}`} className="rounded-md border border-dashed border-line p-4">
          <div className="flex flex-wrap items-center gap-2">
            <History className="size-4 text-muted" aria-hidden />
            <p className="font-medium">{h.label}</p>
            <Badge tone="neutral">{h.agent_name}</Badge>
            <Badge tone="attention">Historical — not live traffic</Badge>
          </div>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {h.cases !== undefined ? (
              <div className="flex gap-1.5">
                <dt className="text-muted">Cases</dt>
                <dd className="tabular font-semibold">{h.cases}</dd>
              </div>
            ) : null}
            {h.facts !== undefined ? (
              <div className="flex gap-1.5">
                <dt className="text-muted">Facts</dt>
                <dd className="tabular font-semibold">{h.facts}</dd>
              </div>
            ) : null}
            {h.comparable_values !== undefined ? (
              <div className="flex gap-1.5">
                <dt className="text-muted">Comparable values</dt>
                <dd className="tabular font-semibold">{h.comparable_values}</dd>
              </div>
            ) : null}
            <div className="flex gap-1.5">
              <dt className="text-muted">Global accuracy</dt>
              <dd className="font-semibold">{typeof h.global_accuracy === "number" ? `${Math.round(h.global_accuracy * 100)}%` : "Not established"}</dd>
            </div>
          </dl>
          {h.dispositions ? (
            <p className="mt-2 text-xs text-muted">
              {Object.entries(h.dispositions)
                .sort((a, b) => b[1] - a[1])
                .map(([k, n]) => `${humanize(k)}: ${n}`)
                .join(" · ")}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
