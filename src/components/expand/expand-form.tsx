"use client";
import { useState, useTransition } from "react";
import { CalendarClock, Check, Building2, Sparkles } from "lucide-react";
import type { Opportunity, ServiceRequestKind } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea, Input } from "@/components/ui/form";
import { useLang } from "@/lib/i18n/client";
import { createServiceRequestAction } from "@/app/actions";
import { cn } from "@/lib/utils";
import { expandMessages } from "./messages";

const ICONS: Record<ServiceRequestKind, typeof Sparkles> = { new_department: Building2, automate_opportunity: Sparkles, semester_review: CalendarClock };

export function ExpandForm({ orgId, opportunities, canRequest, initialKind, initialOpportunity }: { orgId: string; opportunities: Opportunity[]; canRequest: boolean; initialKind?: ServiceRequestKind; initialOpportunity?: string }) {
  const m = expandMessages[useLang()];
  const [kind, setKind] = useState<ServiceRequestKind>(initialKind ?? (opportunities.length ? "automate_opportunity" : "new_department"));
  const [opportunityId, setOpportunityId] = useState(initialOpportunity ?? opportunities[0]?.id ?? "");
  const [department, setDepartment] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  if (sent) {
    return (
      <div className="rounded-lg border border-brand-line bg-brand-soft/60 p-6">
        <p className="flex items-center gap-2 font-display text-xl font-medium">
          <Check className="size-5 text-brand-ink" aria-hidden />
          {m.sentTitle}
        </p>
        <p className="mt-1 text-sm text-muted">{m.sentBody}</p>
        <Button className="mt-4" variant="line" size="sm" onClick={() => { setSent(false); setNote(""); }}>
          {m.another}
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const op = opportunities.find((o) => o.id === opportunityId);
          const r = await createServiceRequestAction(orgId, {
            kind,
            note: note || (kind === "automate_opportunity" ? op?.workflow ?? "" : kind === "new_department" ? department : m.options.semester_review.title),
            opportunityId: kind === "automate_opportunity" ? opportunityId : undefined,
            department: kind === "new_department" ? department : undefined,
          });
          if (r.ok) setSent(true);
        });
      }}
    >
      <fieldset>
        <legend className="label-mono mb-2">{m.what}</legend>
        <div className="grid gap-3 md:grid-cols-3">
          {(Object.keys(ICONS) as ServiceRequestKind[]).map((k) => {
            const Icon = ICONS[k];
            const disabled = k === "automate_opportunity" && !opportunities.length;
            return (
              <label key={k} className={cn("flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-colors", kind === k ? "border-brand bg-brand-soft/50" : "border-line bg-surface hover:border-brand/50", disabled && "cursor-not-allowed opacity-50")}>
                <input type="radio" name="kind" value={k} checked={kind === k} disabled={disabled} onChange={() => setKind(k)} className="sr-only" />
                <Icon className="size-5 text-brand-ink" aria-hidden />
                <span className="font-medium text-ink">{m.options[k].title}</span>
                <span className="text-sm text-muted">{m.options[k].desc}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {kind === "automate_opportunity" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="opp">{m.opportunity}</Label>
          <Select id="opp" value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)}>
            {opportunities.map((o) => (
              <option key={o.id} value={o.id}>
                {o.workflow} · {o.department}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      {kind === "new_department" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dept">{m.department}</Label>
          <Input id="dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder={m.departmentPh} required />
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">{m.note}</Label>
        <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={m.notePh} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || !canRequest}>
          {m.submit}
        </Button>
        <p className="text-xs text-muted">{canRequest ? m.reviewNote : m.noPermission}</p>
      </div>
    </form>
  );
}
