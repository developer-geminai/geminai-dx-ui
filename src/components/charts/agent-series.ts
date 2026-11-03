import type { Agent } from "@/lib/types";
import { agentColorMap, labelFor } from "@/lib/analytics";
import type { Series } from "./charts";

/** One series per agent, coloured by the agent's stable slot in the whole organization. */
export function agentSeries(selected: Pick<Agent, "id" | "name">[], all: Pick<Agent, "id" | "name">[]): Series[] {
  const colors = agentColorMap(all);
  return selected.map((a) => ({ key: a.id, label: a.name, color: colors.get(a.id) ?? "rgb(var(--chart-other))" }));
}

/** Rows = business status, columns = agents. */
export function statusByAgentRows(agents: Agent[], labels: Map<string, string>): Record<string, string | number>[] {
  const statuses = new Map<string, number>();
  for (const a of agents) for (const [s, n] of Object.entries(a.statuses)) statuses.set(s, (statuses.get(s) ?? 0) + n);
  return [...statuses.entries()]
    .sort((x, y) => y[1] - x[1])
    .map(([status]) => {
      const row: Record<string, string | number> = { status: labelFor(status, labels) };
      for (const a of agents) row[a.id] = a.statuses[status] ?? 0;
      return row;
    });
}
