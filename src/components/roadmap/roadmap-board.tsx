"use client";
import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Lock } from "lucide-react";
import type { FeatureKey, Phase } from "@/lib/api/types";
import { PHASES } from "@/lib/api/types";
import { FEATURES, phaseIndex, type Release } from "@/lib/features";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/lib/i18n/client";
import { common } from "@/lib/i18n/common";
import { defineMessages, tr } from "@/lib/i18n";
import { setFeatureFlagAction, setPhaseAction } from "@/app/actions";
import { cn, orgPath } from "@/lib/utils";

const msg = defineMessages({
  es: {
    preview: "Fase del cliente",
    previewLead: "Cambia la fase para ver el portal tal y como lo verá el cliente. Las cinco fases del ciclo de vida se agrupan en tres: Construcción, Shadow y Activo viven en la Fase 2.",
    current: "Fase actual",
    viewAs: "Ver como esta fase",
    stages: {
      onboarding: "Firma del piloto y DPA, blocklist, descarga del tracker.",
      diagnostic: "Captura de ~3 semanas, ordenadores activos, resultados y oportunidades.",
      automation: "Construcción → Pruebas → Shadow → Supervisado → Activo, preguntas, auditoría, facturación.",
    } as Record<Phase, string>,
    enabled: (n: number, t: number) => `${n} de ${t} activadas`,
    enableAll: "Activar todo",
    see: "Ver",
    core: "Siempre activa",
    unlocked: "Desbloqueada",
    lockedUntil: "Bloqueada hasta esta fase",
    release: { V1: "V1 · este fin de semana", "V1.5": "V1.5 · próximas 2 semanas", V2: "V2 · con pricing cerrado" } as Record<Release, string>,
    legend: "Lanzamiento (según el spec)",
  },
  en: {
    preview: "Client phase",
    previewLead: "Switch the phase to see the portal exactly as the client will. The five lifecycle stages group into three: Build, Shadow and Active all live in Phase 2.",
    current: "Current phase",
    viewAs: "View as this phase",
    stages: {
      onboarding: "Pilot and DPA signature, blocklist, tracker download.",
      diagnostic: "~3-week capture, active computers, results and opportunities.",
      automation: "Build → Testing → Shadow → Supervised → Active, questions, audit, billing.",
    },
    enabled: (n: number, t: number) => `${n} of ${t} enabled`,
    enableAll: "Enable all",
    see: "Open",
    core: "Always on",
    unlocked: "Unlocked",
    lockedUntil: "Locked until this phase",
    release: { V1: "V1 · this weekend", "V1.5": "V1.5 · next 2 weeks", V2: "V2 · once pricing is set" },
    legend: "Release (per the spec)",
  },
});

const RELEASE_TONE: Record<Release, "done" | "info" | "outline"> = { V1: "done", "V1.5": "info", V2: "outline" };

export function RoadmapBoard({ orgId, phase, flags }: { orgId: string; phase: Phase; flags: Record<FeatureKey, boolean> }) {
  const lang = useLang();
  const m = msg[lang];
  const c = common[lang];
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(flags, (state, [key, value]: [FeatureKey, boolean]) => ({ ...state, [key]: value }));
  const [optPhase, setOptPhase] = useOptimistic(phase, (_s, p: Phase) => p);

  const toggle = (key: FeatureKey, value: boolean) =>
    start(async () => {
      setOptimistic([key, value]);
      await setFeatureFlagAction(orgId, key, value);
    });
  const enableAll = () =>
    start(async () => {
      for (const f of FEATURES.filter((x) => !optimistic[x.key])) {
        setOptimistic([f.key, true]);
        await setFeatureFlagAction(orgId, f.key, true);
      }
    });

  const enabledCount = FEATURES.filter((f) => optimistic[f.key]).length;

  return (
    <>
      <section aria-labelledby="phase-title" className="mb-8">
        <h2 id="phase-title" className="font-display text-xl font-medium">
          {m.preview}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">{m.previewLead}</p>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {PHASES.map((p) => {
            const isCurrent = optPhase === p;
            return (
              <li key={p}>
                <button
                  type="button"
                  disabled={pending || isCurrent}
                  onClick={() =>
                    start(async () => {
                      setOptPhase(p);
                      await setPhaseAction(orgId, p);
                    })
                  }
                  className={cn(
                    "flex h-full w-full flex-col rounded-lg border p-4 text-left transition-colors",
                    isCurrent ? "border-brand bg-brand-soft/60" : "border-line bg-surface hover:border-brand/50",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[0.7rem] uppercase tracking-eyebrow text-brand-ink">{c.phaseNumber[p]}</span>
                    {isCurrent ? (
                      <Badge tone="done">
                        <Check aria-hidden />
                        {m.current}
                      </Badge>
                    ) : (
                      <span className="text-xs font-medium text-brand-ink">{m.viewAs}</span>
                    )}
                  </span>
                  <span className="mt-1 font-display text-lg font-medium text-ink">{c.phase[p]}</span>
                  <span className="mt-1 text-sm text-muted">{m.stages[p]}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="label-mono">{m.legend}</span>
          {(["V1", "V1.5", "V2"] as Release[]).map((r) => (
            <Badge key={r} tone={RELEASE_TONE[r]}>
              {m.release[r]}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="tabular text-muted">{m.enabled(enabledCount, FEATURES.length)}</span>
          <Button size="sm" variant="line" disabled={pending || enabledCount === FEATURES.length} onClick={enableAll}>
            {m.enableAll}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PHASES.map((p) => {
          const reached = phaseIndex(optPhase) >= phaseIndex(p);
          const list = FEATURES.filter((f) => f.phase === p);
          return (
            <section key={p} aria-label={c.phase[p]} className={cn("rounded-lg border bg-surface", reached ? "border-line" : "border-dashed border-line")}>
              <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                <div>
                  <p className="font-mono text-[0.68rem] uppercase tracking-eyebrow text-muted">{c.phaseNumber[p]}</p>
                  <p className="font-display text-lg font-medium">{c.phase[p]}</p>
                </div>
                <span className={cn("inline-flex items-center gap-1 text-xs", reached ? "text-brand-ink" : "text-faint")}>
                  {reached ? <Check className="size-3.5" aria-hidden /> : <Lock className="size-3.5" aria-hidden />}
                  {reached ? m.unlocked : m.lockedUntil}
                </span>
              </header>
              <ul className="divide-y divide-line">
                {list.map((f) => {
                  const on = optimistic[f.key];
                  return (
                    <li key={f.key} className={cn("flex items-start gap-3 px-4 py-3", !on && "opacity-60")}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-ink">{tr(f.title, lang)}</p>
                          <Badge tone={RELEASE_TONE[f.release]} className="text-[0.65rem] leading-4">
                            {f.release}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted">{tr(f.description, lang)}</p>
                        {on ? (
                          <Link href={orgPath(orgId) + (f.href ? `/${f.href}` : "")} className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-brand-ink hover:underline">
                            {m.see}
                            <ArrowUpRight className="size-3" aria-hidden />
                          </Link>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-1 pt-0.5">
                        <Switch checked={on} disabled={f.core || pending} onCheckedChange={(v) => toggle(f.key, v)} label={tr(f.title, lang)} />
                        {f.core ? <span className="text-[0.65rem] text-faint">{m.core}</span> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
