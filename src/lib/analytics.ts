import type { Agent, CaseSummary } from "./types";
import { humanize } from "./journey";
import { toDate, formatDay } from "./format";

/** Categorical series slots, in fixed order. Colour follows the entity (agent id), never its rank. */
export const SERIES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"] as const;
export const SERIES_OTHER = "var(--chart-other)";
export const rgb = (v: string) => `rgb(${v})`;

/** Stable colour per agent: based on the agent's alphabetical position in the full org list. */
export function agentColorMap(allAgents: Pick<Agent, "id" | "name">[]): Map<string, string> {
  const sorted = [...allAgents].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const map = new Map<string, string>();
  sorted.forEach((a, i) => map.set(a.id, rgb(SERIES[i] ?? SERIES_OTHER)));
  return map;
}

/** status → business label, learnt from labels the backend attached to cases; falls back to humanised key. */
export function statusLabels(cases: CaseSummary[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of cases) if (c.status && c.status_label) map.set(c.status, c.status_label);
  return map;
}

export function labelFor(status: string, labels: Map<string, string>): string {
  return labels.get(status) ?? humanize(status);
}

export interface AgentComparisonRow {
  id: string;
  name: string;
  category: string;
  cases: number;
  questionsOpen: number;
  needsReview: number;
  /** Share of cases currently flagged for attention/error, 0–1, or null without cases. */
  reviewShare: number | null;
}

export function agentComparison(agents: Agent[]): AgentComparisonRow[] {
  return agents.map((a) => ({
    id: a.id,
    name: a.name,
    category: a.category ?? "Uncategorised",
    cases: a.counts.cases,
    questionsOpen: a.counts.questions_open,
    needsReview: a.counts.needs_review,
    reviewShare: a.counts.cases ? a.counts.needs_review / a.counts.cases : null,
  }));
}

export type WindowKey = "7d" | "30d" | "90d" | "all";
export const WINDOWS: { key: WindowKey; label: string; days: number | null }[] = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
  { key: "all", label: "All scanned", days: null },
];

export function parseWindow(value: string | undefined): WindowKey {
  return WINDOWS.some((w) => w.key === value) ? (value as WindowKey) : "30d";
}

export function filterByWindow(cases: CaseSummary[], window: WindowKey, now = new Date()): CaseSummary[] {
  const days = WINDOWS.find((w) => w.key === window)?.days;
  if (!days) return cases;
  const cutoff = now.getTime() - days * 86400_000;
  return cases.filter((c) => (toDate(c.updated_at)?.getTime() ?? 0) >= cutoff);
}

/** Cases by last-update day and agent. Rows are days (oldest→newest), keys are agent ids. */
export function activityByDay(cases: CaseSummary[], days: number, now = new Date()): { day: string; total: number; [agent: string]: number | string }[] {
  const out: { day: string; total: number; [agent: string]: number | string }[] = [];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const index = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    index.set(d.toDateString(), i);
    out.push({ day: formatDay(d), total: 0 });
  }
  for (const c of cases) {
    const d = toDate(c.updated_at);
    if (!d) continue;
    const i = index.get(d.toDateString());
    if (i === undefined) continue;
    const row = out[i]!;
    row[c.agent_id] = ((row[c.agent_id] as number | undefined) ?? 0) + 1;
    row.total += 1;
  }
  return out;
}

export function effectsBreakdown(cases: CaseSummary[]): { key: "executed" | "not_executed" | "unknown"; label: string; count: number }[] {
  const counts = { executed: 0, not_executed: 0, unknown: 0 };
  for (const c of cases) {
    if (c.effects_executed === true) counts.executed++;
    else if (c.effects_executed === false) counts.not_executed++;
    else counts.unknown++;
  }
  return [
    { key: "not_executed", label: "No business change made", count: counts.not_executed },
    { key: "executed", label: "Change executed (evidence recorded)", count: counts.executed },
    { key: "unknown", label: "Effect not verified", count: counts.unknown },
  ];
}

export function countBy<T>(items: T[], key: (t: T) => string): { key: string; count: number }[] {
  const m = new Map<string, number>();
  for (const it of items) m.set(key(it), (m.get(key(it)) ?? 0) + 1);
  return [...m.entries()].map(([k, count]) => ({ key: k, count })).sort((a, b) => b.count - a.count);
}
