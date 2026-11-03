import Link from "next/link";
import { AlertTriangle, ArrowRight, Bot, Check, CircleDashed, Clock, Gauge, Laptop, Lock, Timer } from "lucide-react";
import { api } from "@/lib/api";
import { ONBOARDING_STEPS, type AgentMode } from "@/lib/api/types";
import { requireOrg, type OrgContext } from "@/lib/server/session";
import { sectionGate } from "@/components/locked-section";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/switch";
import { Kpi } from "@/components/kpi";
import { ModeBadge, RunStatusBadge, ConfidenceBadge, PhaseBadge } from "@/components/status-badges";
import { HBars } from "@/components/charts/hbars";
import { AutomateButton } from "@/components/automate-button";
import { homeMessages } from "@/components/home/messages";
import { common } from "@/lib/i18n/common";
import { fmt } from "@/lib/format";
import { cn, orgPath } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ org: string }> }) {
  const ctx = await requireOrg(decodeURIComponent((await params).org));
  const gate = sectionGate(ctx, "home");
  if (gate) return gate;
  if (ctx.org.phase === "onboarding") return <OnboardingHome ctx={ctx} />;
  if (ctx.org.phase === "diagnostic") return <DiagnosticHome ctx={ctx} />;
  return <AutomationHome ctx={ctx} />;
}

/* ───────────── Phase 0 · Onboarding: checklist ───────────── */

