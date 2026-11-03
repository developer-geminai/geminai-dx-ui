import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CaseSummary } from "@/lib/types";
import { EffectBadge, StatusBadge, effectFromSummary } from "@/components/status";
import { EmptyState } from "@/components/ui/states";
import { orgPath } from "@/lib/utils";
import { formatDateTime, relativeTime } from "@/lib/format";

export function caseHref(org: string, c: Pick<CaseSummary, "agent_id" | "id">) {
  return orgPath(org, "journeys", c.agent_id, c.id);
}

/** Responsive case list: a table on wide screens, stacked rows on narrow ones. Domain-neutral columns only. */
export function CaseList({ org, cases, showAgent = true, emptyTitle = "No cases match" }: { org: string; cases: CaseSummary[]; showAgent?: boolean; emptyTitle?: string }) {
  if (!cases.length) return <EmptyState title={emptyTitle}>Try another agent, status or search term.</EmptyState>;
  return (
    <ul className="divide-y divide-line" role="list">
      {cases.map((c) => (
        <li key={`${c.agent_id}/${c.id}`}>
          <Link href={caseHref(org, c)} className="group flex items-center gap-4 px-1 py-3 transition-colors hover:bg-paper-alt/70 focus-visible:bg-paper-alt md:px-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink group-hover:text-brand">{c.subject && c.subject !== c.title ? c.subject : c.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                {showAgent ? <span className="font-medium text-ink/80">{c.agent_name}</span> : null}
                {showAgent ? <span aria-hidden>·</span> : null}
                <span className="font-mono">{c.id}</span>
                {c.subject && c.subject !== c.title ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="truncate">{c.title}</span>
                  </>
                ) : null}
              </p>
            </div>
            <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
              <StatusBadge tone={c.tone} label={c.status_label} title={c.status_description} />
              <EffectBadge status={effectFromSummary(c.effects_executed)} />
            </div>
            <time className="hidden w-24 shrink-0 text-right text-xs text-muted lg:block" dateTime={c.updated_at ?? undefined} title={formatDateTime(c.updated_at)}>
              {relativeTime(c.updated_at)}
            </time>
            <ChevronRight className="size-4 shrink-0 text-muted group-hover:text-brand" aria-hidden />
          </Link>
          <div className="flex gap-2 px-1 pb-3 sm:hidden">
            <StatusBadge tone={c.tone} label={c.status_label} />
          </div>
        </li>
      ))}
    </ul>
  );
}
