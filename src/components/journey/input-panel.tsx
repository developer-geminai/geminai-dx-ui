import { Paperclip, EyeOff } from "lucide-react";
import type { CaseRequest } from "@/lib/types";
import { describeRecord } from "@/lib/journey";
import { formatDateTime } from "@/lib/format";

/** The original input as saved by the agent's source. Body text is rendered as plain text (never HTML). */
export function InputPanel({ request }: { request?: CaseRequest }) {
  if (!request) return <p className="text-sm italic text-muted">No input was recorded.</p>;
  const hidden = request.subject === null && request.body === null;
  return (
    <div className="flex flex-col gap-3 text-sm">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
        {request.channel ? (
          <>
            <dt className="text-muted">Channel</dt>
            <dd className="capitalize">{request.channel}</dd>
          </>
        ) : null}
        {request.sender ? (
          <>
            <dt className="text-muted">From</dt>
            <dd className="break-words">{request.sender}</dd>
          </>
        ) : null}
        {request.received_at ? (
          <>
            <dt className="text-muted">Received</dt>
            <dd>{formatDateTime(request.received_at)}</dd>
          </>
        ) : null}
        {request.message_id ? (
          <>
            <dt className="text-muted">Reference</dt>
            <dd className="break-all font-mono text-xs leading-5">{request.message_id}</dd>
          </>
        ) : null}
      </dl>
      {hidden ? (
        <p className="flex items-center gap-2 rounded-md bg-paper-alt p-3 text-muted">
          <EyeOff className="size-4" aria-hidden /> Source contents are hidden for this backend session.
        </p>
      ) : (
        <div className="rounded-md border border-line bg-paper-alt/60 p-3">
          {request.subject ? <p className="font-semibold text-ink">{request.subject}</p> : null}
          {request.body ? <p className="mt-1.5 max-h-72 overflow-auto whitespace-pre-wrap break-words text-ink/90">{request.body}</p> : null}
          {!request.subject && !request.body && request.summary ? <p className="text-ink/90">{request.summary}</p> : null}
        </div>
      )}
      {request.context?.length ? (
        <div>
          <h4 className="mb-1.5 font-sans text-xs font-semibold uppercase tracking-wide text-muted">Business context</h4>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
            {request.context.map((f, i) => (
              <div key={`${f.label}-${i}`} className="contents">
                <dt className="text-muted">{f.label}</dt>
                <dd className="break-words font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      {request.actions?.length ? (
        <div>
          <h4 className="mb-1.5 font-sans text-xs font-semibold uppercase tracking-wide text-muted">Requested work (as saved)</h4>
          <ul className="flex flex-col gap-1">
            {request.actions.map((a, i) => (
              <li key={i} className="rounded-sm bg-paper-alt px-2.5 py-1.5 text-xs">
                {describeRecord(a) || "Recorded action without displayable fields"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {request.attachments?.length ? (
        <div>
          <h4 className="mb-1.5 font-sans text-xs font-semibold uppercase tracking-wide text-muted">Attachments</h4>
          <ul className="flex flex-col gap-1">
            {request.attachments.map((a, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <Paperclip className="size-3.5 text-muted" aria-hidden />
                <span className="break-all">{a.name ?? a.filename ?? "Unnamed attachment"}</span>
                {a.content_type ? <span className="text-muted">{a.content_type}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
