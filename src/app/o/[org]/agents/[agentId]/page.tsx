import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AgentAvatar, SOURCE_LABELS } from "@/components/agents/agent-card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { CaseList } from "@/components/dashboard/case-list";
import { QuestionPreviewList } from "@/components/inbox/question-preview-list";
import { DispositionChart, HistoricalEvaluations, QuestionStates } from "@/components/analytics/insight-panels";
import { BarChartCard } from "@/components/charts/charts";
import { agentSeries } from "@/components/charts/agent-series";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { attempt, orgAgents, orgContext } from "@/lib/server/org-data";
import { activityByDay, labelFor, statusLabels } from "@/lib/analytics";
import { orgPath, withParams } from "@/lib/utils";
import { percent } from "@/lib/format";

export const metadata: Metadata = { title: "Agent details" };

export default async function AgentDetailPage({ params }: { params: Promise<{ org: string; agentId: string }> }) {
  const p = await params;
  const org = decodeURIComponent(p.org);
  const agentId = decodeURIComponent(p.agentId);
  const { organization, client } = await orgContext(org);
  const agentsRes = await attempt(() => orgAgents(org));
  if (!agentsRes.ok) return <ErrorState title={agentsRes.error.title} detail={agentsRes.error.detail} />;
  const agent = agentsRes.data.items.find((a) => a.id === agentId);
  if (!agent) notFound();

  const [cases, questions, insights] = await Promise.all([attempt(() => client.cases({ agent: agentId })), attempt(() => client.questions(agentId)), attempt(() => client.insights(agentId))]);
  const labels = statusLabels(cases.ok ? cases.data.items : []);
  const statusRows = Object.entries(agent.statuses)
    .sort((a, b) => b[1] - a[1])
    .map(([s, n]) => ({ status: labelFor(s, labels), [agent.id]: n }));
  const series = agentSeries([agent], agentsRes.data.items);
  const open = questions.ok ? questions.data.items.filter((q) => q.status === "open") : [];
  const base = orgPath(organization.id);

  return (
    <>
      <Link href={`${base}/agents`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-brand">
        <ArrowLeft className="size-4" aria-hidden /> All agents
      </Link>
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <AgentAvatar agent={agent} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-1">{agent.category ?? "Agent"}</p>
          <h1 className="text-3xl font-semibold tracking-[-0.015em]">{agent.name}</h1>
          <p className="mt-1 max-w-3xl text-muted">{agent.purpose}</p>
        </div>
        <Button asChild variant="solid" size="sm">
          <Link href={withParams(`${base}/journeys`, { agent: agent.id })}>
            View journeys <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <MetricCard label="Cases" value={agent.counts.cases} href={withParams(`${base}/journeys`, { agent: agent.id })} />
        <MetricCard label="Open questions" value={agent.counts.questions_open} emphasis="attention" href={withParams(`${base}/inbox`, { agent: agent.id })} />
        <MetricCard label="Needs review" value={agent.counts.needs_review} emphasis="attention" />
        <MetricCard label="Review share" value={percent(agent.counts.needs_review, agent.counts.cases)} hint="Flagged ÷ current cases (workload, not accuracy)" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Purpose &amp; configuration</CardTitle>
            <CardDescription>As registered by the agent&rsquo;s source.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Agent ID</dt>
              <dd className="break-all font-mono text-xs leading-5">{agent.id}</dd>
              <dt className="text-muted">Category</dt>
              <dd>{agent.category ?? "—"}</dd>
              <dt className="text-muted">Data source</dt>
              <dd>{agent.source ? SOURCE_LABELS[agent.source] ?? agent.source : "—"}</dd>
              <dt className="text-muted">Organization</dt>
              <dd>{organization.label}</dd>
            </dl>
            <h3 className="mb-2 mt-5 font-sans text-sm font-semibold">Capabilities</h3>
            {agent.capabilities?.length ? (
              <ul className="flex flex-wrap gap-1.5">
                {agent.capabilities.map((c) => (
                  <li key={c}>
                    <Badge tone="done">{c}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">This agent&rsquo;s source does not report a capability list. Its recorded journeys show what it actually did.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Case status</CardTitle>
            <CardDescription>Current cases by business status.</CardDescription>
          </CardHeader>
          <CardContent>
            {statusRows.length ? (
              <BarChartCard rows={statusRows} categoryKey="status" categoryLabel="Status" series={series} layout="horizontal-bars" ariaLabel={`Current cases per status for ${agent.name}`} />
            ) : (
              <EmptyState title="No cases yet" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>Cases by last update, past 14 days (most recent {cases.ok ? cases.data.items.length : 0} cases scanned).</CardDescription>
          </CardHeader>
          <CardContent>
            {cases.ok ? (
              <BarChartCard rows={activityByDay(cases.data.items, 14)} categoryKey="day" categoryLabel="Day" series={series} ariaLabel={`Cases updated per day for ${agent.name}`} height={200} />
            ) : (
              <ErrorState title={cases.error.title} detail={cases.error.detail} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent journeys</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {cases.ok ? <CaseList org={organization.id} cases={cases.data.items.slice(0, 10)} showAgent={false} emptyTitle="No cases recorded yet" /> : <ErrorState title={cases.error.title} detail={cases.error.detail} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Waiting for a person</CardTitle>
          </CardHeader>
          <CardContent>
            {open.length ? <QuestionPreviewList org={organization.id} questions={open.slice(0, 5)} more={open.length - 5} agent={agent.id} /> : <EmptyState title="No open questions" />}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Quality signals</CardTitle>
          <CardDescription>{insights.ok ? insights.data.note : "Evidence-check outcomes and question states."}</CardDescription>
        </CardHeader>
        <CardContent>
          {insights.ok ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 font-sans text-sm font-semibold">Evidence-check outcomes</h3>
                <DispositionChart insights={insights.data} />
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="mb-2 font-sans text-sm font-semibold">Questions by state</h3>
                  <QuestionStates insights={insights.data} />
                </div>
                <HistoricalEvaluations items={insights.data.historical} />
              </div>
            </div>
          ) : (
            <ErrorState title={insights.error.title} detail={insights.error.detail} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
