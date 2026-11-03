"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { Agent } from "@/lib/types";
import { AgentCard, SOURCE_LABELS } from "./agent-card";
import { Input, Select, Label } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { orgPath } from "@/lib/utils";
import { percent } from "@/lib/format";

type SortKey = "name" | "cases" | "questions" | "review";

export function filterAgents(agents: Agent[], q: string, category: string, source: string, attentionOnly: boolean): Agent[] {
  const term = q.trim().toLowerCase();
  return agents.filter(
    (a) =>
      (!term || [a.name, a.purpose, a.category ?? "", a.id].some((v) => v.toLowerCase().includes(term))) &&
      (category === "all" || (a.category ?? "Uncategorised") === category) &&
      (source === "all" || a.source === source) &&
      (!attentionOnly || a.counts.questions_open > 0 || a.counts.needs_review > 0),
  );
}

export function AgentsExplorer({ org, agents }: { org: string; agents: Agent[] }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [source, setSource] = useState("all");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("name");

  const categories = useMemo(() => [...new Set(agents.map((a) => a.category ?? "Uncategorised"))].sort(), [agents]);
  const sources = useMemo(() => [...new Set(agents.map((a) => a.source).filter(Boolean) as string[])].sort(), [agents]);
  const visible = useMemo(() => {
    const list = filterAgents(agents, q, category, source, attentionOnly);
    const by: Record<SortKey, (a: Agent, b: Agent) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      cases: (a, b) => b.counts.cases - a.counts.cases,
      questions: (a, b) => b.counts.questions_open - a.counts.questions_open,
      review: (a, b) => b.counts.needs_review / (b.counts.cases || 1) - a.counts.needs_review / (a.counts.cases || 1),
    };
    return [...list].sort(by[sort]);
  }, [agents, q, category, source, attentionOnly, sort]);

  return (
    <div>
      <div className="mb-4 grid gap-3 rounded-lg border border-line bg-surface p-4 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] md:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-search">Search agents</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted" aria-hidden />
            <Input id="agent-search" className="pl-8" placeholder="Name, purpose or category" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-category">Category</Label>
          <Select id="agent-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-source">Data source</Label>
          <Select id="agent-source" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s] ?? s}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-sort">Sort by</Label>
          <Select id="agent-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="name">Name</option>
            <option value="cases">Most cases</option>
            <option value="questions">Most open questions</option>
            <option value="review">Highest review share</option>
          </Select>
        </div>
        <label className="flex h-9 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[rgb(var(--brand))]" checked={attentionOnly} onChange={(e) => setAttentionOnly(e.target.checked)} />
          Needs attention
        </label>
      </div>

      <p className="mb-3 text-sm text-muted" aria-live="polite">
        Showing {visible.length} of {agents.length} agents
      </p>

      {visible.length ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {visible.map((a) => (
              <AgentCard key={a.id} org={org} agent={a} />
            ))}
          </div>
          <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="px-4 pt-4 text-left font-display text-lg font-semibold">Performance comparison</caption>
              <thead className="text-xs text-muted">
                <tr className="border-b border-line">
                  <th scope="col" className="px-4 py-2 font-medium">Agent</th>
                  <th scope="col" className="px-4 py-2 font-medium">Category</th>
                  <th scope="col" className="px-4 py-2 font-medium">Source</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Cases</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Open questions</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Needs review</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Review share</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id} className="border-b border-line/60 last:border-0">
                    <th scope="row" className="px-4 py-2 font-medium">
                      <Link className="hover:text-brand hover:underline" href={orgPath(org, "agents", a.id)}>
                        {a.name}
                      </Link>
                    </th>
                    <td className="px-4 py-2 text-muted">{a.category ?? "—"}</td>
                    <td className="px-4 py-2 text-muted">{a.source ? SOURCE_LABELS[a.source] ?? a.source : "—"}</td>
                    <td className="tabular px-4 py-2 text-right">{a.counts.cases}</td>
                    <td className="tabular px-4 py-2 text-right">{a.counts.questions_open}</td>
                    <td className="tabular px-4 py-2 text-right">{a.counts.needs_review}</td>
                    <td className="tabular px-4 py-2 text-right">{percent(a.counts.needs_review, a.counts.cases)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 pb-4 pt-2 text-xs text-muted">Review share = cases currently flagged for attention ÷ current cases. It describes workload, not accuracy.</p>
          </div>
        </>
      ) : (
        <EmptyState title="No agents match these filters" />
      )}
    </div>
  );
}
