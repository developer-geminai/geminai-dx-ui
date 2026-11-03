import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, EmptyState } from "@/components/ui/states";
import { MetricCard } from "@/components/dashboard/metric-card";
import { BarChartCard } from "@/components/charts/charts";
import { agentSeries, statusByAgentRows } from "@/components/charts/agent-series";
import { DispositionChart, HistoricalEvaluations, QuestionStates } from "@/components/analytics/insight-panels";
import { attempt, orgAgents, orgContext, resolveAgentFilter } from "@/lib/server/org-data";
import { createConsoleClient } from "@/lib/server/console-api";
import { WINDOWS, activityByDay, agentComparison, effectsBreakdown, filterByWindow, parseWindow, statusLabels } from "@/lib/analytics";
import { cn, first, orgPath, withParams } from "@/lib/utils";
import { percent } from "@/lib/format";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const org = decodeURIComponent((await params).org);
  const sp = await searchParams;
  const { session, organization, client } = await orgContext(org);
  const agentsRes = await attempt(() => orgAgents(org));
  if (!agentsRes.ok) return <ErrorState title={agentsRes.error.title} detail={agentsRes.error.detail} />;
  const allAgents = agentsRes.data.items;
  const agent = resolveAgentFilter(first(sp.agent), allAgents);
  const selected = agent === "all" ? allAgents : allAgents.filter((a) => a.id === agent);
  const window = parseWindow(first(sp.window));
  const windowMeta = WINDOWS.find((w) => w.key === window)!;

  const [cases, insights, orgOverviews] = await Promise.all([
    attempt(() => client.cases({ agent })),
    attempt(() => client.insights(agent)),
    // Cross-organization comparison: only organizations this operator is authorized for, each read
    // through its own backend; only aggregate counts are shown side by side.
    Promise.all(session.organizations.map(async (o) => ({ org: o, res: await attempt(() => createConsoleClient(o).overview()) }))),
  ]);

  const scanned = cases.ok ? cases.data.items : [];
  const inWindow = filterByWindow(scanned, window);
  const labels = statusLabels(scanned);
  const series = agentSeries(selected, allAgents);
  const days = windowMeta.days ?? 90;
  const attentionInWindow = inWindow.filter((c) => c.tone === "attention" || c.tone === "error").length;
  const comparison = agentComparison(selected);
  const base = `${orgPath(organization.id)}/analytics`;

  return (
    <>
      <PageHeader
        eyebrow={organization.label}
        title="Analytics"
        description="Operational and quality signals across agents. Every figure is a count of recorded cases, questions or evidence checks — none is presented as accuracy unless the source established it."
      />

      <nav aria-label="Time period" className="mb-5 flex flex-wrap gap-1 rounded-md border border-line bg-surface p-1 sm:inline-flex">
        {WINDOWS.map((w) => (
          <Link
            key={w.key}
            href={withParams(base, { agent, window: w.key === "30d" ? undefined : w.key })}
            aria-current={w.key === window ? "page" : undefined}
            className={cn("rounded-sm px-3 py-1.5 text-sm font-medium", w.key === window ? "bg-brand text-brand-on" : "text-muted hover:text-ink")}
          >
            {w.label}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <MetricCard label="Cases updated" value={inWindow.length} hint={`${windowMeta.label} · of ${scanned.length} most recent scanned`} />
        <MetricCard label="Flagged in period" value={attentionInWindow} hint={`${percent(attentionInWindow, inWindow.length)} of cases updated in period`} emphasis="attention" />
        <MetricCard label="Open questions now" value={selected.reduce((n, a) => n + a.counts.questions_open, 0)} emphasis="attention" />
        <MetricCard
          label="Pending evidence checks"
          value={insights.ok ? Object.entries(insights.data.dispositions).filter(([k]) => k !== "match").reduce((n, [, v]) => n + v, 0) : "—"}
          hint="Saved checks without a match"
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Activity over time</CardTitle>
            <CardDescription>
              Cases by day of last update{selected.length > 1 ? ", per agent" : ""} — {windowMeta.days ? windowMeta.label.toLowerCase() : "last 90 days of the scanned window"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cases.ok ? (
              <BarChartCard rows={activityByDay(inWindow, days)} categoryKey="day" categoryLabel="Day" series={series} ariaLabel="Cases updated per day by agent" height={260} />
            ) : (
              <ErrorState title={cases.error.title} detail={cases.error.detail} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Business effects</CardTitle>
            <CardDescription>Cases updated in the period, by verified effect.</CardDescription>
          </CardHeader>
          <CardContent>
            {inWindow.length ? (
              <BarChartCard
                rows={effectsBreakdown(inWindow).map((e) => ({ effect: e.label, cases: e.count }))}
                categoryKey="effect"
                categoryLabel="Effect"
                series={[{ key: "cases", label: "Cases", color: "rgb(var(--chart-1))" }]}
                layout="horizontal-bars"
                ariaLabel="Cases by verified business effect"
              />
            ) : (
              <EmptyState title="No cases in this period" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agent comparison</CardTitle>
            <CardDescription>Current workload per agent (all time).</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChartCard
              rows={comparison.map((r) => ({ agent: r.name, cases: r.cases, needsReview: r.needsReview, questionsOpen: r.questionsOpen }))}
              categoryKey="agent"
              categoryLabel="Agent"
              stacked={false}
              layout="horizontal-bars"
              series={[
                { key: "cases", label: "Cases", color: "rgb(var(--chart-1))" },
                { key: "needsReview", label: "Needs review", color: "rgb(var(--chart-2))" },
                { key: "questionsOpen", label: "Open questions", color: "rgb(var(--chart-3))" },
              ]}
              ariaLabel="Cases, cases needing review and open questions per agent"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status by agent</CardTitle>
            <CardDescription>Current cases per business status.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChartCard rows={statusByAgentRows(selected, labels)} categoryKey="status" categoryLabel="Status" series={series} layout="horizontal-bars" ariaLabel="Current cases per status, split by agent" />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Quality signals</CardTitle>
          <CardDescription>{insights.ok ? insights.data.note : null}</CardDescription>
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

      {orgOverviews.length > 1 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Organizations you can access</CardTitle>
            <CardDescription>Aggregate counts only, each read through that organization&rsquo;s own isolated backend.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-line">
                  <th scope="col" className="py-2 pr-4 font-medium">Organization</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">Agents</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">Cases</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">Open questions</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">Needs review</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {orgOverviews.map(({ org: o, res }) => (
                  <tr key={o.id} className="border-b border-line/60 last:border-0">
                    <th scope="row" className="py-2 pr-4 font-medium">
                      <Link href={orgPath(o.id, "analytics")} className={cn("hover:text-brand hover:underline", o.id === organization.id && "text-brand")}>
                        {o.label}
                      </Link>
                    </th>
                    {res.ok ? (
                      <>
                        <td className="tabular py-2 pr-4 text-right">{res.data.counts.agents}</td>
                        <td className="tabular py-2 pr-4 text-right">{res.data.counts.cases}</td>
                        <td className="tabular py-2 pr-4 text-right">{res.data.counts.questions_open}</td>
                        <td className="tabular py-2 pr-4 text-right">{res.data.counts.needs_review}</td>
                        <td className="py-2 pr-4 text-xs text-muted">{res.data.demo ? "Synthetic demo" : "Recorded cases"}</td>
                      </>
                    ) : (
                      <td colSpan={5} className="py-2 pr-4 text-xs text-danger">
                        {res.error.title}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
