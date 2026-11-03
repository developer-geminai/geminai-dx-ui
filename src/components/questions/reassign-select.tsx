"use client";
import { useTransition } from "react";
import { Select } from "@/components/ui/form";
import { useLang } from "@/lib/i18n/client";
import type { Assignee } from "@/lib/api/types";
import { reassignQuestionAction } from "@/app/o/[org]/questions/actions";
import { questionsMsg } from "./messages";

export function ReassignSelect({ orgId, questionId, current, options, disabled }: { orgId: string; questionId: string; current: Assignee; options: Assignee[]; disabled?: boolean }) {
  const m = questionsMsg[useLang()];
  const [pending, start] = useTransition();
  const key = (a: Assignee) => `${a.type}:${a.id}`;
  const all = options.some((o) => key(o) === key(current)) ? options : [current, ...options];
  return (
    <Select
      aria-label={m.reassign}
      className="h-8 w-auto min-w-[12rem] text-sm"
      value={key(current)}
      disabled={disabled || pending}
      onChange={(e) => {
        const next = all.find((o) => key(o) === e.target.value);
        if (next) start(async () => void (await reassignQuestionAction(orgId, questionId, next)));
      }}
    >
      {all.map((o) => (
        <option key={key(o)} value={key(o)}>
          {o.type === "role" ? m.roleOption(o.label) : o.label}
        </option>
      ))}
    </Select>
  );
}
