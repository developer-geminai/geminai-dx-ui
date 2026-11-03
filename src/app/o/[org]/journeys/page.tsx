import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CaseList } from "@/components/dashboard/case-list";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import { ErrorState } from "@/components/ui/states";
import { attempt, orgAgents, orgContext, resolveAgentFilter } from "@/lib/server/org-data";
import { labelFor, statusLabels } from "@/lib/analytics";
import { first, orgPath, withParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Agent Journeys" };

const TONES = [
  { key: "attention", label: "Needs attention" },
  { key: "done", label: "Completed / ready" },
  { key: "neutral", label: "Other" },
];

export default async function JourneysPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const org = decodeURIComponent((await params).org);
  const sp = await searchParams;
  const { organization, client } = await orgContext(org);
  const agentsRes = await attempt(() => orgAgents(org));
  if (!agentsRes.ok) return <ErrorState title={agentsRes.error.title} detail={agentsRes.error.detail} />;
  const agents = agentsRes.data.items;
  const agent = resolveAgentFilter(first(sp.agent), agents);
  const q = (first(sp.q) ?? "").slice(0, 100);
  const status = first(sp.status) ?? "";
  const tone = TONES.some((t) => t.key === first(sp.tone)) ? first(sp.tone)! : "";

  const [cases, allForLabels] = await Promise.all([attempt(() => client.cases({ agent, q, status })), attempt(() => client.cases({ agent }))]);
  const labels = statusLabels(allForLabels.ok ? allForLabels.data.items : []);
  const scope = agent === "all" ? agents : agents.filter((a) => a.id === agent);
  const statusKeys = [...new Set(scope.flatMap((a) => Object.keys(a.statuses)))].sort();
  const items = cases.ok ? cases.data.items.filter((c) => !tone || (tone === "attention" ? c.tone === "attention" || c.tone === "error" : tone === "done" ? c.tone === "done" : c.tone !== "attention" && c.tone !== "error" && c.tone !== "done")) : [];
  const base = `${orgPath(organization.id)}/journeys`;
  const filtered = Boolean(q || status || tone);

  return (
    <>
      <PageHeader
        eyebrow={organization.label}
        title="Agent Journeys"
        description="Each business case an agent worked on, from what it received to what it achieved — built only from recorded events and saved evidence."
      />
      <Card>
        <CardContent className="pt-5">
          <form method="get" action={base} className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end" role="search">
            {agent !== "all" ? <input type="hidden" name="agent" value={agent} /> : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="journey-q">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted" aria-hidden />
                <Input id="journey-q" name="q" defaultValue={q} className="pl-8" placeholder="Case ID, title, subject or status" maxLength={100} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="journey-status">Business status</Label>
              <Select id="journey-status" name="status" defaultValue={status}>
                <option value="">Any status</option>
                {statusKeys.map((s) => (
                  <option key={s} value={s}>
                    {labelFor(s, labels)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="journey-tone">Attention</Label>
              <Select id="journey-tone" name="tone" defaultValue={tone}>
                <option value="">Any</option>
                {TONES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit">Apply</Button>
              {filtered ? (
                <Button asChild variant="ghost">
                  <Link href={withParams(base, { agent })}>Clear</Link>
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="pt-3">
          {!cases.ok ? (
            <ErrorState title={cases.error.title} detail={cases.error.detail} />
          ) : (
            <>
              <p className="mb-1 text-sm text-muted" aria-live="polite">
                {items.length} case{items.length === 1 ? "" : "s"} shown
                {cases.data.truncated_search ? " · search covers the most recent records per agent only" : ""}
                {cases.data.items.length >= 200 ? " · limited to the 200 most recent matches" : ""}
              </p>
              <CaseList org={organization.id} cases={items} showAgent={agent === "all"} />
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
