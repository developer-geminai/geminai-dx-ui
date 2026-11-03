import Link from "next/link";
import { CalendarDays, Clock, Info, Laptop, Network, Sparkles } from "lucide-react";
import type { DiagnosticResults, Organization } from "@/lib/api/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import type { Lang } from "@/lib/i18n";
import { common } from "@/lib/i18n/common";
import { fmt } from "@/lib/format";
import { orgPath } from "@/lib/utils";
import { diagMsg } from "./messages";
import { HoursBars, ShareBars, SingleTrend } from "./diagnostic-charts";
import { OpportunityAccordion, OpportunityAction, SequenceChips } from "./opportunity-accordion";

export function ResultsView({ lang, org, results, captureDay, canRequest }: { lang: Lang; org: Organization; results: DiagnosticResults | null; captureDay?: { day: number; total: number }; canRequest: boolean }) {
  const m = diagMsg[lang].results;
  const c = common[lang];
  const f = fmt(lang);
  if (!results) return <EmptyState title={m.none} />;

  const rate = org.hourlyRate;
  const s = results.summary;
  const opps = [...results.opportunities].sort((a, b) => a.rank - b.rank);
  const first = opps[0];
  const trend = results.frictionTrend.map((t) => ({ date: t.date, hours: t.trackedHours, switches: t.focusSwitches }));

  return (
    <div className="flex flex-col gap-6">
      {results.preliminary ? (
        <div className="flex items-start gap-3 rounded-lg border border-line bg-surface px-4 py-3">
          <Info className="mt-0.5 size-5 shrink-0 text-[rgb(var(--chart-2))]" aria-hidden />
          <div>
            <p className="font-semibold text-ink">{m.preliminary(captureDay?.day ?? 0, captureDay?.total ?? 21)}</p>
            <p className="text-sm text-muted">{m.preliminaryHint}</p>
          </div>
        </div>
      ) : null}

      {/* Hero — mirrors the dashboard's executive summary */}
      <Card className="overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex items-start gap-5">
            <span className="hidden size-16 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink sm:flex">
              <Clock className="size-7" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-2">{m.heroLabel}</p>
              <p className="tabular mt-1 font-display text-[3rem] font-medium leading-none tracking-[-0.02em] text-ink">{f.hm(s.weeklyHoursRecoverable)}</p>
              <p className="mt-2 text-sm text-muted">
                {rate ? m.perYear(f.eur(s.weeklyHoursRecoverable * 52 * rate)) : (
                  <>
                    {m.setRate}{" "}
                    <Link href={orgPath(org.id, "settings")} className="font-medium text-brand-ink hover:underline">
                      {c.nav.settings} →
                    </Link>
                  </>
                )}
              </p>
              <p className="mt-1 text-xs text-faint">{c.estimatedNote}</p>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-6 border-t border-line pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
            {[
              { icon: CalendarDays, v: f.decimal(s.weeksObserved), l: m.weeks },
              { icon: Laptop, v: f.number(s.devicesObserved), l: m.devices },
              { icon: Network, v: f.number(s.patternsMapped), l: m.patterns },
            ].map((x) => (
              <div key={x.l}>
                <dt className="sr-only">{x.l}</dt>
                <dd className="flex items-center gap-1.5 font-display text-2xl font-medium">
                  <x.icon className="size-4 text-muted" aria-hidden />
                  <span className="tabular">{x.v}</span>
                </dd>
                <p className="text-xs text-muted">{x.l}</p>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line bg-paper/50 px-6 py-2.5 text-xs text-muted">
          <span>
            <span className="tabular font-semibold text-ink">{f.number(s.appSwitches)}</span> {m.switches}
          </span>
          <span>
            <span className="tabular font-semibold text-ink">{f.number(s.copyPasteEvents)}</span> {m.copyPaste}
          </span>
          <span>
            {f.date(results.period.from)} – {f.date(results.period.to)}
          </span>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{m.whereTime}</CardTitle>
          <CardDescription>{m.whereTimeHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <HoursBars items={opps.map((o) => ({ label: o.workflow, value: o.weeklyHours }))} rate={rate} />
        </CardContent>
      </Card>

      {first ? (
        <section className="rounded-lg border border-brand-line bg-brand-soft/60 p-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_auto_auto] lg:items-center">
            <div>
              <Badge tone="done">
                <Sparkles aria-hidden />
                {m.recommended}
              </Badge>
              <h3 className="mt-2 font-display text-2xl font-medium">{first.workflow}</h3>
              <p className="mt-1 text-sm text-ink-2">{first.description}</p>
              <SequenceChips steps={first.sequence} className="mt-3" />
            </div>
            <dl className="grid grid-cols-2 gap-6 lg:border-l lg:border-brand-line lg:pl-6">
              <div>
                <dt className="text-xs text-muted">{m.potential}</dt>
                <dd className="tabular font-display text-2xl font-medium">
                  {f.hm(first.weeklyHours)}
                  <span className="text-sm text-muted">{lang === "es" ? "/sem" : "/wk"}</span>
                </dd>
                {rate ? <p className="text-xs text-muted">{f.eur(first.weeklyHours * 52 * rate)}{lang === "es" ? "/año" : "/yr"}</p> : null}
              </div>
              <div>
                <dt className="text-xs text-muted">{m.frequency}</dt>
                <dd className="tabular font-display text-2xl font-medium">{m.perWeek(first.frequencyPerWeek)}</dd>
              </div>
            </dl>
            <div>
              <OpportunityAction orgId={org.id} o={first} canRequest={canRequest} />
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3">
          <h2 className="font-display text-xl font-medium">{m.opportunities}</h2>
          <p className="text-sm text-muted">{m.opportunitiesHint}</p>
        </div>
        <OpportunityAccordion orgId={org.id} opportunities={opps} rate={rate} canRequest={canRequest} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{m.departments}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto px-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{m.dept}</th>
                  <th className="text-right">{m.weeklyHours}</th>
                  <th className="text-right">{m.devicesCol}</th>
                  <th>{m.topTask}</th>
                </tr>
              </thead>
              <tbody>
                {results.departments.map((d) => (
                  <tr key={d.name}>
                    <td className="font-medium">{d.name}</td>
                    <td className="tabular text-right">{f.decimal(d.weeklyHours)}</td>
                    <td className="tabular text-right">{d.devices}</td>
                    <td className="text-muted">{d.topTask}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{m.apps}</CardTitle>
            <CardDescription>{m.appsHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <ShareBars items={results.appUsage.map((a) => ({ label: a.label, value: a.share }))} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{m.repeated}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto px-2">
          <table className="data-table">
            <thead>
              <tr>
                <th>{m.pattern}</th>
                <th>{m.type}</th>
                <th className="text-right">{m.freq}</th>
                <th className="text-right">{m.avg}</th>
                <th className="text-right">{m.week}</th>
              </tr>
            </thead>
            <tbody>
              {results.patterns.map((p) => (
                <tr key={p.pattern}>
                  <td className="font-medium">{p.pattern}</td>
                  <td className="text-muted">{p.label}</td>
                  <td className="tabular text-right">{p.frequency}</td>
                  <td className="tabular text-right">{f.duration(p.avgDurationMin * 60)}</td>
                  <td className="tabular text-right">{f.hm(p.weeklyHours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle as="h3">{m.trendHours}</CardTitle>
          </CardHeader>
          <CardContent>
            <SingleTrend rows={trend} valueKey="hours" label={m.trendHours} unit="hours" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle as="h3">{m.trendSwitches}</CardTitle>
          </CardHeader>
          <CardContent>
            <SingleTrend rows={trend} valueKey="switches" label={m.trendSwitches} unit="count" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
