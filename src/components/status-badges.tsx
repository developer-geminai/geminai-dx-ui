"use client";
import { AlertTriangle, CheckCircle2, CircleDashed, CircleHelp, Clock, FlaskConical, Hammer, Loader2, PauseCircle, Radio, ShieldCheck, XCircle, Eye } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { useLang } from "@/lib/i18n/client";
import { common } from "@/lib/i18n/common";
import type { AgentMode, Confidence, ContractStatus, DeviceStatus, DiagnosticStatus, OpportunityStatus, Phase, QuestionKind, QuestionStatus, RunStatus } from "@/lib/api/types";

type Tone = NonNullable<BadgeProps["tone"]>;

/** Status badges always pair color with an icon + text (never color alone). Amber = needs attention only. */

const MODE: Record<AgentMode, { tone: Tone; icon: typeof Eye }> = {
  building: { tone: "neutral", icon: Hammer },
  testing: { tone: "neutral", icon: FlaskConical },
  shadow: { tone: "outline", icon: Eye },
  supervised: { tone: "info", icon: ShieldCheck },
  active: { tone: "done", icon: Radio },
  paused: { tone: "paused", icon: PauseCircle },
};

export function ModeBadge({ mode, className }: { mode: AgentMode; className?: string }) {
  const m = common[useLang()];
  const { tone, icon: Icon } = MODE[mode];
  return (
    <Badge tone={tone} className={className} title={m.modeHint[mode]}>
      <Icon aria-hidden />
      {m.mode[mode]}
    </Badge>
  );
}

const RUN: Record<RunStatus, { tone: Tone; icon: typeof Eye }> = {
  completed: { tone: "done", icon: CheckCircle2 },
  escalated: { tone: "attention", icon: CircleHelp },
  failed: { tone: "error", icon: XCircle },
  running: { tone: "info", icon: Loader2 },
  awaiting_approval: { tone: "attention", icon: Clock },
};

export function RunStatusBadge({ status, className }: { status: RunStatus; className?: string }) {
  const m = common[useLang()];
  const { tone, icon: Icon } = RUN[status];
  return (
    <Badge tone={tone} className={className}>
      <Icon aria-hidden className={status === "running" ? "animate-spin" : undefined} />
      {m.run[status]}
    </Badge>
  );
}

export function QuestionKindBadge({ kind, className }: { kind: QuestionKind; className?: string }) {
  const m = common[useLang()];
  const Icon = kind === "approval" ? ShieldCheck : kind === "exception" ? AlertTriangle : CircleHelp;
  return (
    <Badge tone={kind === "approval" ? "info" : "attention"} className={className}>
      <Icon aria-hidden />
      {m.questionKind[kind]}
    </Badge>
  );
}

export function QuestionStatusBadge({ status }: { status: QuestionStatus }) {
  const m = common[useLang()];
  return (
    <Badge tone={status === "pending" ? "attention" : status === "answered" ? "done" : "neutral"}>
      {status === "answered" ? <CheckCircle2 aria-hidden /> : <Clock aria-hidden />}
      {m.questionStatus[status]}
    </Badge>
  );
}

export function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
  const m = common[useLang()];
  const map: Record<DeviceStatus, { tone: Tone; icon: typeof Eye }> = {
    online: { tone: "done", icon: Radio },
    idle: { tone: "neutral", icon: Clock },
    offline: { tone: "attention", icon: AlertTriangle },
    paused: { tone: "paused", icon: PauseCircle },
    pending: { tone: "outline", icon: CircleDashed },
  };
  const { tone, icon: Icon } = map[status];
  return (
    <Badge tone={tone}>
      <Icon aria-hidden />
      {m.device[status]}
    </Badge>
  );
}

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const m = common[useLang()];
  return (
    <Badge tone={status === "signed" ? "done" : status === "pending_signature" ? "attention" : "neutral"}>
      {status === "signed" ? <CheckCircle2 aria-hidden /> : status === "pending_signature" ? <Clock aria-hidden /> : <CircleDashed aria-hidden />}
      {m.contractStatus[status]}
    </Badge>
  );
}

export function DiagnosticStatusBadge({ status }: { status: DiagnosticStatus }) {
  const m = common[useLang()];
  return (
    <Badge tone={status === "ready" ? "done" : status === "capturing" ? "info" : "neutral"}>
      {status === "ready" ? <CheckCircle2 aria-hidden /> : status === "capturing" ? <Radio aria-hidden /> : <Clock aria-hidden />}
      {m.diagnosticStatus[status]}
    </Badge>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const m = common[useLang()];
  const bars = confidence === "high" ? 3 : confidence === "medium" ? 2 : 1;
  return (
    <Badge tone="outline">
      <span aria-hidden className="inline-flex items-end gap-[2px]">
        {[1, 2, 3].map((b) => (
          <span key={b} className={b <= bars ? "bg-brand" : "bg-line"} style={{ width: 3, height: 4 + b * 2, borderRadius: 1 }} />
        ))}
      </span>
      {m.confidence[confidence]}
    </Badge>
  );
}

export function OpportunityStatusBadge({ status }: { status: OpportunityStatus }) {
  const m = common[useLang()];
  return <Badge tone={status === "live" ? "done" : status === "building" ? "info" : status === "requested" ? "outline" : "neutral"}>{m.opportunityStatus[status]}</Badge>;
}

export function PhaseBadge({ phase, className }: { phase: Phase; className?: string }) {
  const m = common[useLang()];
  return (
    <Badge tone="done" className={className}>
      <span className="font-mono text-[0.65rem] uppercase tracking-eyebrow">{m.phaseNumber[phase]}</span>
      {m.phase[phase]}
    </Badge>
  );
}
