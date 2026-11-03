import Link from "next/link";
import { ArrowRight, Check, CircleHelp, Clock, Database, Eye, Pencil, RotateCcw, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/states";
import { Kpi } from "@/components/kpi";
import { RunStatusBadge } from "@/components/status-badges";
import type { Agent, AgentPerformance, Opportunity, Run, RunDetail, RunStatus, ShadowReport } from "@/lib/api/types";
import type { Lang } from "@/lib/i18n";
import { common } from "@/lib/i18n/common";
import { fmt } from "@/lib/format";
import { cn, orgPath, withParams } from "@/lib/utils";
import { agentsMsg } from "./messages";
import { PromoteButton } from "./promote-button";
import { PerformanceCharts } from "./performance-charts";

/* ───────── Resumen ───────── */

export function FlowSteps({ flow }: { flow: Agent["flow"] }) {
  return (
    <ol className="flex flex-col gap-2 md:flex-row md:items-stretch md:gap-0">
      {flow.map((s, i) => (
        <li key={s.id} className="flex items-center md:flex-1">
          <div className="flex w-full items-center gap-3 rounded-md border border-brand-line bg-brand-soft/60 px-3 py-2.5 md:flex-col md:items-start md:gap-1">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-on">{i + 1}</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{s.label}</span>
              <span className="block font-mono text-[0.68rem] uppercase tracking-eyebrow text-muted">{s.system}</span>
            </span>
          </div>
          {i < flow.length - 1 ? <ArrowRight className="mx-2 hidden size-4 shrink-0 text-brand-ink md:block" aria-hidden /> : null}
        </li>
      ))}
    </ol>
  );
}

export function SummaryTab({ agent, lang, opportunity, orgId }: { agent: Agent; lang: Lang; opportunity?: Opportunity; orgId: string }) {
  const m = agentsMsg[lang].summary;
  const f = fmt(lang);
  const inSandbox = agent.mode === "building" || agent.mode === "testing";
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-3">
        <CardHeader>
          <p className="label-mono">{m.whatItDoes}</p>
          <p className="font-display text-xl leading-snug text-ink">{agent.summary}</p>
          {opportunity ? (
            <p className="text-xs text-muted">
              {m.opportunity}:{" "}
              <Link href={`${orgPath(orgId, "diagnostic")}?tab=results`} className="font-medium text-brand-ink hover:underline">
                {opportunity.workflow}
              </Link>
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          <p className="label-mono mb-3">{m.flow}</p>
          <FlowSteps flow={agent.flow} />
        </CardContent>
      </Card>

      {inSandbox ? (
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle as="h3">{m.sandbox}</CardTitle>
            <CardDescription>{m.sandboxNote}</CardDescription>
          </CardHeader>
          <CardContent>
            {agent.testing ? (
              <div className="max-w-md">
                <p className="mb-2 text-sm font-medium text-ink">{m.scenarios(agent.testing.scenariosPassed, agent.testing.scenariosTotal)}</p>
                <Progress value={agent.testing.scenariosPassed} max={agent.testing.scenariosTotal} label={m.sandbox} />
                <p className="mt-2 text-xs text-muted">
                  {m.lastTest}: {f.dateTime(agent.testing.lastRunAt)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">{m.building}</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle as="h3">{m.systems}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {agent.systems.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-ink">
                  <Database className="size-4 text-muted" aria-hidden />
                  {s.name}
                </span>
                <Badge tone={s.access === "read" ? "neutral" : "outline"}>
                  {s.access === "read" ? <Eye aria-hidden /> : <Pencil aria-hidden />}
                  {s.access === "read" ? m.read : m.readWrite}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h3">{m.permissions}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="label-mono mb-2">{m.granted}</p>
            <ul className="flex flex-col gap-1.5 text-sm">
              {agent.permissions.granted.map((p) => (
                <li key={p} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden />
                  {p}
                </li>
              ))}
              {agent.permissions.granted.length === 0 ? <li className="text-muted">—</li> : null}
            </ul>
          </div>
          <div>
            <p className="label-mono mb-2">{m.denied}</p>
            <ul className="flex flex-col gap-1.5 text-sm">
              {agent.permissions.denied.map((p) => (
                <li key={p} className="flex gap-2 text-ink-2">
                  <X className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
                  {p}
                </li>
              ))}
              {agent.permissions.denied.length === 0 ? <li className="text-muted">—</li> : null}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h3">{m.schedule}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-2 text-sm text-ink">
            <Clock className="size-4 text-muted" aria-hidden />
            {agent.schedule}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── Ejecuciones ───────── */

const RUN_FILTERS: RunStatus[] = ["completed", "escalated", "awaiting_approval", "failed", "running"];

export function RunsTab({ orgId, agent, runs, total, status, selected, lang }: { orgId: string; agent: Agent; runs: Run[]; total: number; status?: RunStatus; selected: RunDetail | null; lang: Lang }) {
  const m = agentsMsg[lang].runs;
  const c = common[lang];
  const f = fmt(lang);
  const base = orgPath(orgId, "agents", agent.id);
  const href = (p: Record<string, string | undefined>) => withParams(base, { tab: "ejecuciones", ...p });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label={m.filterStatus}>
          {[undefined, ...RUN_FILTERS].map((s) => (
            <Link
              key={s ?? "all"}
              href={href({ status: s })}
              aria-current={status === s ? "true" : undefined}
              className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", status === s ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink-2 hover:border-muted")}
            >
              {s ? c.run[s] : m.all}
            </Link>
          ))}
        </div>
        {runs.length === 0 ? (
          <EmptyState title={m.none} />
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {runs.map((r) => {
                const active = selected?.id === r.id;
                return (
                  <li key={r.id}>
                    <Link href={href({ status, run: r.id })} scroll={false} aria-current={active ? "true" : undefined} className={cn("flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-paper", active && "bg-brand-soft/60")}>
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0 text-sm font-medium text-ink">{r.summary}</span>
                        <RunStatusBadge status={r.status} className="shrink-0" />
                      </span>
                      <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                        <span className="font-mono">#{r.id.slice(1)}</span>
                        <span>{f.dateTime(r.startedAt)}</span>
                        <span>{f.duration(r.durationSec)}</span>
                        <span>{r.trigger}</span>
                        {r.retries > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <RotateCcw className="size-3" aria-hidden />
                            {m.retried(r.retries)}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-line px-4 py-2 text-xs text-muted">{m.showing(runs.length, total)}</p>
          </Card>
        )}
      </div>
      <div className="lg:sticky lg:top-20 lg:self-start">{selected ? <RunTimeline orgId={orgId} run={selected} lang={lang} closeHref={href({ status })} /> : <EmptyState title={m.select} className="h-full" />}</div>
    </div>
  );
}

export function RunTimeline({ orgId, run, lang, closeHref }: { orgId: string; run: RunDetail; lang: Lang; closeHref: string }) {
  const m = agentsMsg[lang].runs;
  const f = fmt(lang);
  const dot: Record<string, string> = { ok: "bg-brand", escalated: "bg-signal", failed: "bg-danger", running: "bg-[rgb(var(--chart-2))]", skipped: "bg-line" };
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-mono">
            {m.detail} #{run.id.slice(1)} · {m.version} {run.agentVersion}
          </p>
          <CardTitle as="h3" className="mt-1">
            {run.summary}
          </CardTitle>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            <RunStatusBadge status={run.status} />
            <span>{f.dateTime(run.startedAt)}</span>
            <span>· {f.duration(run.durationSec)}</span>
            <span>· {run.trigger}</span>
          </div>
        </div>
        <Link href={closeHref} scroll={false} className="rounded-sm p-1 text-muted hover:bg-paper-alt hover:text-ink" aria-label={m.close}>
          <X className="size-4" aria-hidden />
        </Link>
      </CardHeader>
      <CardContent>
        <p className="label-mono mb-3">{m.timeline}</p>
        <ol className="relative flex flex-col gap-5 border-l border-line pl-5">
          {run.steps.map((s) => (
            <li key={s.id} className="relative">
              <span aria-hidden className={cn("absolute -left-[26px] top-1 size-3 rounded-full ring-4 ring-surface", dot[s.status])} />
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-sm font-semibold text-ink">{s.action}</p>
                <p className="tabular text-xs text-muted">
                  {f.time(s.at)} · {f.duration(s.durationSec)}
                </p>
              </div>
              <p className="font-mono text-[0.68rem] uppercase tracking-eyebrow text-muted">{s.system}</p>
              <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                <dt className="text-muted">{m.decision}</dt>
                <dd className={cn("font-medium", s.status === "escalated" ? "text-signal-ink" : s.status === "failed" ? "text-danger" : "text-ink")}>{s.decision}</dd>
                {s.reason ? (
                  <>
                    <dt className="text-muted">{m.reason}</dt>
                    <dd className="text-ink-2">{s.reason}</dd>
                  </>
                ) : null}
              </dl>
              {s.data.length ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {s.data.map((d) => (
                    <li key={d.label} className="rounded-sm border border-line bg-paper px-2 py-0.5 text-xs">
                      <span className="text-muted">{d.label}:</span> <span className="font-mono text-ink">{d.value}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {s.retries > 0 ? (
                <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted">
                  <RotateCcw className="size-3" aria-hidden />
                  {m.retried(s.retries)}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-muted">{m.maskedNote}</p>
        {run.questionId ? (
          <Link href={`${orgPath(orgId, "questions")}?q=${encodeURIComponent(run.questionId)}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-ink hover:underline">
            <CircleHelp className="size-4" aria-hidden />
            {m.relatedQuestion}
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ───────── Shadow ───────── */

export function ShadowTab({ orgId, agent, report, canPromote, lang }: { orgId: string; agent: Agent; report: ShadowReport | null; canPromote: boolean; lang: Lang }) {
  const m = agentsMsg[lang].shadow;
  const f = fmt(lang);
  if (!report) return <EmptyState title={m.noReport} />;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Kpi label={m.match} value={f.percent(report.matchRate)} hint={m.over(report.sampleSize)} />
        <Card className="p-5 md:col-span-2">
          <p className="label-mono">{m.criterion}</p>
          <p className="mt-2 text-sm text-ink">{m.criterionText(f.percent(report.criterion.minMatchRate), report.criterion.minRuns)}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 flex justify-between text-xs text-muted">
                <span>{m.match}</span>
                <span className="tabular">
                  {f.percent(report.matchRate)} / {f.percent(report.criterion.minMatchRate)}
                </span>
              </p>
              <Progress value={Math.min(report.matchRate, report.criterion.minMatchRate)} max={report.criterion.minMatchRate} label={m.match} />
            </div>
            <div>
              <p className="mb-1 flex justify-between text-xs text-muted">
                <span>{m.runsProgress(report.sampleSize, report.criterion.minRuns)}</span>
              </p>
              <Progress value={Math.min(report.sampleSize, report.criterion.minRuns)} max={report.criterion.minRuns} label={m.runsProgress(report.sampleSize, report.criterion.minRuns)} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {report.promotedAt ? (
              <Badge tone="done">
                <Check aria-hidden />
                {m.promoted(f.dateLong(report.promotedAt), report.promotedBy ?? "—")}
              </Badge>
            ) : (
              <>
                <Badge tone={report.ready ? "done" : "neutral"}>
                  {report.ready ? <Check aria-hidden /> : <Clock aria-hidden />}
                  {report.ready ? m.ready : m.notReady}
                </Badge>
                {agent.mode === "shadow" ? (
                  canPromote ? (
                    <PromoteButton orgId={orgId} agentId={agent.id} agentName={agent.name} />
                  ) : (
                    <span className="text-xs text-muted">{m.noPermission}</span>
                  )
                ) : null}
              </>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h3">{m.title}</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{m.case}</th>
                <th>{m.agentWould}</th>
                <th>{m.teamDid}</th>
                <th>{m.result}</th>
              </tr>
            </thead>
            <tbody>
              {report.comparisons.slice(0, 40).map((c) => (
                <tr key={c.runId}>
                  <td>
                    <span className="block text-ink">{c.caseLabel}</span>
                    <span className="text-xs text-muted">{f.dateTime(c.at)}</span>
                  </td>
                  <td>{c.agentWouldDo}</td>
                  <td>{c.teamDid}</td>
                  <td>
                    {c.match ? (
                      <Badge tone="done">
                        <Check aria-hidden />
                        {m.same}
                      </Badge>
                    ) : (
                      <Badge tone="attention">
                        <X aria-hidden />
                        {m.differs}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ───────── Rendimiento ───────── */

export function PerformanceTab({ agent, perf, hourlyRate, lang }: { agent: Agent; perf: AgentPerformance; hourlyRate: number | null; lang: Lang }) {
  const m = agentsMsg[lang].perf;
  const c = common[lang];
  const f = fmt(lang);
  if (!perf.weekly.length) return <EmptyState title={m.noData} />;
  const recent = perf.weekly.slice(-4);
  const avg = Math.round(recent.reduce((s, w) => s + w.avgDurationSec * w.runs, 0) / Math.max(1, recent.reduce((s, w) => s + w.runs, 0)));
  const savesHours = agent.mode !== "shadow" && agent.mode !== "testing" && agent.mode !== "building" && agent.pausedFrom !== "shadow";
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={m.runs30} value={f.number(agent.stats.runsMonth)} />
        <Kpi label={m.noIntervention} value={agent.stats.runs7d ? f.percent(agent.stats.noInterventionRate) : "—"} />
        <Kpi
          label={m.hoursMonth}
          value={savesHours ? f.hours(agent.stats.hoursSavedMonth) : "—"}
          hint={savesHours ? (hourlyRate ? `${c.estimated} · ${m.value(f.eur(agent.stats.hoursSavedMonth * hourlyRate))}` : c.estimated) : m.shadowNote}
        />
        <Kpi label={m.avgTime} value={f.duration(avg)} />
      </div>
      <PerformanceCharts weekly={perf.weekly} showHours={savesHours} />
      <p className="text-xs text-muted">{c.estimatedNote}</p>
    </div>
  );
}
