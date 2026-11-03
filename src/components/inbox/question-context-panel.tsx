import Link from "next/link";
import { AlertTriangle, ExternalLink } from "lucide-react";
import type { QuestionContext } from "@/lib/types";
import { InputPanel } from "@/components/journey/input-panel";
import { ObservationCard } from "@/components/journey/observation-card";
import { StatusBadge } from "@/components/status";
import { AnswerComposer } from "./answer-composer";
import { describeRecord, humanize } from "@/lib/journey";
import { formatDateTime } from "@/lib/format";
import { orgPath } from "@/lib/utils";

function display(v: unknown): string {
  if (v === null || v === undefined || v === "") return "Not recorded";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object" && !Array.isArray(v)) return describeRecord(v as Record<string, unknown>) || "Structured value";
  return JSON.stringify(v);
}

const MISSING_LABELS: Record<string, string> = {
  exact_request_link: "This question was not saved with an exact link to a specific request, so no affected request is shown.",
};

export function QuestionContextPanel({ org, ctx }: { org: string; ctx: QuestionContext }) {
  const q = ctx.question;
  const c = ctx.case;
  return (
    <div className="flex flex-col gap-5">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={q.status === "open" ? "attention" : "done"} label={humanize(q.status)} />
          <span className="text-xs text-muted">{c.agent_name}</span>
          <span className="text-xs text-muted">· asked {formatDateTime(q.created_at)}</span>
          {q.expires_at ? <span className="text-xs text-muted">· expires {formatDateTime(q.expires_at)}</span> : null}
        </div>
        <h2 className="mt-2 text-xl font-semibold leading-snug">{q.text ?? q.title}</h2>
        <Link href={orgPath(org, "journeys", ctx.agent_id, ctx.case_id)} className="mt-1 inline-flex items-center gap-1 text-sm text-brand hover:underline">
          {c.request?.subject ?? c.title} <ExternalLink className="size-3.5" aria-hidden />
        </Link>
      </header>

      {ctx.version_check.changed_since_question ? (
        <p role="status" className="flex items-start gap-2 rounded-md bg-signal-soft p-3 text-sm text-[rgb(var(--signal-ink))]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          The case changed after this question was asked (question version {ctx.version_check.question_state_version}, case version {ctx.version_check.case_version}). Re-read the journey before answering.
        </p>
      ) : null}

      <section aria-labelledby="ctx-answer">
        <h3 id="ctx-answer" className="mb-2 font-sans text-sm font-semibold">
          Answer
        </h3>
        <AnswerComposer org={org} agentId={ctx.agent_id} caseId={ctx.case_id} questionId={ctx.question_id} options={q.options ?? []} submissionEnabled={ctx.reply_submission_enabled === true} isOpen={q.status === "open"} />
      </section>

      <section aria-labelledby="ctx-why">
        <h3 id="ctx-why" className="mb-2 font-sans text-sm font-semibold">
          Why the agent is asking
        </h3>
        <div className="flex flex-col gap-2 text-sm">
          {c.outcome ? (
            <p>
              <span className="font-medium">{c.outcome.label}.</span> <span className="text-muted">{c.outcome.detail}</span>
            </p>
          ) : null}
          {c.interpretation?.summary ? <p className="text-muted">Saved interpretation: {c.interpretation.summary}</p> : null}
          {c.steps
            .filter((s) => s.tone === "attention" || s.tone === "error")
            .slice(0, 4)
            .map((s) => (
              <p key={s.id} className="rounded-sm border-l-2 border-signal pl-2">
                <span className="font-medium">{s.title}</span> {s.explanation ? <span className="text-muted">— {s.explanation}</span> : null}
              </p>
            ))}
        </div>
      </section>

      {ctx.affected_requests.length || ctx.requested_fields.length ? (
        <section aria-labelledby="ctx-requests">
          <h3 id="ctx-requests" className="mb-2 font-sans text-sm font-semibold">
            Exactly what needs clarifying
          </h3>
          <ul className="flex flex-col gap-2 text-sm">
            {ctx.affected_requests.map((r) => (
              <li key={r.path} className="rounded-md border border-line p-3">
                <p className="font-medium">
                  Request {r.index + 1}
                  {r.intent ? ` · ${humanize(r.intent)}` : ""}
                  {r.property ? ` · ${humanize(r.property)}` : ""}
                </p>
                <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 text-xs">
                  <dt className="text-muted">Reference</dt>
                  <dd>{display(r.reference)}</dd>
                  <dt className="text-muted">Value</dt>
                  <dd>{display(r.value)}</dd>
                  {r.source_quote ? (
                    <>
                      <dt className="text-muted">Source quote</dt>
                      <dd className="italic">“{r.source_quote}”</dd>
                    </>
                  ) : null}
                </dl>
              </li>
            ))}
            {ctx.requested_fields.map((f, i) => (
              <li key={`${f.path}-${i}`} className="text-xs text-muted">
                Field <span className="font-mono">{f.path}</span> ({humanize(f.kind ?? "field")}) — current value: {display(f.current_value)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {ctx.availability.missing.length ? (
        <ul className="flex flex-col gap-1 text-xs text-muted">
          {ctx.availability.missing.map((m) => (
            <li key={m}>• {MISSING_LABELS[m] ?? `Not available: ${humanize(m)}`}</li>
          ))}
        </ul>
      ) : null}

      <section aria-labelledby="ctx-input">
        <h3 id="ctx-input" className="mb-2 font-sans text-sm font-semibold">
          Original input
        </h3>
        <InputPanel request={c.request} />
      </section>

      {ctx.focused_observations.length ? (
        <section aria-labelledby="ctx-obs">
          <h3 id="ctx-obs" className="mb-2 font-sans text-sm font-semibold">
            Related evidence checks
          </h3>
          <div className="flex flex-col gap-2">
            {ctx.focused_observations.map((o) => (
              <ObservationCard key={o.id} o={o} />
            ))}
          </div>
        </section>
      ) : null}
      <p className="text-xs text-muted">Context loaded {formatDateTime(ctx.loaded_at)} from saved records. It stays pinned while you read; reload to fetch the latest case.</p>
    </div>
  );
}
