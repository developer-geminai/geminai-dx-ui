import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleHelp, PauseCircle } from "lucide-react";
import { sectionGate } from "@/components/locked-section";
import { ModeBadge } from "@/components/status-badges";
import { PauseAgentButton } from "@/components/agents/pause-button";
import { RulesList } from "@/components/agents/rules-list";
import { PerformanceTab, RunsTab, ShadowTab, SummaryTab } from "@/components/agents/agent-tabs";
import { agentsMsg } from "@/components/agents/messages";
import { api } from "@/lib/api";
import type { FeatureKey, RunStatus } from "@/lib/api/types";
import { requireOrg } from "@/lib/server/session";
import { can } from "@/lib/permissions";
import { common } from "@/lib/i18n/common";
import { fmt } from "@/lib/format";
import { cn, first, orgPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Agente" };

const TABS = ["resumen", "ejecuciones", "shadow", "aprendido", "rendimiento"] as const;
type Tab = (typeof TABS)[number];
const TAB_FLAG: Record<Tab, FeatureKey> = {
  resumen: "agents.summary",
  ejecuciones: "agents.runs",
  shadow: "agents.shadow",
  aprendido: "agents.learned",
  rendimiento: "agents.performance",
};
const RUN_STATUSES: RunStatus[] = ["completed", "escalated", "failed", "running", "awaiting_approval"];

export default async function AgentPage({ params, searchParams }: { params: Promise<{ org: string; agentId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await params;
  const ctx = await requireOrg(decodeURIComponent(p.org));
  const gate = sectionGate(ctx, "agents");
  if (gate) return gate;
  const sp = await searchParams;
  const orgId = ctx.org.id;
  const agentId = decodeURIComponent(p.agentId);
  const agent = await api().getAgent(orgId, agentId);
  if (!agent) notFound();

  const m = agentsMsg[ctx.lang];
  const c = common[ctx.lang];
  const f = fmt(ctx.lang);
  const tabs = TABS.filter((t) => ctx.flags[TAB_FLAG[t]]);
  const requested = first(sp.tab) as Tab | undefined;
  // A run link (?run=) without tab opens the runs tab.
  const tab: Tab | undefined = requested && tabs.includes(requested) ? requested : first(sp.run) && tabs.includes("ejecuciones") ? "ejecuciones" : tabs[0];
  const base = orgPath(orgId, "agents", agent.id);
  const canPause = can(ctx.role, ctx.staff, "agents.pause") && ctx.flags["agents.pause"];

  let body: React.ReactNode = null;
  if (tab === "resumen") {
    const opps = agent.opportunityId ? await api().listOpportunities(orgId) : [];
    body = <SummaryTab agent={agent} lang={ctx.lang} orgId={orgId} opportunity={opps.find((o) => o.id === agent.opportunityId)} />;
  } else if (tab === "ejecuciones") {
    const statusParam = first(sp.status) as RunStatus | undefined;
    const status = statusParam && RUN_STATUSES.includes(statusParam) ? statusParam : undefined;
    const runId = first(sp.run);
    const [allRuns, selected] = await Promise.all([api().listRuns(orgId, { agentId: agent.id, status, limit: 1000 }), runId ? api().getRun(orgId, runId) : Promise.resolve(null)]);
    body = <RunsTab orgId={orgId} agent={agent} runs={allRuns.slice(0, 50)} total={allRuns.length} status={status} selected={selected && selected.agentId === agent.id ? selected : null} lang={ctx.lang} />;
  } else if (tab === "shadow") {
    const report = await api().getShadowReport(orgId, agent.id);
    body = <ShadowTab orgId={orgId} agent={agent} report={report} canPromote={can(ctx.role, ctx.staff, "agents.promote")} lang={ctx.lang} />;
  } else if (tab === "aprendido") {
    const rules = await api().listRules(orgId, agent.id);
    body = <RulesList orgId={orgId} rules={rules} canEdit={can(ctx.role, ctx.staff, "rules.edit")} />;
  } else if (tab === "rendimiento") {
    const perf = await api().getPerformance(orgId, agent.id);
    body = <PerformanceTab agent={agent} perf={perf} hourlyRate={ctx.org.hourlyRate} lang={ctx.lang} />;
  }

  return (
    <div>
      <Link href={orgPath(orgId, "agents")} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        {m.back}
      </Link>

      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-2">{agent.area}</p>
          <h1 className="font-display text-[1.9rem] font-medium leading-tight tracking-[-0.015em] md:text-[2.25rem]">{agent.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
            <ModeBadge mode={agent.mode} />
            <span>
              {m.version} <span className="font-mono text-ink">{agent.version}</span>
            </span>
            <span>
              {m.owner}: <span className="text-ink">{agent.owner}</span>
            </span>
            {agent.stats.pendingQuestions > 0 ? (
              <Link href={`${orgPath(orgId, "questions")}?agent=${agent.id}`} className="inline-flex items-center gap-1 rounded-full bg-signal-soft px-2 py-0.5 text-xs font-semibold text-signal-ink">
                <CircleHelp className="size-3.5" aria-hidden />
                {agent.stats.pendingQuestions} {c.nav.questions.toLowerCase()}
              </Link>
            ) : null}
          </div>
        </div>
        {ctx.flags["agents.pause"] ? (
          <div className="flex flex-col items-end gap-1">
            <PauseAgentButton orgId={orgId} agentId={agent.id} agentName={agent.name} paused={agent.mode === "paused"} disabled={!canPause} />
            {!canPause ? <span className="text-xs text-muted">{m.noPermissionPause}</span> : null}
          </div>
        ) : null}
      </header>

      {agent.mode === "paused" && agent.pause ? (
        <div role="status" className="mb-5 flex items-start gap-3 rounded-md border border-ink/15 bg-ink/5 px-4 py-3">
          <PauseCircle className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold text-ink">{m.pausedBanner(agent.pause.by, f.dateTime(agent.pause.at))}</p>
            <p className="text-ink-2">
              {m.pausedReason}: {agent.pause.reason}
            </p>
          </div>
        </div>
      ) : null}

      {tabs.length > 0 ? (
        <nav aria-label="Tabs" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
          {tabs.map((t) => (
            <Link
              key={t}
              href={`${base}?tab=${t}`}
              aria-current={t === tab ? "page" : undefined}
              className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors", t === tab ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink")}
            >
              {m.tabs[t]}
            </Link>
          ))}
        </nav>
      ) : null}

      {body}
    </div>
  );
}
