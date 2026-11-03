import type { CaseDetail, JourneyStep, Observation, Question } from "./types";

/**
 * Business-first journey summary.
 *
 * Answers eight questions about a case using ONLY fields recorded by the agent's source adapter.
 * Nothing here generates prose about what happened: each section lists recorded items verbatim
 * (titles/explanations written by the approved producer) or explicitly says "not recorded".
 *
 * Steps are grouped by their recorded event type (generic event store / live bridge) or by the
 * stable step IDs of the legacy case projection. The mapping is deliberately explicit: an event
 * type that is not listed stays in the full chronological timeline only, and is counted as
 * "other recorded steps" — it is never guessed into a category.
 */

export type JourneySectionKey =
  | "received"
  | "understood"
  | "checked"
  | "decided"
  | "alternatives"
  | "human"
  | "achieved"
  | "unresolved";

export type StepPhase = "input" | "interpretation" | "check" | "decision" | "question" | "outcome";

const EVENT_TYPE_PHASE: Record<string, StepPhase> = {
  // input
  input_received: "input",
  input_conflict: "input",
  // interpretation
  intent_interpreted: "interpretation",
  // checks against sources / records / evidence
  source_checked: "check",
  evidence_recorded: "check",
  evidence_checked: "check",
  record_checked: "check",
  comparison_recorded: "check",
  identity_resolved: "check",
  // decisions
  decision_recorded: "decision",
  revalidation_started: "decision",
  revalidation_completed: "decision",
  review_required: "decision",
  // human interaction
  question_opened: "question",
  question_answered: "question",
  answer_reviewed: "question",
  answer_conflict: "question",
  // outcome
  run_completed: "outcome",
  run_failed: "outcome",
  outcome_verified: "outcome",
};

/** Stable step IDs emitted by agent_console/projection.py (legacy case store adapter). */
const LEGACY_ID_PHASE: Record<string, StepPhase> = {
  arrived: "input",
  understood: "interpretation",
  identity: "check",
  capability: "check",
  compared: "check",
  rechecked: "check",
  decision: "decision",
  safety: "outcome",
};

export function stepPhase(step: JourneyStep): StepPhase | null {
  const type = step.event_type ?? step.category;
  if (type && EVENT_TYPE_PHASE[type]) return EVENT_TYPE_PHASE[type];
  if (LEGACY_ID_PHASE[step.id]) return LEGACY_ID_PHASE[step.id] ?? null;
  if (step.id.startsWith("question:") || step.id.startsWith("answered:")) return "question";
  return null;
}

export interface JourneyItem {
  /** Producer-written label, shown verbatim. */
  title: string;
  detail?: string | null;
  tone?: string;
  /** Where the item comes from, e.g. "Recorded step", "Saved interpretation". */
  provenance: string;
  at?: string | null;
}

export interface JourneySection {
  key: JourneySectionKey;
  question: string;
  items: JourneyItem[];
  /** Shown when items is empty. */
  emptyText: string;
}

const isAttention = (tone?: string | null) => tone === "attention" || tone === "error";

function fromStep(step: JourneyStep, provenance = "Recorded step"): JourneyItem {
  return {
    title: step.title,
    detail: step.explanation,
    tone: step.tone ?? undefined,
    provenance: step.based_on ? `${provenance} · ${step.based_on}` : provenance,
    at: step.at,
  };
}

function fromObservation(o: Observation): JourneyItem {
  const parts = [
    o.property_label && o.property_label !== o.title ? o.property_label : null,
    o.explanation,
    o.reported_display && o.database_display ? `${o.incoming_value_label ?? "Reported"}: ${o.reported_display} · ${o.source_label ?? "Source"}: ${o.database_display}` : null,
  ]
    .filter(Boolean)
    .join(" — ");
  return {
    title: o.title,
    detail: parts || null,
    tone: o.tone ?? (o.pending ? "attention" : "done"),
    provenance: o.source_label ? `Saved comparison with ${o.source_label}` : "Saved comparison",
    at: o.saved_at ?? null,
  };
}

function optionLabels(q: Question): string[] {
  return (q.options ?? []).map((o) => (typeof o.label === "string" ? o.label : "")).filter(Boolean);
}