async function OnboardingHome({ ctx }: { ctx: OrgContext }) {
  const m = homeMessages[ctx.lang];
  const c = common[ctx.lang];
  const ob = await api().getOnboarding(ctx.org.id);
  const doneCount = ONBOARDING_STEPS.filter((s) => ob.completed[s]).length;
  const wizard = ctx.flags["onboarding.wizard"];
  return (
    <>
      <PageHeader eyebrow={`${c.phaseNumber.onboarding} · ${c.phase.onboarding}`} title={m.onboarding.title} description={m.onboarding.lead} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardContent className="pt-5">
            <div className="mb-4 flex items-center gap-3">
              <Progress value={doneCount} max={ONBOARDING_STEPS.length} label="Onboarding" />
              <span className="tabular shrink-0 text-sm text-muted">
                {doneCount}/{ONBOARDING_STEPS.length}
              </span>
            </div>
            <ol className="flex flex-col gap-2">
              {ONBOARDING_STEPS.map((s, i) => {
                const done = ob.completed[s];
                const current = !done && ob.current === s;
                const [title, desc] = m.onboarding.steps[s]!;
                return (
                  <li key={s} className={cn("flex items-start gap-4 rounded-md border px-4 py-3", current ? "border-brand bg-brand-soft/60" : "border-line")}>
                    <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold", done ? "bg-brand text-brand-on" : current ? "border-2 border-brand text-brand-ink" : "border border-line text-muted")}>
                      {done ? <Check className="size-4" aria-hidden /> : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-medium", done ? "text-muted" : "text-ink")}>
                        {title}
                        {current ? <span className="ml-2 text-xs font-semibold uppercase tracking-eyebrow text-brand-ink">{m.onboarding.next}</span> : null}
                      </p>
                      <p className="text-sm text-muted">{desc}</p>
                    </div>
                    {current && wizard ? (
                      <Button asChild size="sm">
                        <Link href={`${orgPath(ctx.org.id, "onboarding")}?step=${s}`}>
                          {m.onboarding.continue}
                          <ArrowRight aria-hidden />
                        </Link>
                      </Button>
                    ) : done ? (
                      <span className="text-xs text-muted">{m.onboarding.done}</span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
        <UpcomingPhases ctx={ctx} />
      </div>
    </>
  );
}

function UpcomingPhases({ ctx }: { ctx: OrgContext }) {
  const m = homeMessages[ctx.lang];
  const c = common[ctx.lang];
  const phases = ctx.org.phase === "onboarding" ? (["diagnostic", "automation"] as const) : (["automation"] as const);
  return (
    <aside className="flex flex-col gap-3">
      <p className="label-mono">{m.onboarding.upcoming}</p>
      {phases.map((p) => (
        <div key={p} className="rounded-lg border border-dashed border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <PhaseBadge phase={p} />
            <Lock className="size-4 text-faint" aria-hidden />
          </div>
          <p className="mt-2 text-sm text-ink">{c.phaseHint[p]}</p>
          <p className="mt-1 text-xs text-muted">{p === "diagnostic" ? c.locked.diagnostic : c.locked.automation}</p>
        </div>
      ))}
    </aside>
  );
}

/* ───────────── Phase 1 · Diagnostic: checklist + capture ───────────── */

async function DiagnosticHome({ ctx }: { ctx: OrgContext }) {
  const m = homeMessages[ctx.lang].diagnostic;
  const c = common[ctx.lang];
  const f = fmt(ctx.lang);
  const [progress, devices, results] = await Promise.all([api().getDiagnosticProgress(ctx.org.id), api().listDevices(ctx.org.id), api().getDiagnosticResults(ctx.org.id)]);
  const active = devices.filter((d) => d.status === "online" || d.status === "idle").length;
  const diag = progress?.diagnostic;
  const items: { label: string; state: "done" | "current" | "todo" }[] = [
    { label: m.checklist.onboarding, state: "done" },
    { label: m.checklist.devices(active, devices.length), state: active === devices.length ? "done" : "current" },
    { label: diag ? m.checklist.capture(diag.day, diag.totalDays) : c.diagnosticStatus.scheduled, state: "current" },
    { label: m.checklist.preliminary, state: results ? "done" : "todo" },
    { label: m.checklist.final(f.dateLong(diag?.endsAt)), state: "todo" },
  ];
  const silent = progress?.silentDevices ?? [];
  return (
    <>
      <PageHeader eyebrow={`${c.phaseNumber.diagnostic} · ${c.phase.diagnostic}`} title={m.title} description={m.lead} />
      {silent.length ? (
        <div role="status" className="mb-6 flex flex-wrap items-center gap-3 rounded-md border border-signal-line bg-signal-soft px-4 py-3 text-sm text-signal-ink">
          <AlertTriangle className="size-4" aria-hidden />
          <span className="font-medium">{m.silent(silent.length)}</span>
          <span className="text-signal-ink/80">{silent.map((s) => `${s.alias} (${s.department})`).join(", ")}</span>
          <Link href={orgPath(ctx.org.id, "devices")} className="ml-auto font-semibold underline-offset-2 hover:underline">
            {m.seeDevices}
          </Link>
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardContent className="pt-5">
            <ol className="flex flex-col gap-3">
              {items.map((it) => (
                <li key={it.label} className="flex items-center gap-3">
                  <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", it.state === "done" ? "bg-brand text-brand-on" : it.state === "current" ? "border-2 border-brand text-brand-ink" : "border border-line text-faint")}>
                    {it.state === "done" ? <Check className="size-3.5" aria-hidden /> : it.state === "current" ? <Clock className="size-3.5" aria-hidden /> : <CircleDashed className="size-3.5" aria-hidden />}
                  </span>
                  <span className={cn("text-sm", it.state === "todo" ? "text-muted" : "text-ink", it.state === "current" && "font-medium")}>{it.label}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{m.progress}</CardTitle>
          </CardHeader>
          <CardContent>
            {diag ? (
              <>
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-4xl font-medium tabular">
                    {diag.day}
                    <span className="text-xl text-muted"> / {diag.totalDays}</span>
                  </p>
                  <span className="text-sm text-muted">{f.dateLong(diag.endsAt)}</span>
                </div>
                <Progress className="mt-3" value={diag.day} max={diag.totalDays} label={m.progress} />
                <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="label-mono">{m.activeDevices}</p>
                    <p className="mt-1 text-xl font-semibold tabular">
                      {active}/{devices.length}
                    </p>
                  </div>
                  <div>
                    <p className="label-mono">{c.nav.diagnostic}</p>
                    <p className="mt-1 text-ink">{diag.scope}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">{c.diagnosticStatus.scheduled}</p>
            )}
          </CardContent>
        </Card>
      </div>
      {results ? (
        <Card className="mt-6">
          <CardHeader className="flex-row flex-wrap items-end justify-between gap-2">
            <div>
              <CardTitle>{m.preview}</CardTitle>
              <CardDescription>{m.previewNote}</CardDescription>
            </div>
            {ctx.access("diagnostic") === "open" ? (
              <Button asChild variant="line" size="sm">
                <Link href={`${orgPath(ctx.org.id, "diagnostic")}?tab=resultados`}>
                  {m.seeResults}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            <HBars items={results.opportunities.slice(0, 4).map((o) => ({ label: o.shortName, value: o.weeklyHours }))} format={(v) => `${f.hm(v)}${m.perWeek}`} />
          </CardContent>
        </Card>
      ) : null}
      <div className="mt-6 max-w-sm">
        <UpcomingPhases ctx={ctx} />
      </div>
    </>
  );
}

/* ───────────── Phase 2 · Automation: urgent first, then KPIs ───────────── */

const MODE_ORDER: AgentMode[] = ["building", "testing", "shadow", "supervised", "active", "paused"];

async function AutomationHome({ ctx }: { ctx: OrgContext }) {
  const m = homeMessages[ctx.lang].automation;
  const c = common[ctx.lang];
  const f = fmt(ctx.lang);
  const [home, agents, progress] = await Promise.all([api().getHome(ctx.org.id), api().listAgents(ctx.org.id), api().getDiagnosticProgress(ctx.org.id)]);
  const { attention, kpis } = home;
  const urgent = attention.questions + attention.exceptions + attention.approvals;
  const qOpen = ctx.access("questions") === "open";
  const agentsOpen = ctx.access("agents") === "open";
  const next = home.nextOpportunity;
  return (
    <>
      {urgent && qOpen ? (
        <Link href={`${orgPath(ctx.org.id, "questions")}?status=pending`} className="mb-6 flex flex-wrap items-center gap-3 rounded-md border border-signal-line bg-signal-soft px-4 py-3 text-sm text-signal-ink transition-colors hover:bg-signal-soft/70">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          <span className="font-semibold">{m.attention(attention.questions, attention.exceptions, attention.approvals)}</span>
          <span className="ml-auto inline-flex items-center gap-1 font-semibold">
            {m.answer}
            <ArrowRight className="size-4" aria-hidden />
          </span>
        </Link>
      ) : null}
      <PageHeader eyebrow={`${c.phaseNumber.automation} · ${ctx.org.name}`} title={ctx.staff ? ctx.org.name : homeMessages[ctx.lang].greeting(ctx.viewer.user.name)} description={m.title} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={m.kpiAgents} value={kpis.agentsActive} icon={<Bot />} hint={m.kpiAgentsHint(kpis.agentsShadow)} href={agentsOpen ? orgPath(ctx.org.id, "agents") : undefined} />
        <Kpi label={m.kpiRuns} value={f.number(kpis.runsMonth)} icon={<Gauge />} />
        <Kpi
          label={m.kpiHours}
          value={f.hours(kpis.hoursSavedMonth)}
          icon={<Timer />}
          hint={
            <span>
              {m.kpiHoursHint}
              <br />
              {kpis.valueSavedMonth !== null ? <span className="font-medium text-ink">{m.kpiValue(f.eur(kpis.valueSavedMonth))}</span> : <Link href={`${orgPath(ctx.org.id, "settings")}?tab=datos`} className="text-brand-ink hover:underline">{m.kpiNoRate}</Link>}
            </span>
          }
        />
        <Kpi label={m.kpiAuto} value={f.percent(kpis.noInterventionRate)} icon={<Check />} hint={m.kpiAutoHint} />
      </div>

      {progress ? (
        <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
          <Laptop className="size-4" aria-hidden />
          {m.areaNote(progress.diagnostic.scope, progress.diagnostic.day)}
          <Link href={orgPath(ctx.org.id, "diagnostic")} className="font-medium text-brand-ink hover:underline">
            {m.seeDiagnostic}
          </Link>
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader className="flex-row items-end justify-between gap-2">
            <div>
              <CardTitle>{m.recent}</CardTitle>
              <CardDescription>{m.recentLead}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <ul className="divide-y divide-line">
              {home.recentRuns.map((r) => (
                <li key={r.id}>
                  <Link href={agentsOpen ? `${orgPath(ctx.org.id, "agents", r.agentId)}?tab=ejecuciones&run=${r.id}` : "#"} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-paper/60 sm:grid-cols-[minmax(0,1fr)_auto_5rem]">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{r.summary}</span>
                      <span className="block truncate text-xs text-muted">
                        {r.agentName} · #{r.id.slice(1)}
                      </span>
                    </span>
                    <RunStatusBadge status={r.status} />
                    <span className="tabular col-span-2 text-xs text-muted sm:col-span-1 sm:text-right">{f.relative(r.startedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="border-brand-line bg-brand-soft/40">
            <CardHeader>
              <p className="eyebrow">{m.next}</p>
              <CardTitle>{next ? next.workflow : m.expand}</CardTitle>
              <CardDescription>{next ? next.description : m.noNext}</CardDescription>
            </CardHeader>
            <CardContent>
              {next ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-display text-2xl font-medium tabular">{f.decimal(next.weeklyHours)}</span>
                    <span className="text-muted">{m.perWeek}</span>
                    <ConfidenceBadge confidence={next.confidence} />
                  </div>
                  {ctx.org.hourlyRate ? <p className="-mt-2 mb-4 text-xs text-muted">≈ {f.eur(next.weeklyHours * 52 * ctx.org.hourlyRate)}{m.perYear}</p> : null}
                  <AutomateButton orgId={ctx.org.id} opportunityId={next.id} workflow={next.workflow} requested={next.status === "requested"} />
                </>
              ) : (
                <Button asChild variant="forest">
                  <Link href={orgPath(ctx.org.id, "expand")}>{m.expand}</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-end justify-between gap-2">
              <CardTitle as="h3">{m.byMode}</CardTitle>
              {agentsOpen ? (
                <Link href={orgPath(ctx.org.id, "agents")} className="text-sm font-medium text-brand-ink hover:underline">
                  {m.allAgents}
                </Link>
              ) : null}
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {MODE_ORDER.map((mode) => {
                  const list = agents.filter((a) => a.mode === mode);
                  if (!list.length) return null;
                  return (
                    <li key={mode} className="flex items-start justify-between gap-3">
                      <ModeBadge mode={mode} />
                      <span className="text-right text-sm text-ink-2">{list.map((a) => a.name).join(", ")}</span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
      <p className="mt-6 text-xs text-muted">{c.estimatedNote}</p>
    </>
  );
}
