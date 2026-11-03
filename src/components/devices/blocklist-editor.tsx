"use client";
import { useOptimistic, useState, useTransition } from "react";
import { AppWindow, Globe, KeyRound, MessageCircle, Music, Plus, Send, ShieldAlert, Trash2 } from "lucide-react";
import type { BlockRule } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { useLang } from "@/lib/i18n/client";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { addBlockRuleAction, deleteBlockRuleAction, setBlockRuleAnalyzeAction } from "@/app/o/[org]/devices/actions";
import { devMsg } from "./messages";

const ICONS: Record<string, typeof Globe> = { "message-circle": MessageCircle, send: Send, "key-round": KeyRound, music: Music };

function RuleIcon({ rule }: { rule: BlockRule }) {
  if (rule.kind === "category") return <ShieldAlert className="size-4 text-muted" aria-hidden />;
  if (rule.kind === "url") return <Globe className="size-4 text-muted" aria-hidden />;
  const Icon = rule.icon ? ICONS[rule.icon] : undefined;
  if (Icon) return <Icon className="size-4 text-muted" aria-hidden />;
  const initials = rule.label.replace(/\.exe$/i, "").slice(0, 2).toUpperCase();
  return initials ? (
    <span aria-hidden className="flex size-5 items-center justify-center rounded-[4px] bg-paper-alt font-mono text-[0.6rem] font-semibold text-muted">
      {initials}
    </span>
  ) : (
    <AppWindow className="size-4 text-muted" aria-hidden />
  );
}

/** Segmented "No analizar / Analizar" — the same two options as the contract. */
export function AnalyzeToggle({ value, onChange, disabled, label }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  const m = devMsg[useLang()].block;
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 rounded-sm border border-line p-0.5 text-xs font-semibold">
      {[
        { v: false, l: m.doNotAnalyze },
        { v: true, l: m.analyze },
      ].map((o) => (
        <button
          key={String(o.v)}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          disabled={disabled}
          onClick={() => value !== o.v && onChange(o.v)}
          className={cn(
            "rounded-[4px] px-2.5 py-1 transition-colors disabled:cursor-not-allowed",
            value === o.v ? (o.v ? "bg-brand text-brand-on" : "bg-ink text-paper") : "text-muted hover:text-ink",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function RuleRow({ orgId, rule, editable }: { orgId: string; rule: BlockRule; editable: boolean }) {
  const lang = useLang();
  const m = devMsg[lang].block;
  const f = fmt(lang);
  const [analyze, setAnalyze] = useOptimistic(rule.analyze);
  const [pending, start] = useTransition();
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <RuleIcon rule={rule} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium text-ink", rule.kind === "url" && "font-mono")}>{rule.label}</p>
        {rule.description ? <p className="text-xs text-muted">{rule.description}</p> : null}
        <p className="text-[0.7rem] text-faint">{m.changedBy(rule.author, f.date(rule.updatedAt))}</p>
      </div>
      <AnalyzeToggle
        label={rule.label}
        value={analyze}
        disabled={!editable || pending}
        onChange={(v) =>
          start(async () => {
            setAnalyze(v);
            await setBlockRuleAnalyzeAction(orgId, rule.id, v);
          })
        }
      />
      {rule.kind !== "category" && editable ? (
        <Button variant="ghost" size="icon" aria-label={m.remove(rule.label)} disabled={pending} onClick={() => start(async () => void (await deleteBlockRuleAction(orgId, rule.id)))}>
          <Trash2 aria-hidden />
        </Button>
      ) : null}
    </li>
  );
}

function AddRule({ orgId, kind }: { orgId: string; kind: "app" | "url" }) {
  const m = devMsg[useLang()].block;
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  const id = `add-${kind}`;
  return (
    <form
      className="flex gap-2 pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        start(async () => {
          const r = await addBlockRuleAction(orgId, kind, value);
          if (r.ok) setValue("");
        });
      }}
    >
      <label htmlFor={id} className="sr-only">
        {kind === "app" ? m.addApp : m.addUrl}
      </label>
      <Input id={id} value={value} onChange={(e) => setValue(e.target.value)} placeholder={kind === "app" ? m.addAppPlaceholder : m.addUrlPlaceholder} className="max-w-sm" />
      <Button type="submit" variant="line" disabled={pending || !value.trim()}>
        <Plus aria-hidden />
        {m.add}
      </Button>
    </form>
  );
}

export function BlocklistEditor({ orgId, rules, editable }: { orgId: string; rules: BlockRule[]; editable: boolean }) {
  const m = devMsg[useLang()].block;
  const groups = [
    { kind: "category" as const, title: m.categories, hint: m.categoriesHint },
    { kind: "app" as const, title: m.apps, hint: m.appsHint },
    { kind: "url" as const, title: m.urls, hint: m.urlsHint },
  ];
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-3xl text-sm text-ink-2">{m.intro}</p>
      {!editable ? <p className="text-sm text-muted">{m.readOnly}</p> : null}
      {groups.map((g) => (
        <section key={g.kind} className="rounded-lg border border-line bg-surface px-5 py-4">
          <h2 className="font-display text-lg font-medium">{g.title}</h2>
          <p className="text-sm text-muted">{g.hint}</p>
          {g.kind === "url" ? <p className="mt-1 text-xs text-faint">{m.urlsPending}</p> : null}
          <ul className="mt-2 divide-y divide-line">
            {rules
              .filter((r) => r.kind === g.kind)
              .map((r) => (
                <RuleRow key={r.id} orgId={orgId} rule={r} editable={editable} />
              ))}
          </ul>
          {g.kind !== "category" && editable ? <AddRule orgId={orgId} kind={g.kind} /> : null}
        </section>
      ))}
    </div>
  );
}
