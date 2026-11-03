"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Check, ChevronDown, Clock3, Copy, Repeat2, Timer } from "lucide-react";
import type { Opportunity } from "@/lib/api/types";
import { AutomateButton } from "@/components/automate-button";
import { Button } from "@/components/ui/button";
import { ConfidenceBadge, OpportunityStatusBadge } from "@/components/status-badges";
import { useLang } from "@/lib/i18n/client";
import { fmt } from "@/lib/format";
import { cn, orgPath } from "@/lib/utils";
import { diagMsg } from "./messages";

export function SequenceChips({ steps, className }: { steps: string[]; className?: string }) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {steps.map((s, i) => (
        <li key={`${s}-${i}`} className="flex items-center gap-1.5">
          <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-xs text-ink-2">{s}</span>
          {i < steps.length - 1 ? <ArrowRight className="size-3 text-faint" aria-hidden /> : null}
        </li>
      ))}
    </ol>
  );
}

function OpportunityAction({ orgId, o, canRequest }: { orgId: string; o: Opportunity; canRequest: boolean }) {
  const m = diagMsg[useLang()].results;
  if ((o.status === "building" || o.status === "live") && o.agentId) {
    return (
      <Button asChild variant="line" size="sm">
        <Link href={orgPath(orgId, "agents", o.agentId)}>
          <Bot aria-hidden />
          {m.seeAgent}
        </Link>
      </Button>
    );
  }
  if (!canRequest) return null;
  return <AutomateButton orgId={orgId} opportunityId={o.id} workflow={o.workflow} requested={o.status === "requested"} size="sm" />;
}

export function OpportunityAccordion({ orgId, opportunities, rate, canRequest }: { orgId: string; opportunities: Opportunity[]; rate: number | null; canRequest: boolean }) {
  const lang = useLang();
  const m = diagMsg[lang].results;
  const f = fmt(lang);
  const [openId, setOpenId] = useState<string>(opportunities[0]?.id ?? "");
  const wk = lang === "es" ? "/sem" : "/wk";
  const yr = lang === "es" ? "/año" : "/yr";

  return (
    <div className="divide-y divide-line rounded-lg border border-line bg-surface">
      {opportunities.map((o) => {
        const open = openId === o.id;
        return (
          <section key={o.id}>
            <button type="button" aria-expanded={open} onClick={() => setOpenId(open ? "" : o.id)} className="flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-paper/60">
              <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-ink">{o.rank}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <strong className="font-semibold text-ink">{o.workflow}</strong>
                  <OpportunityStatusBadge status={o.status} />
                </span>
                <span className="mt-0.5 block text-sm text-muted">{o.department}</span>
                <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3.5 text-muted" aria-hidden />
                    {f.hm(o.weeklyHours)}
                    {wk}
                  </span>
                  {rate ? (
                    <span className="inline-flex items-center gap-1">
                      {f.eur(o.weeklyHours * 52 * rate)}
                      {yr}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    <Repeat2 className="size-3.5 text-muted" aria-hidden />
                    {m.perWeek(o.frequencyPerWeek)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Copy className="size-3.5 text-muted" aria-hidden />
                    {o.copyPasteRate} % {m.copyRate.toLowerCase()}
                  </span>
                </span>
              </span>
              <ChevronDown className={cn("mt-1 size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} aria-hidden />
            </button>
            {open ? (
              <div className="grid gap-5 border-t border-line bg-paper/40 px-5 py-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                <div>
                  <p className="text-sm text-ink-2">{o.description}</p>
                  <SequenceChips steps={o.sequence} className="mt-3" />
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="label-mono">{m.avgDuration}</dt>
                      <dd className="tabular mt-1 font-medium">{f.duration(o.avgDurationMin * 60)}</dd>
                    </div>
                    <div>
                      <dt className="label-mono">{m.frequency}</dt>
                      <dd className="tabular mt-1 font-medium">{m.perWeek(o.frequencyPerWeek)}</dd>
                    </div>
                    <div>
                      <dt className="label-mono">{m.copyRate}</dt>
                      <dd className="tabular mt-1 font-medium">{o.copyPasteRate} %</dd>
                    </div>
                    <div>
                      <dt className="label-mono">{m.timeToLive}</dt>
                      <dd className="mt-1 inline-flex items-center gap-1 font-medium">
                        <Timer className="size-3.5 text-muted" aria-hidden />
                        {o.timeToLive}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <ConfidenceBadge confidence={o.confidence} />
                    <OpportunityAction orgId={orgId} o={o} canRequest={canRequest} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
                  {[
                    { title: m.need, items: o.whatWeNeed },
                    { title: m.deliver, items: o.whatWeDeliver },
                  ].map((b) => (
                    <div key={b.title}>
                      <p className="label-mono mb-2">{b.title}</p>
                      <ul className="flex flex-col gap-1.5 text-sm text-ink-2">
                        {b.items.map((it) => (
                          <li key={it} className="flex gap-2">
                            <Check className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
                            {it}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

export { OpportunityAction };
