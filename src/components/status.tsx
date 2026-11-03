import { AlertCircle, CheckCircle2, CircleDashed, CircleDot, ShieldCheck, ShieldQuestion, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EFFECT_LABELS } from "@/lib/journey";
import type { Tone } from "@/lib/types";

type BadgeTone = "done" | "attention" | "error" | "neutral";

export function normalizeTone(tone: Tone | null | undefined): BadgeTone {
  const known: readonly BadgeTone[] = ["done", "attention", "error"];
  return known.find((k) => k === tone) ?? "neutral";
}

export function ToneIcon({ tone, className }: { tone?: Tone | null; className?: string }) {
  const t = normalizeTone(tone);
  const Icon = t === "done" ? CheckCircle2 : t === "attention" ? CircleDot : t === "error" ? AlertCircle : CircleDashed;
  return <Icon className={className} aria-hidden />;
}

/** Status is always icon + text, never colour alone. */
export function StatusBadge({ tone, label, title }: { tone?: Tone | null; label: string; title?: string }) {
  return (
    <Badge tone={normalizeTone(tone)} title={title}>
      <ToneIcon tone={tone} />
      {label}
    </Badge>
  );
}

export function EffectBadge({ status }: { status: "executed" | "not_executed" | "unknown" | string }) {
  const meta = EFFECT_LABELS[status] ?? EFFECT_LABELS.unknown!;
  const Icon = status === "executed" ? ShieldCheck : status === "not_executed" ? ShieldOff : ShieldQuestion;
  return (
    <Badge tone={normalizeTone(meta.tone)} title={meta.detail}>
      <Icon aria-hidden />
      {meta.label}
    </Badge>
  );
}

export function effectFromSummary(effects: boolean | null | undefined): "executed" | "not_executed" | "unknown" {
  return effects === true ? "executed" : effects === false ? "not_executed" : "unknown";
}
