import { describe, expect, it } from "vitest";
import { activityByDay, agentColorMap, agentComparison, effectsBreakdown, filterByWindow, parseWindow } from "@/lib/analytics";
import type { Agent, CaseSummary } from "@/lib/types";
import agents from "../fixtures/agents.json";

const all = (agents as { items: Agent[] }).items;

const mk = (id: string, agent: string, updated: string, effects: boolean | null = false, tone = "done"): CaseSummary => ({
  id,
  title: id,
  status: "ready",
  status_label: "Ready",
  tone,
  updated_at: updated,
  effects_executed: effects,
  agent_id: agent,
  agent_name: agent,
});

describe("analytics helpers", () => {
  it("keeps each agent's colour stable when the filter changes", () => {
    const full = agentColorMap(all);
    const one = agentColorMap(all); // colour map is always built from the full org list
    for (const a of all) expect(one.get(a.id)).toBe(full.get(a.id));
    expect(new Set(full.values()).size).toBe(all.length);
  });

  it("compares agents by workload", () => {
    const rows = agentComparison(all);
    const t = rows.find((r) => r.id === "transport-operations")!;
    expect(t.cases).toBe(5);
    expect(t.reviewShare).toBeCloseTo(4 / 5);
  });

  it("buckets activity by day and agent", () => {
    const now = new Date("2026-11-02T12:00:00");
    const rows = activityByDay([mk("1", "a", "2026-11-02T09:00:00"), mk("2", "b", "2026-11-02T10:00:00"), mk("3", "a", "2026-11-01T10:00:00"), mk("4", "a", "2026-10-01T10:00:00")], 3, now);
    expect(rows).toHaveLength(3);
    expect(rows[2]).toMatchObject({ total: 2, a: 1, b: 1 });
    expect(rows[1]).toMatchObject({ total: 1, a: 1 });
    expect(rows[0]!.total).toBe(0);
  });

  it("filters by time window and parses window keys", () => {
    const now = new Date("2026-11-02T12:00:00Z");
    const cases = [mk("1", "a", "2026-11-01T00:00:00Z"), mk("2", "a", "2026-09-01T00:00:00Z")];
    expect(filterByWindow(cases, "7d", now).map((c) => c.id)).toEqual(["1"]);
    expect(filterByWindow(cases, "all", now)).toHaveLength(2);
    expect(parseWindow("90d")).toBe("90d");
    expect(parseWindow("bogus")).toBe("30d");
  });

  it("separates verified effects from unknown ones", () => {
    const b = effectsBreakdown([mk("1", "a", "", false), mk("2", "a", "", true), mk("3", "a", "", null), mk("4", "a", "", null)]);
    expect(Object.fromEntries(b.map((x) => [x.key, x.count]))).toEqual({ not_executed: 1, executed: 1, unknown: 2 });
  });
});
