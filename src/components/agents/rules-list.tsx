"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/states";
import { useLang } from "@/lib/i18n/client";
import { common } from "@/lib/i18n/common";
import { fmt } from "@/lib/format";
import type { LearnedRule } from "@/lib/api/types";
import { cn, orgPath } from "@/lib/utils";
import { deleteRuleAction, updateRuleAction } from "@/app/o/[org]/agents/actions";
import { agentsMsg } from "./messages";

function RuleRow({ orgId, rule, canEdit }: { orgId: string; rule: LearnedRule; canEdit: boolean }) {
  const lang = useLang();
  const m = agentsMsg[lang].learned;
  const c = common[lang];
  const f = fmt(lang);
  const [editing, setEditing] = useState(false);
  const [condition, setCondition] = useState(rule.condition);
  const [action, setAction] = useState(rule.action);
  const [pending, start] = useTransition();

  return (
    <li className={cn("rounded-lg border border-line bg-surface p-4", !rule.active && "opacity-70")}>
      {editing ? (
        <form
          className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await updateRuleAction(orgId, rule.id, { condition, action });
              if (r.ok) setEditing(false);
            });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`c-${rule.id}`}>{m.when}</Label>
            <Input id={`c-${rule.id}`} value={condition} onChange={(e) => setCondition(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`a-${rule.id}`}>{m.then}</Label>
            <Input id={`a-${rule.id}`} value={action} onChange={(e) => setAction(e.target.value)} required />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              {c.actions.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {c.actions.save}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
              <span className="label-mono">{m.when}</span>
              <span className="text-ink">{rule.condition}</span>
            </p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
              <ArrowRight className="size-3.5 self-center text-brand-ink" aria-hidden />
              <span className="label-mono">{m.then}</span>
              <span className="font-semibold text-ink">{rule.action}</span>
            </p>
            <p className="mt-2 text-xs text-muted">
              {m.createdBy(rule.createdBy, f.dateLong(rule.updatedAt ?? rule.createdAt))}
              <span className="mx-1.5 text-faint">·</span>
              {rule.sourceQuestionId ? (
                <Link href={`${orgPath(orgId, "questions")}?q=${encodeURIComponent(rule.sourceQuestionId)}&status=answered`} className="font-medium text-brand-ink hover:underline">
                  {m.source}
                </Link>
              ) : (
                m.manual
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted">
              <Switch checked={rule.active} disabled={!canEdit || pending} label={m.active} onCheckedChange={(v) => start(async () => void (await updateRuleAction(orgId, rule.id, { active: v })))} />
              {m.active}
            </label>
            {canEdit ? (
              <>
                <Button variant="ghost" size="icon" aria-label={c.actions.edit} onClick={() => setEditing(true)}>
                  <Pencil aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={c.actions.delete}
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm(m.confirmDelete)) start(async () => void (await deleteRuleAction(orgId, rule.id)));
                  }}
                >
                  <Trash2 aria-hidden />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </li>
  );
}

export function RulesList({ orgId, rules, canEdit }: { orgId: string; rules: LearnedRule[]; canEdit: boolean }) {
  const m = agentsMsg[useLang()].learned;
  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm text-muted">{m.intro}</p>
      {rules.length === 0 ? (
        <EmptyState title={m.none} />
      ) : (
        <ul className="flex flex-col gap-3">
          {rules.map((r) => (
            <RuleRow key={r.id} orgId={orgId} rule={r} canEdit={canEdit} />
          ))}
        </ul>
      )}
    </div>
  );
}
