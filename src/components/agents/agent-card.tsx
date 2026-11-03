import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Agent } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn, orgPath } from "@/lib/utils";
import { number } from "@/lib/format";

export const SOURCE_LABELS: Record<string, string> = {
  legacy_cases: "Case store adapter",
  generic_events: "Business-event stream",
  merged_real_case_events: "Case store + recorded events",
};

export function AgentAvatar({ agent, size = "md" }: { agent: Pick<Agent, "icon" | "name">; size?: "md" | "lg" }) {
  const glyph = agent.icon?.trim() || agent.name.charAt(0).toUpperCase();
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-md bg-brand-soft font-semibold text-brand", size === "lg" ? "size-14 text-2xl" : "size-10 text-lg")}>
      {glyph}
    </span>
  );
}

export function AgentCard({ org, agent, compact = false }: { org: string; agent: Agent; compact?: boolean }) {
  const href = orgPath(org, "agents", agent.id);
  return (
    <Link href={href} className={cn("group flex gap-3 rounded-md border border-line bg-surface transition-colors hover:border-brand/50 focus-visible:border-brand", compact ? "p-3" : "p-4")}>
      <AgentAvatar agent={agent} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-ink group-hover:text-brand">{agent.name}</p>
          {agent.category ? <Badge tone="outline">{agent.category}</Badge> : null}
        </div>
        <p className={cn("mt-0.5 text-sm text-muted", compact ? "line-clamp-1" : "line-clamp-2")}>{agent.purpose}</p>
        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <div className="flex gap-1">
            <dt>Cases</dt>
            <dd className="tabular font-semibold text-ink">{number.format(agent.counts.cases)}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Open questions</dt>
            <dd className={cn("tabular font-semibold", agent.counts.questions_open ? "text-[rgb(var(--signal-ink))]" : "text-ink")}>{agent.counts.questions_open}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Needs review</dt>
            <dd className="tabular font-semibold text-ink">{agent.counts.needs_review}</dd>
          </div>
        </dl>
      </div>
      <ChevronRight className="mt-1 size-4 shrink-0 text-muted group-hover:text-brand" aria-hidden />
    </Link>
  );
}
