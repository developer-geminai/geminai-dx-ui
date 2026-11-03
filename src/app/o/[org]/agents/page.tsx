import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, CircleHelp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { ModeBadge } from "@/components/status-badges";
import { sectionGate } from "@/components/locked-section";
import { agentsMsg } from "@/components/agents/messages";
import { api } from "@/lib/api";
import { AGENT_MODES, type AgentMode } from "@/lib/api/types";
import { requireOrg } from "@/lib/server/session";
import { common } from "@/lib/i18n/common";
import { fmt } from "@/lib/format";
import { cn, first, orgPath, withParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Agentes" };

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", active ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink-2 hover:border-muted")}
    >
      {children}
    </Link>
  );
}

export default async function AgentsPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireOrg(decodeURIComponent((await params).org));
  const gate = sectionGate(ctx, "agents");
  if (gate) return gate;
  const sp = await searchParams;
  const m = agentsMsg[ctx.lang];
  const c = common[ctx.lang];
  const f = fmt(ctx.lang);

  const all = await api().listAgents(ctx.org.id);
  const modeParam = first(sp.mode);
  const mode = AGENT_MODES.includes(modeParam as AgentMode) ? (modeParam as AgentMode) : undefined;
  const area = first(sp.area) || undefined;
  const agents = all.filter((a) => (!mode || a.mode === mode) && (!area || a.area === area));
  const areas = [...new Set(all.map((a) => a.area))].sort();
  const base = orgPath(ctx.org.id, "agents");
  const rate = ctx.org.hourlyRate;
  const hours = (h: number) => (
    <>
      <span className="tabular">{f.hours(h)}</span>
      {rate && h > 0 ? <span className="block text-xs text-muted">≈ {f.eur(h * rate)}</span> : null}
    </>
  );

  return (
    <div>
      <PageHeader eyebrow={m.eyebrow} title={m.title} description={m.description} />

      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={m.filterMode}>
          <span className="label-mono mr-1 w-14">{m.filterMode}</span>
          <Chip href={withParams(base, { area })} active={!mode}>
            {m.allModes}
          </Chip>
          {AGENT_MODES.map((md) => (
            <Chip key={md} href={withParams(base, { mode: md, area })} active={mode === md}>
              {c.mode[md]} <span className="tabular ml-0.5 opacity-70">{all.filter((a) => a.mode === md).length}</span>
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={m.filterArea}>
          <span className="label-mono mr-1 w-14">{m.filterArea}</span>
          <Chip href={withParams(base, { mode })} active={!area}>
            {m.allAreas}
          </Chip>
          {areas.map((a) => (
            <Chip key={a} href={withParams(base, { mode, area: a })} active={area === a}>
              {a}
            </Chip>
          ))}
        </div>
      </div>

      {agents.length === 0 ? (
        <EmptyState title={m.noAgents}>
          <Link href={base} className="font-medium text-brand-ink hover:underline">
            {m.clearFilters}
          </Link>
        </EmptyState>
      ) : (
        <>
          {/* md+: table */}
          <Card className="hidden overflow-x-auto md:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{m.col.agent}</th>
                  <th>{m.col.mode}</th>
                  <th className="text-right">{m.col.runs7d}</th>
                  <th className="text-right">{m.col.noIntervention}</th>
                  <th className="text-right">{m.col.pending}</th>
                  <th>{m.col.lastRun}</th>
                  <th className="text-right">
                    {m.col.hoursMonth}
                    <span className="block normal-case tracking-normal">{m.hoursEst}</span>
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => {
                  const href = orgPath(ctx.org.id, "agents", a.id);
                  const producing = a.stats.runs7d > 0;
                  return (
                    <tr key={a.id} className="relative">
                      <td className="min-w-[220px]">
                        <Link href={href} className="font-semibold text-ink after:absolute after:inset-0 hover:underline">
                          {a.name}
                        </Link>
                        <span className="block text-xs text-muted">{a.area}</span>
                      </td>
                      <td>
                        <ModeBadge mode={a.mode} />
                      </td>
                      <td className="tabular text-right">{producing ? f.number(a.stats.runs7d) : "—"}</td>
                      <td className="tabular text-right">{producing ? f.percent(a.stats.noInterventionRate) : "—"}</td>
                      <td className="text-right">
                        {a.stats.pendingQuestions > 0 ? (
                          <span className="tabular inline-flex items-center gap-1 rounded-full bg-signal-soft px-2 py-0.5 text-xs font-semibold text-signal-ink">
                            <CircleHelp className="size-3.5" aria-hidden />
                            {a.stats.pendingQuestions}
                          </span>
                        ) : (
                          <span className="text-muted">0</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-muted">{f.relative(a.stats.lastRunAt)}</td>
                      <td className="text-right">{a.stats.hoursSavedMonth > 0 ? hours(a.stats.hoursSavedMonth) : <span className="text-muted">—</span>}</td>
                      <td className="w-6 text-muted">
                        <ChevronRight className="size-4" aria-hidden />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* mobile: cards */}
          <ul className="flex flex-col gap-3 md:hidden">
            {agents.map((a) => (
              <li key={a.id}>
                <Link href={orgPath(ctx.org.id, "agents", a.id)} className="block rounded-lg border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{a.name}</p>
                      <p className="text-xs text-muted">{a.area}</p>
                    </div>
                    <ModeBadge mode={a.mode} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="label-mono">{m.col.runs7d}</dt>
                      <dd className="tabular">{a.stats.runs7d || "—"}</dd>
                    </div>
                    <div>
                      <dt className="label-mono">{m.col.noIntervention}</dt>
                      <dd className="tabular">{a.stats.runs7d ? f.percent(a.stats.noInterventionRate) : "—"}</dd>
                    </div>
                    <div>
                      <dt className="label-mono">{m.col.pending}</dt>
                      <dd className={cn("tabular", a.stats.pendingQuestions > 0 && "font-semibold text-signal-ink")}>{a.stats.pendingQuestions}</dd>
                    </div>
                    <div>
                      <dt className="label-mono">{m.col.hoursMonth}</dt>
                      <dd>{a.stats.hoursSavedMonth > 0 ? hours(a.stats.hoursSavedMonth) : "—"}</dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-xs text-muted">
                    {m.col.lastRun}: {f.relative(a.stats.lastRunAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <Card className="mt-6 p-5">
        <p className="label-mono mb-3">{m.lifecycle}</p>
        <ol className="flex flex-wrap items-center gap-2">
          {(["building", "testing", "shadow", "supervised", "active"] as AgentMode[]).map((md, i, arr) => (
            <li key={md} className="flex items-center gap-2">
              <span className="flex flex-col gap-1">
                <ModeBadge mode={md} />
              </span>
              {i < arr.length - 1 ? (
                <span aria-hidden className="text-faint">
                  →
                </span>
              ) : null}
            </li>
          ))}
          <li className="ml-2 flex items-center gap-2 border-l border-line pl-4">
            <ModeBadge mode="paused" />
            <span className="text-xs text-muted">{m.lifecycleNote}</span>
          </li>
        </ol>
        <ul className="mt-4 grid gap-x-6 gap-y-1 text-xs text-muted sm:grid-cols-2 lg:grid-cols-3">
          {AGENT_MODES.map((md) => (
            <li key={md}>
              <span className="font-medium text-ink">{c.mode[md]}:</span> {c.modeHint[md]}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
