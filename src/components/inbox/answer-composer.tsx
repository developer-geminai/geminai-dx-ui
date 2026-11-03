"use client";
import { useEffect, useState } from "react";
import { Copy, Lock, Send } from "lucide-react";
import type { QuestionOption } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/form";

export function draftKey(org: string, agentId: string, caseId: string, questionId: string) {
  return `gdx-cc-draft::${org}::${agentId}::${caseId}::${questionId}`;
}

/**
 * Answer drafting. Submission is enabled ONLY when the backend reports reply_submission_enabled.
 * The current backend is read-only, so drafts stay in this browser tab (sessionStorage), isolated
 * per organization/agent/case/question, and can be copied into the approved human workflow.
 */
export function AnswerComposer({
  org,
  agentId,
  caseId,
  questionId,
  options,
  submissionEnabled,
  isOpen,
}: {
  org: string;
  agentId: string;
  caseId: string;
  questionId: string;
  options: QuestionOption[];
  submissionEnabled: boolean;
  isOpen: boolean;
}) {
  const key = draftKey(org, agentId, caseId, questionId);
  const [choice, setChoice] = useState("");
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) ?? "{}") as { choice?: string; text?: string };
      setChoice(saved.choice ?? "");
      setText(saved.text ?? "");
    } catch {
      setChoice("");
      setText("");
    }
    setCopied(false);
  }, [key]);

  function persist(next: { choice?: string; text?: string }) {
    try {
      sessionStorage.setItem(key, JSON.stringify({ choice: next.choice ?? choice, text: next.text ?? text }));
    } catch {
      /* storage unavailable: draft stays in memory */
    }
  }

  const chosen = options.find((o) => String(o.id ?? o.option_id) === choice);
  const summary = [chosen ? `Selected option: ${chosen.label ?? choice}` : null, text.trim() || null].filter(Boolean).join("\n");

  if (!isOpen) return <p className="text-sm text-muted">This question is no longer open.</p>;

  return (
    <div className="flex flex-col gap-3">
      {options.length ? (
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-muted">Candidate answers recorded with the question</legend>
          <div className="flex flex-col gap-1.5">
            {options.map((o, i) => {
              const id = String(o.id ?? o.option_id ?? i);
              return (
                <label key={id} className="flex cursor-pointer items-center gap-2 rounded-md border border-line px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft/60">
                  <input
                    type="radio"
                    name={`choice-${key}`}
                    value={id}
                    checked={choice === id}
                    onChange={() => {
                      setChoice(id);
                      persist({ choice: id });
                    }}
                    className="accent-[rgb(var(--brand))]"
                  />
                  {String(o.label ?? id)}
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`answer-${key}`}>Your answer</Label>
        <Textarea
          id={`answer-${key}`}
          value={text}
          placeholder="Write the clarification the agent needs…"
          onChange={(e) => {
            setText(e.target.value);
            persist({ text: e.target.value });
          }}
        />
      </div>
      {!submissionEnabled ? (
        <p className="flex items-start gap-2 rounded-md bg-paper-alt p-3 text-xs text-muted">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Answer submission is not enabled by this agent&rsquo;s backend. Your draft stays in this browser tab only; copy it into the approved human-review workflow. No message is sent and no case is changed from here.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={!submissionEnabled} title={submissionEnabled ? undefined : "Not enabled by the backend"}>
          <Send aria-hidden /> Submit answer
        </Button>
        <Button
          type="button"
          variant="line"
          disabled={!summary}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(summary);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          <Copy aria-hidden /> {copied ? "Copied" : "Copy draft"}
        </Button>
      </div>
    </div>
  );
}
