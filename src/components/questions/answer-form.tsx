"use client";
import { useState, useTransition } from "react";
import { Check, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/form";
import { useLang } from "@/lib/i18n/client";
import type { Question } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { answerQuestionAction } from "@/app/o/[org]/questions/actions";
import { questionsMsg } from "./messages";

const OTHER = "__other__";

/** Options as radios + free text, "Aplicar siempre que pase esto" checked by default. Approvals: Aprobar / Rechazar. */
export function AnswerForm({ orgId, question, disabled }: { orgId: string; question: Question; disabled?: boolean }) {
  const m = questionsMsg[useLang()];
  const [choice, setChoice] = useState<string>(question.options[0] ?? (question.allowFreeText ? OTHER : ""));
  const [text, setText] = useState("");
  const [applyAlways, setApplyAlways] = useState(true);
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);

  const submit = (value: string, always: boolean) =>
    start(async () => {
      setError(false);
      const r = await answerQuestionAction(orgId, question.id, { value, applyAlways: always });
      if (!r.ok) setError(true);
    });

  if (question.kind === "approval") {
    const approve = question.options.find((o) => /aprob|approv/i.test(o)) ?? question.options[0] ?? m.approve;
    const reject = question.options.find((o) => /rechaz|reject/i.test(o)) ?? m.reject;
    return (
      <div>
        <p className="mb-3 text-sm text-muted">{m.approvalNote}</p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={disabled || pending} onClick={() => submit(approve, false)}>
            <Check aria-hidden />
            {approve}
          </Button>
          <Button variant="danger" disabled={disabled || pending} onClick={() => submit(reject, false)}>
            <X aria-hidden />
            {reject}
          </Button>
        </div>
        {error ? <p role="alert" className="mt-2 text-sm text-danger">{m.noPermission}</p> : null}
      </div>
    );
  }

  const value = choice === OTHER ? text.trim() : choice;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value) submit(value, applyAlways);
      }}
    >
      <fieldset disabled={disabled || pending}>
        <legend className="label-mono mb-2">{m.options}</legend>
        <div className="flex flex-col gap-2">
          {question.options.map((o) => (
            <label key={o} className={cn("flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors", choice === o ? "border-brand bg-brand-soft/60 text-ink" : "border-line bg-surface hover:border-muted")}>
              <input type="radio" name={`opt-${question.id}`} value={o} checked={choice === o} onChange={() => setChoice(o)} className="accent-[rgb(var(--brand))]" />
              {o}
            </label>
          ))}
          {question.allowFreeText ? (
            <label className={cn("flex cursor-pointer flex-col gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors", choice === OTHER ? "border-brand bg-brand-soft/60" : "border-line bg-surface hover:border-muted")}>
              <span className="flex items-center gap-3">
                <input type="radio" name={`opt-${question.id}`} value={OTHER} checked={choice === OTHER} onChange={() => setChoice(OTHER)} className="accent-[rgb(var(--brand))]" />
                {m.other}
              </span>
              {choice === OTHER ? (
                <>
                  <Label htmlFor={`free-${question.id}`} className="sr-only">
                    {m.other}
                  </Label>
                  <Textarea id={`free-${question.id}`} value={text} onChange={(e) => setText(e.target.value)} placeholder={m.otherPlaceholder} className="min-h-[72px]" autoFocus />
                </>
              ) : null}
            </label>
          ) : null}
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md bg-paper px-3 py-2.5">
          <input type="checkbox" checked={applyAlways} onChange={(e) => setApplyAlways(e.target.checked)} className="mt-0.5 size-4 accent-[rgb(var(--brand))]" />
          <span>
            <span className="block text-sm font-medium text-ink">{m.applyAlways}</span>
            <span className="block text-xs text-muted">{m.applyAlwaysHint}</span>
          </span>
        </label>

        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" disabled={!value}>
            <Send aria-hidden />
            {pending ? m.sending : m.send}
          </Button>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {m.noPermission}
            </p>
          ) : null}
        </div>
      </fieldset>
    </form>
  );
}
