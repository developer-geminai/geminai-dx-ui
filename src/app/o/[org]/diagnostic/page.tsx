import type { Metadata } from "next";
import { api } from "@/lib/api";
import { requireOrg } from "@/lib/server/session";
import { sectionGate } from "@/components/locked-section";
import { PageHeader } from "@/components/page-header";
import { PhaseBadge } from "@/components/status-badges";
import { TabLinks } from "@/components/diagnostic/tab-links";
import { ProgressView } from "@/components/diagnostic/progress-view";
import { ResultsView } from "@/components/diagnostic/results-view";
import { HistoryView } from "@/components/diagnostic/history-view";
import { diagMsg } from "@/components/diagnostic/messages";
import { can } from "@/lib/permissions";
import { orgPath, withParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Diagnóstico" };

type Tab = "progreso" | "resultados" | "historial";

export default async function DiagnosticPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ tab?: string }> }) {
  const ctx = await requireOrg(decodeURIComponent((await params).org));
  const gate = sectionGate(ctx, "diagnostic");
  if (gate) return gate;
  const m = diagMsg[ctx.lang];
  const orgId = ctx.org.id;

  const [diagnostics, progress, results, devices] = await Promise.all([
    api().listDiagnostics(orgId),
    api().getDiagnosticProgress(orgId),
    api().getDiagnosticResults(orgId),
    api().listDevices(orgId),
  ]);

  const tabs = (
    [
      { key: "progreso", flag: ctx.flags["diagnostic.progress"], label: m.tabs.progress },
      { key: "resultados", flag: ctx.flags["diagnostic.results"], label: m.tabs.results },
      { key: "historial", flag: ctx.flags["diagnostic.history"], label: m.tabs.history },
    ] as const
  ).filter((t) => t.flag);

  const requested = (await searchParams).tab as Tab | undefined;
  // Default: progress while capturing in the diagnostic phase, results otherwise.
  const preferred: Tab = ctx.org.phase === "diagnostic" || !results ? "progreso" : "resultados";
  const current: Tab = tabs.find((t) => t.key === requested)?.key ?? tabs.find((t) => t.key === preferred)?.key ?? tabs[0]?.key ?? "progreso";
  const base = orgPath(orgId, "diagnostic");
  const capturing = diagnostics.find((d) => d.status === "capturing");

  return (
    <div>
      <PageHeader eyebrow={m.eyebrow} title={m.title} description={m.description} actions={<PhaseBadge phase={ctx.org.phase} />} />
      {tabs.length > 1 ? <TabLinks label={m.title} current={current} tabs={tabs.map((t) => ({ key: t.key, label: t.label, href: withParams(base, { tab: t.key }) }))} /> : null}
      {current === "progreso" ? (
        <ProgressView lang={ctx.lang} orgId={orgId} progress={progress} devices={devices} scheduled={diagnostics.find((d) => d.status === "scheduled" && ctx.org.phase === "onboarding")} />
      ) : current === "resultados" ? (
        <ResultsView
          lang={ctx.lang}
          org={ctx.org}
          results={results}
          captureDay={capturing && results?.preliminary ? { day: capturing.day, total: capturing.totalDays } : undefined}
          canRequest={can(ctx.role, ctx.staff, "expand.request")}
        />
      ) : (
        <HistoryView lang={ctx.lang} diagnostics={diagnostics} />
      )}
    </div>
  );
}
