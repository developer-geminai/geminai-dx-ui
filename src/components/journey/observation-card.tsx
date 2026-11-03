import type { Observation } from "@/lib/types";
import { StatusBadge } from "@/components/status";
import { JsonBlock } from "./json-block";

/** A saved comparison between reported information and a business source. Labels come from the adapter. */
export function ObservationCard({ o }: { o: Observation }) {
  const tone = o.tone ?? (o.pending ? "attention" : "done");
  const verifiedLabel = o.pending ? "Needs follow-up" : o.verified ? "Verified" : "Resolved";
  return (
    <article className="rounded-md border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-sans text-sm font-semibold text-ink">{o.title}</h4>
          {o.property_label || o.reference_label ? (
            <p className="mt-0.5 text-xs text-muted">{[o.property_label, o.reference_label].filter(Boolean).join(" · ")}</p>
          ) : null}
        </div>
        <StatusBadge tone={tone} label={o.status_label && o.status_label !== o.title ? o.status_label : verifiedLabel} />
      </div>
      {o.explanation ? <p className="mt-2 text-sm text-muted">{o.explanation}</p> : null}
      {o.reported_display || o.database_display ? (
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-sm bg-paper-alt p-2.5">
            <dt className="text-[0.7rem] uppercase tracking-wide text-muted">{o.incoming_value_label ?? "Reported value"}</dt>
            <dd className="mt-0.5 break-words text-sm font-medium">{o.reported_display ?? "—"}</dd>
          </div>
          <div className="rounded-sm bg-paper-alt p-2.5">
            <dt className="text-[0.7rem] uppercase tracking-wide text-muted">{o.source_label ?? "Source"}</dt>
            <dd className="mt-0.5 break-words text-sm font-medium">{o.database_display ?? "—"}</dd>
          </div>
        </dl>
      ) : null}
      {o.evidence_quote ? (
        <blockquote className="mt-3 border-l-2 border-brand pl-3 text-sm italic text-ink/90">
          <span className="sr-only">{o.source_quote_label ?? "Evidence"}: </span>“{o.evidence_quote}”
          {o.evidence_valid === false ? <span className="ml-2 not-italic text-xs text-[rgb(var(--signal-ink))]">(anchor not validated)</span> : null}
        </blockquote>
      ) : null}
      {o.check_details ? (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer font-medium text-brand">Saved check details</summary>
          <JsonBlock value={o.check_details} className="mt-2" />
        </details>
      ) : null}
    </article>
  );
}