function stringValue(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

/** Render a recorded structured request/action as a compact "key: value" line, without interpreting it. */
export function describeRecord(rec: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, raw] of Object.entries(rec)) {
    let value = stringValue(raw);
    if (value === null && raw && typeof raw === "object" && !Array.isArray(raw)) {
      const nested = Object.entries(raw as Record<string, unknown>)
        .map(([k, v]) => (stringValue(v) ? `${humanize(k)} ${stringValue(v)}` : null))
        .filter(Boolean);
      value = nested.length ? nested.join(", ") : null;
    }
    if (value !== null) parts.push(`${capitalize(humanize(key))}: ${humanize(value)}`);
  }
  return parts.join(" · ");
}

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function humanize(value: string): string {
  // Only machine identifiers (snake_case or a single lower-case word) are reformatted;
  // producer-written prose is left exactly as recorded.
  if (!/^[a-z0-9]+(_[a-z0-9]+)+$/i.test(value) && !/^[a-z][a-z0-9]*$/.test(value)) return value;
  const s = value.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function buildJourneySummary(c: CaseDetail): { sections: JourneySection[]; unclassifiedSteps: number } {
  const steps = c.steps ?? [];
  // When chronology comes from recorded events, the adapter keeps its own case explanation separately.
  const explanatory = c.source_explanations?.length ? c.source_explanations : [];
  const allSteps = [...steps, ...explanatory];
  const byPhase = (phase: StepPhase) => allSteps.filter((s) => stepPhase(s) === phase);
  const unclassifiedSteps = steps.filter((s) => stepPhase(s) === null).length;

  // 1. Received
  const received: JourneyItem[] = [];
  const req = c.request;
  if (req?.subject || req?.channel) {
    received.push({
      title: req.subject ?? "Incoming request",
      detail: [req.channel ? `Channel: ${req.channel}` : null, req.sender ? `From: ${req.sender}` : null].filter(Boolean).join(" · ") || null,
      provenance: "Saved input",
    });
  }
  for (const f of req?.context ?? []) received.push({ title: f.label, detail: f.value, provenance: "Recorded business context" });
  if (req?.attachments?.length) {
    received.push({ title: `${req.attachments.length} attachment(s)`, detail: req.attachments.map((a) => a.name ?? a.filename ?? "Unnamed").join(", "), provenance: "Saved input metadata" });
  }
  for (const s of byPhase("input")) received.push(fromStep(s));

  // 2. Understood
  const understood: JourneyItem[] = [];
  const summary = c.interpretation?.summary ?? req?.summary;
  if (summary) understood.push({ title: summary, provenance: "Saved interpretation" });
  for (const r of c.interpretation?.requests ?? []) {
    const line = describeRecord(r);
    if (line) understood.push({ title: line, provenance: "Saved requested work" });
  }
  for (const s of byPhase("interpretation")) understood.push(fromStep(s));

  // 3. Checked
  const checked: JourneyItem[] = [...byPhase("check").map((s) => fromStep(s)), ...(c.observations ?? []).map(fromObservation)];

  // 4. Decided
  const decided: JourneyItem[] = byPhase("decision").map((s) => fromStep(s));

  // 5. Alternatives, ambiguities, problems
  const alternatives: JourneyItem[] = [];
  for (const s of allSteps) {
    const phase = stepPhase(s);
    if (isAttention(s.tone) && phase !== "question") alternatives.push(fromStep(s, "Recorded step flagged for attention"));
  }
  for (const q of c.questions ?? []) {
    const labels = optionLabels(q);
    if (labels.length > 1) alternatives.push({ title: `Candidate choices: ${labels.join(" · ")}`, detail: q.text ?? q.title, provenance: "Options recorded with the question", tone: "attention" });
  }
  for (const r of c.runs ?? []) {
    if (r.state === "failed") alternatives.push({ title: r.label ?? `Run ${r.id}`, detail: "This recorded run failed.", tone: "error", provenance: "Recorded run" });
  }

  // 6. Human intervention
  const human: JourneyItem[] = (c.questions ?? []).map((q) => ({
    title: q.text ?? q.title,
    detail: q.status === "open" ? "Open — waiting for an authorized person." : `Status: ${humanize(q.status)}`,
    tone: q.status === "open" ? "attention" : "done",
    provenance: "Persistent question",
    at: typeof q.created_at === "string" ? q.created_at : null,
  }));
  for (const a of c.answer_history ?? []) {
    const line = describeRecord(a);
    if (line) human.push({ title: "Recorded human response", detail: line, provenance: "Saved answer history", tone: "done" });
  }

  // 7. Achieved
  const achieved: JourneyItem[] = [];
  if (c.outcome) {
    achieved.push({ title: c.outcome.label, detail: c.outcome.detail, tone: c.tone, provenance: "Recorded outcome" });
  }
  for (const s of byPhase("outcome")) achieved.push(fromStep(s));

  // 8. Unresolved
  const unresolved: JourneyItem[] = [];
  const open = (c.questions ?? []).filter((q) => q.status === "open");
  if (open.length) unresolved.push({ title: `${open.length} open question(s)`, detail: open.map((q) => q.text ?? q.title).join(" · "), tone: "attention", provenance: "Persistent questions" });
  const pending = (c.observations ?? []).filter((o) => o.pending);
  if (pending.length) unresolved.push({ title: `${pending.length} check(s) still need follow-up`, detail: pending.map((o) => o.title).join(" · "), tone: "attention", provenance: "Saved comparisons" });
  if (c.outcome?.effects_status === "unknown") {
    unresolved.push({ title: "Business effect not verified", detail: "No verified evidence of an executed change is recorded for this case.", tone: "attention", provenance: "Effect status" });
  }
  if (c.next_action && (open.length || pending.length || isAttention(c.tone))) {
    unresolved.push({ title: c.next_action, provenance: "Recommended next action from the source adapter", tone: "neutral" });
  }

  const sections: JourneySection[] = [
    { key: "received", question: "What the agent received", items: received, emptyText: "No input details were recorded or they are hidden for this session." },
    { key: "understood", question: "What it understood", items: understood, emptyText: "No saved interpretation is recorded." },
    { key: "checked", question: "Sources and records it checked", items: checked, emptyText: "No source checks or comparisons are recorded." },
    { key: "decided", question: "Decisions it recorded", items: decided, emptyText: "No decision step is recorded." },
    { key: "alternatives", question: "Ambiguities, alternatives and problems", items: alternatives, emptyText: "No ambiguity or problem was recorded." },
    { key: "human", question: "Human intervention", items: human, emptyText: "No human question was needed." },
    { key: "achieved", question: "What it ultimately achieved", items: achieved, emptyText: "No outcome is recorded yet." },
    { key: "unresolved", question: "What remains unresolved", items: unresolved, emptyText: "Nothing is recorded as outstanding." },
  ];
  return { sections, unclassifiedSteps };
}

export const EFFECT_LABELS: Record<string, { label: string; detail: string; tone: string }> = {
  executed: { label: "Change executed (with evidence)", detail: "A verified outcome with an evidence reference was recorded.", tone: "done" },
  not_executed: { label: "No business change made", detail: "The agent did not execute a change in any business system.", tone: "neutral" },
  unknown: { label: "Effect not verified", detail: "No verified evidence of an executed change is recorded.", tone: "attention" },
};
