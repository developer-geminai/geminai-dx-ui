"use client";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { JourneyStep, Run } from "@/lib/types";
import { ToneIcon, normalizeTone } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { humanize, stepPhase } from "@/lib/journey";

const dot: Record<string, string> = {
  done: "bg-brand-soft text-brand ring-brand/30",
  attention: "bg-signal-soft text-signal ring-signal/30",
  error: "bg-danger-soft text-danger ring-danger/30",
  neutral: "bg-paper-alt text-muted ring-line",
};

const PHASE_LABEL: Record<string, string> = {
  input: "Input",
  interpretation: "Understanding",
  check: "Check",
  decision: "Decision",
  question: "Human",
  outcome: "Outcome",
};

function StepItem({ step, last, depth }: { step: JourneyStep; last: boolean; depth: number }) {
  const [open, setOpen] = useState(false);
  const tone = normalizeTone(step.tone);
  const phase = stepPhase(step);
  const hasTech = Boolean(step.event_type || step.evidence_ref || step.run_id || step.event_state || step.effect_state || step.parent_event_id);
  return (
    <li className="relative flex gap-4" style={depth ? { marginLeft: depth * 20 } : undefined}>
      <div className="flex flex-col items-center">
        <span className={cn("z-10 grid size-8 shrink-0 place-items-center rounded-full ring-1", dot[tone])}>
          <ToneIcon tone={tone} className="size-4" />
        </span>
        {!last ? <span className="w-px flex-1 bg-line" aria-hidden /> : null}
      </div>
      <div className={cn("min-w-0 flex-1", last ? "pb-1" : "pb-6")}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-medium text-ink">{step.title}</p>
          {phase ? <Badge tone="outline">{PHASE_LABEL[phase]}</Badge> : null}
          {step.event_state && step.event_state !== "completed" ? <Badge tone={step.event_state === "failed" ? "error" : "neutral"}>{humanize(step.event_state)}</Badge> : null}
        </div>
        {step.explanation ? <p className="mt-1 text-sm text-muted">{step.explanation}</p> : null}
        <p className="mt-1 text-xs text-muted">
          {step.at ? <time dateTime={step.at}>{formatDateTime(step.at)}</time> : <span>Time not recorded</span>}
          {step.based_on ? <span> · Based on: {step.based_on}</span> : null}
        </p>
        {hasTech ? (
          <div className="mt-1.5">
            <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
              Technical details
            </button>
            {open ? (
              <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-md bg-paper-alt p-3 font-mono text-[0.72rem]">
                {(
                  [
                    ["Event ID", step.id],
                    ["Event type", step.event_type ?? step.category],
                    ["Event state", step.event_state],
                    ["Effect state", step.effect_state],
                    ["Evidence ref", step.evidence_ref],
                    ["Run", step.run_id],
                    ["Parent event", step.parent_event_id],
                  ] as const
                )
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted">{k}</dt>
                      <dd className="break-all text-ink">{v}</dd>
                    </div>
                  ))}
              </dl>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

/** Depth of each step in its parent_event_id chain (only when the producer recorded parents). */
function depths(steps: JourneyStep[]): Map<string, number> {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const out = new Map<string, number>();
  const depthOf = (s: JourneyStep, seen = new Set<string>()): number => {
    if (out.has(s.id)) return out.get(s.id)!;
    const parent = s.parent_event_id ? byId.get(s.parent_event_id) : undefined;
    const d = parent && !seen.has(parent.id) && parent.id !== s.id ? Math.min(3, depthOf(parent, new Set([...seen, s.id])) + 1) : 0;
    out.set(s.id, d);
    return d;
  };
  steps.forEach((s) => depthOf(s));
  return out;
}

/**
 * Chronological timeline of recorded steps. When the producer reported runs, steps are grouped
 * per run (retries / alternative attempts); parent links indent branches. Nothing is inferred.
 */
export function Timeline({ steps, runs }: { steps: JourneyStep[]; runs?: Run[] }) {
  const groups = useMemo(() => {
    const runList = runs ?? [];
    if (!runList.length || !steps.some((s) => s.run_id)) return [{ run: null as Run | null, steps }];
    const result = runList.map((r) => ({ run: r as Run | null, steps: steps.filter((s) => s.run_id === r.id) }));
    const orphan = steps.filter((s) => !s.run_id || !runList.some((r) => r.id === s.run_id));
    if (orphan.length) result.push({ run: null, steps: orphan });
    return result.filter((g) => g.steps.length);
  }, [steps, runs]);
  const d = useMemo(() => depths(steps), [steps]);

  if (!steps.length) return <p className="text-sm italic text-muted">No business steps are recorded for this case.</p>;

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g, gi) => (
        <section key={g.run?.id ?? `none-${gi}`} aria-label={g.run ? `Run ${g.run.label ?? g.run.id}` : "Recorded steps"}>
          {groups.length > 1 || g.run ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{g.run ? g.run.label ?? `Run ${g.run.id}` : "Steps without a run"}</span>
              {g.run?.state ? <Badge tone={g.run.state === "failed" ? "error" : g.run.state === "completed" ? "done" : "neutral"}>{humanize(g.run.state)}</Badge> : null}
              {g.run?.started_at ? <span className="text-xs text-muted">{formatDateTime(g.run.started_at)}</span> : null}
            </div>
          ) : null}
          <ol>
            {g.steps.map((s, i) => (
              <StepItem key={`${s.id}-${i}`} step={s} last={i === g.steps.length - 1} depth={d.get(s.id) ?? 0} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
