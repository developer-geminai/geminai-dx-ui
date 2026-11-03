import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, Laptop, Radio, Users } from "lucide-react";
import type { Device, Diagnostic, DiagnosticProgress } from "@/lib/api/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/states";
import { Kpi } from "@/components/kpi";
import { DeviceStatusBadge, DiagnosticStatusBadge } from "@/components/status-badges";
import type { Lang } from "@/lib/i18n";
import { common } from "@/lib/i18n/common";
import { fmt } from "@/lib/format";
import { orgPath, withParams } from "@/lib/utils";
import { diagMsg } from "./messages";
import { DailyTeamChart } from "./diagnostic-charts";

export function ProgressView({ lang, orgId, progress, devices, scheduled }: { lang: Lang; orgId: string; progress: DiagnosticProgress | null; devices: Device[]; scheduled?: Diagnostic }) {
  const m = diagMsg[lang];
  const c = common[lang];
  const f = fmt(lang);

  if (!progress) {
    return (
      <EmptyState title={m.progress.noCapture} icon={<CalendarClock className="size-6" aria-hidden />}>
        <p>{scheduled ? m.progress.scheduled(f.dateLong(scheduled.startedAt)) : m.progress.noCaptureHint}</p>
        {!scheduled ? (
          <div className="mt-4 flex justify-center gap-2">
            <Button asChild variant="line" size="sm">
              <Link href={withParams(orgPath(orgId, "diagnostic"), { tab: "resultados" })}>{m.tabs.results}</Link>
            </Button>
            <Button asChild variant="line" size="sm">
              <Link href={withParams(orgPath(orgId, "diagnostic"), { tab: "historial" })}>{m.tabs.history}</Link>
            </Button>
          </div>
        ) : null}
      </EmptyState>
    );
  }

  const d = progress.diagnostic;
  const rows = progress.daily.map((x) => ({ date: x.date, ...x.byTeam }));
  const capturing = devices.filter((x) => x.installedAt);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <DiagnosticStatusBadge status={d.status} />
                <span className="text-sm text-muted">{c.diagnosticType[d.type]}</span>
              </div>
              <p className="mt-3 font-display text-[2.4rem] font-medium leading-none tracking-[-0.02em]">{m.progress.dayOf(d.day, d.totalDays)}</p>
              <p className="mt-2 text-sm text-muted">
                {m.progress.scope}: <span className="text-ink-2">{d.scope}</span> · {m.progress.ends(f.dateLong(d.endsAt))}
              </p>
            </div>
          </div>
          <Progress value={d.day} max={d.totalDays} className="mt-5 h-2" label={m.progress.dayOf(d.day, d.totalDays)} />
        </CardContent>
      </Card>

      {progress.silentDevices.length ? (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-signal-line bg-signal-soft px-4 py-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-signal" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-signal-ink">{m.progress.silentTitle(progress.silentDevices.length)}</p>
            <p className="text-sm text-ink-2">
              {progress.silentDevices.map((s) => `${s.alias} (${s.department}) · ${f.relative(s.lastEventAt)}`).join(" · ")}
            </p>
            <p className="mt-0.5 text-xs text-muted">{m.progress.silentHint}</p>
          </div>
          <Button asChild variant="line" size="sm">
            <Link href={orgPath(orgId, "devices")}>{m.progress.seeDevices}</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label={m.progress.devicesActive} value={`${d.devicesActive}/${d.devicesTotal}`} icon={<Radio aria-hidden />} />
        <Kpi label={m.progress.events} value={f.number(progress.eventsCaptured)} icon={<Laptop aria-hidden />} />
        <Kpi label={m.progress.teams} value={progress.teams.length} hint={progress.teams.join(", ")} icon={<Users aria-hidden />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{m.progress.daily}</CardTitle>
            <CardDescription>{m.progress.dailyHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <DailyTeamChart rows={rows} teams={progress.teams} ariaLabel={m.progress.daily} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{m.progress.devicesTitle}</CardTitle>
            <Link href={orgPath(orgId, "devices")} className="inline-flex items-center gap-1 text-sm font-medium text-brand-ink hover:underline">
              {m.progress.seeDevices}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-line">
              {capturing.map((dev) => (
                <li key={dev.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block font-mono text-sm text-ink">{dev.alias}</span>
                    <span className="block text-xs text-muted">
                      {dev.department} · {m.progress.lastEvent} {f.relative(dev.lastEventAt)}
                    </span>
                  </span>
                  <DeviceStatusBadge status={dev.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
