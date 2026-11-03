import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Bot, Briefcase, HelpCircle, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { CaseList } from "@/components/dashboard/case-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { BarChartCard } from "@/components/charts/charts";
import { agentSeries, statusByAgentRows } from "@/components/charts/agent-series";
import { AgentCard } from "@/components/agents/agent-card";
import { QuestionPreviewList } from "@/components/inbox/question-preview-list";
import { attempt, orgAgents, orgContext, orgOverview, resolveAgentFilter } from "@/lib/server/org-data";
import { statusLabels } from "@/lib/analytics";
import { first, orgPath, withParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const org = decodeURIComponent((await params).org);
  const sp = await searchParams;
  const { organization, client } = await orgContext(org);
  const agentsRes = await attempt(() => orgAgents(org));
  if (!agentsRes.ok) return <ErrorState title={agentsRes.error.title} detail={agentsRes.error.detail} />;
  const allAgents = agentsRes.data.items;
  const agent = resolveAgentFilter(first(sp.agent), allAgents);
  const selected = agent === "all" ? allAgents : allAgents.filter((a) => a.id === agent);

  const [overview, questions, cases] = await Promise.all([
    attempt(() => orgOverview(org, agent)),
    attempt(() => client.questions(agent)),
    attempt(() => client.cases({ agent })),
  ]);
  if (!overview.ok) return <ErrorState title={overview.error.title} detail={overview.error.detail} />;
  const o = overview.data;
  const labels = statusLabels(cases.ok ? cases.data.items : o.recent);
  const openQuestions = questions.ok ? questions.data.items.filter((q) => q.status === "open") : [];
  const base = orgPath(organization.id);

  return (
    <>
      <PageHeader
        eyebrow={organization.label}
        title="Overview"
        description={
          agent === "all"
            ? `What ${o.agents_count} agent${o.agents_count === 1 ? " is" : "s are"} doing in this organization, and what needs a person.`
            : `Activity for ${selected[0]?.name}.`
        }
        actions={
          <Button asChild variant="line" size="sm">
            <Link href={withParams(`${base}/journeys`, { agent })}>
              All journeys <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <MetricCard label="Agents" value={o.counts.agents} hint={agent === "all" ? "Registered and enabled" : `of ${o.total_agents_in_org} in organization`} href={`${base}/agents`} icon={<Bot className="size-4" />} />
        <MetricCard label="Cases" value={o.counts.cases} hint="Current business cases" href={withParams(`${base}/journeys`, { agent })} icon={<Briefcase className="size-4" />} />
        <MetricCard label="Open questions" value={o.counts.questions_open} hint="Waiting for a person" href={withParams(`${base}/inbox`, { agent })} emphasis="attention" icon={<HelpCircle className="size-4" />} />
        <MetricCard label="Needs review" value={o.counts.needs_review} hint="Cases flagged for attention" href={withParams(`${base}/journeys`, { agent, tone: "attention" })} emphasis="attention" icon={<ShieldAlert className="size-4" />} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Needs a person</CardTitle>
            <CardDescription>Open clarification questions, newest first.</CardDescription>
          </CardHeader>
          <CardContent>
            {!questions.ok ? (
              <ErrorState title={questions.error.title} detail={questions.error.detail} />
            ) : openQuestions.length ? (
              <QuestionPreviewList org={organization.id} questions={openQuestions.slice(0, 5)} more={openQuestions.length - 5} agent={agent} />
            ) : (
              <EmptyState title="No open questions">Every agent can currently continue without human input.</EmptyState>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Case status</CardTitle>
            <CardDescription>Current cases by business status{selected.length > 1 ? " and agent" : ""}.</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(o.statuses).length ? (
              <BarChartCard
                rows={statusByAgentRows(selected, labels)}
                categoryKey="status"
                categoryLabel="Status"
                series={agentSeries(selected, allAgents)}
                layout="horizontal-bars"
                ariaLabel="Number of current cases per business status, split by agent"
              />
            ) : (
              <EmptyState title="No cases yet" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Most recently updated cases.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <CaseList org={organization.id} cases={o.recent} showAgent={agent === "all"} emptyTitle="No recent cases" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Agents</CardTitle>
            <CardDescription>Each agent&rsquo;s purpose and current workload.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {selected.map((a) => (
              <AgentCard key={a.id} org={organization.id} agent={a} compact />
            ))}
          </CardContent>
        </Card>
      </div>
      {o.note ? <p className="mt-6 text-xs text-muted">{o.note}</p> : null}
    </>
  );
}
