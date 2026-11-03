import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info, MessageCircleQuestion } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState, EmptyState } from "@/components/ui/states";
import { EffectBadge, StatusBadge } from "@/components/status";
import { JourneySummary } from "@/components/journey/journey-summary";
import { Timeline } from "@/components/journey/timeline";
import { ObservationCard } from "@/components/journey/observation-card";
import { InputPanel } from "@/components/journey/input-panel";
import { AuditPanel } from "@/components/journey/audit-panel";
import { JsonBlock } from "@/components/journey/json-block";
import { questionKey } from "@/components/inbox/question-preview-list";
import { attempt, orgContext } from "@/lib/server/org-data";
import { BackendError } from "@/lib/server/console-api";
import { buildJourneySummary, humanize } from "@/lib/journey";
import { orgPath, withParams } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Agent Journey" };

export default async function JourneyDetailPage({ params }: { params: Promise<{ org: string; agentId: string; caseId: string }> }) {
  const p = await params;
  const org = decodeURIComponent(p.org);
  const agentId = decodeURIComponent(p.agentId);
  const caseId = decodeURIComponent(p.caseId);
  const { organization, client } = await orgContext(org);
  const res = await attempt(() => client.caseDetail(agentId, caseId).catch((err) => {
    if (err instanceof BackendError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }));
  const base = orgPath(organization.id);
  if (!res.ok) return <ErrorState title={res.error.title} detail={res.error.detail} />;
  const c = res.data;
  const { sections, unclassifiedSteps } = buildJourneySummary(c);
  const headline = c.request?.subject && c.request.subject !== c.title ? c.request.subject : c.title;
  const hasRecordedChronology = Boolean(c.source_explanations?.length);

  return (
    <>
      <Link href={withParams(`${base}/journeys`, { agent: c.agent_id })} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-brand">
        <ArrowLeft className="size-4" aria-hidden /> {c.agent_name} journeys
      </Link>

      <header className="mb-6">
        <p className="eyebrow mb-2">
          <Link href={orgPath(organization.id, "agents", c.agent_id)} className="hover:underline">
            {c.agent_name}
          </Link>
        </p>
        <h1 className="max-w-4xl text-[1.8rem] font-semibold leading-tight tracking-[-0.015em] md:text-[2.1rem]">{headline}</h1>
        {headline !== c.title ? <p className="mt-1 text-muted">{c.title}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge tone={c.tone} label={c.status_label} title={c.status_description} />
          <EffectBadge status={c.outcome.effects_status} />
          {c.mode ? <span className="text-xs text-muted">Mode: {humanize(c.mode)}</span> : null}
          <span className="text-xs text-muted">
            · <span className="font-mono">{c.id}</span> · updated {formatDateTime(c.updated_at)}
          </span>
        </div>
      </header>

      <Card className="mb-6 border-l-4 border-l-brand">
        <CardContent className="grid gap-4 pt-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <p className="font-mono text-[0.68rem] uppercase tracking-eyebrow text-muted">Outcome</p>
            <p className="mt-1 font-display text-xl font-semibold">{c.outcome.label}</p>
            {c.outcome.detail ? <p className="mt-1 text-sm text-muted">{c.outcome.detail}</p> : null}
          </div>
          {c.next_action ? (
            <div>
              <p className="font-mono text-[0.68rem] uppercase tracking-eyebrow text-muted">Next action</p>
              <p className="mt-1 text-sm font-medium text-ink">{c.next_action}</p>
              {c.open_question_count ? (
                <Button asChild size="sm" className="mt-3">
                  <Link href={withParams(`${base}/inbox`, { agent: c.agent_id, question: c.questions.find((q) => q.status === "open") ? questionKey({ ...c.questions.find((q) => q.status === "open")!, agent_id: c.agent_id }) : undefined })}>
                    <MessageCircleQuestion aria-hidden /> Review open question
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>The journey at a glance</CardTitle>
              <CardDescription>Eight questions, answered only with what the agent recorded.</CardDescription>
            </CardHeader>
            <CardContent>
              <JourneySummary sections={sections} unclassifiedSteps={unclassifiedSteps} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chronological journey</CardTitle>
              <CardDescription>{hasRecordedChronology ? "Steps from committed audit records, in order." : "Recorded business steps, in the order the source supplied them."}</CardDescription>
            </CardHeader>
            <CardContent>
              <Timeline steps={c.steps} runs={c.runs} />
            </CardContent>
          </Card>

          {hasRecordedChronology ? (
            <Card>
              <CardHeader>
                <CardTitle as="h3">Current case explanation</CardTitle>
                <CardDescription>Reconstructed by the source adapter from the saved case state (separate from the chronology above).</CardDescription>
              </CardHeader>
              <CardContent>
                <Timeline steps={c.source_explanations ?? []} />
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle as="h3">What the agent received</CardTitle>
            </CardHeader>
            <CardContent>
              <InputPanel request={c.request} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h3">Questions for a person</CardTitle>
            </CardHeader>
            <CardContent>
              {c.questions.length ? (
                <ul className="flex flex-col gap-3">
                  {c.questions.map((q) => (
                    <li key={q.id} className="rounded-md border border-line p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{q.text ?? q.title}</p>
                        <StatusBadge tone={q.status === "open" ? "attention" : "done"} label={humanize(q.status)} />
                      </div>
                      {q.options?.length ? (
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {q.options.map((o, i) => (
                            <li key={String(o.id ?? o.option_id ?? i)} className="rounded-full border border-line px-2 py-0.5 text-xs">
                              {String(o.label ?? o.id ?? "Option")}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {q.status === "open" ? (
                        <Link className="mt-2 inline-block text-xs font-medium text-brand hover:underline" href={withParams(`${base}/inbox`, { agent: c.agent_id, question: questionKey({ ...q, agent_id: c.agent_id }) })}>
                          Open in Human Inbox →
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No human questions" className="py-6" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h3">Evidence checks</CardTitle>
              <CardDescription>
                {c.observations.length ? `${c.observations.length} saved comparison(s), ${c.pending_observations ?? c.observations.filter((o) => o.pending).length} pending.` : "Saved comparisons with business sources."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {c.observations.length ? c.observations.map((o) => <ObservationCard key={o.id} o={o} />) : <EmptyState title="No evidence checks recorded" className="py-6" />}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle as="h3">Technical details</CardTitle>
          <CardDescription>For engineers and auditors. Collapsed by default.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <details className="rounded-md border border-line p-3">
            <summary className="cursor-pointer text-sm font-medium">Audit history ({c.history?.length ?? 0} recorded events)</summary>
            {c.history?.length ? (
              <ol className="mt-3 flex flex-col gap-1 text-xs">
                {c.history.map((h) => (
                  <li key={String(h.id)} className="flex flex-wrap gap-x-3">
                    <span className="w-40 shrink-0 text-muted">{formatDateTime(h.at)}</span>
                    <span className="font-mono text-muted">{h.kind}</span>
                    <span>{h.title}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-xs text-muted">No audit events recorded.</p>
            )}
          </details>
          {c.saved_decision && Object.keys(c.saved_decision).length ? (
            <details className="rounded-md border border-line p-3">
              <summary className="cursor-pointer text-sm font-medium">Saved decision record</summary>
              <JsonBlock value={c.saved_decision} className="mt-3" />
            </details>
          ) : null}
          {c.interpretation?.requests?.length ? (
            <details className="rounded-md border border-line p-3">
              <summary className="cursor-pointer text-sm font-medium">Saved interpretation (structured)</summary>
              <JsonBlock value={c.interpretation} className="mt-3" />
            </details>
          ) : null}
          <details className="rounded-md border border-line p-3">
            <summary className="cursor-pointer text-sm font-medium">Source metadata</summary>
            <JsonBlock value={{ technical: c.technical, execution_receipt: c.execution_receipt, version: c.version, mode: c.mode }} className="mt-3" />
          </details>
          <details className="rounded-md border border-line p-3">
            <summary className="cursor-pointer text-sm font-medium">Full case response (raw JSON)</summary>
            <JsonBlock value={c} className="mt-3" />
          </details>
          <div className="rounded-md border border-line p-3">
            <p className="mb-2 text-sm font-medium">Case audit export</p>
            <AuditPanel org={organization.id} agentId={c.agent_id} caseId={c.id} />
          </div>
        </CardContent>
      </Card>

      {c.narration_disclaimer ? (
        <p className="mt-6 flex items-start gap-2 text-xs text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {c.narration_disclaimer}
        </p>
      ) : null}
    </>
  );
}
