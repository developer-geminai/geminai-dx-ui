import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import type { Question } from "@/lib/types";
import { orgPath, withParams } from "@/lib/utils";
import { relativeTime, formatDateTime } from "@/lib/format";

export function questionKey(q: Pick<Question, "agent_id" | "case_id" | "id">) {
  return `${q.agent_id}::${q.case_id}::${q.id}`;
}

export function QuestionPreviewList({ org, questions, more = 0, agent }: { org: string; questions: Question[]; more?: number; agent?: string }) {
  const inbox = `${orgPath(org)}/inbox`;
  return (
    <div>
      <ul className="divide-y divide-line" role="list">
        {questions.map((q) => (
          <li key={questionKey(q)}>
            <Link href={withParams(inbox, { agent, question: questionKey(q) })} className="group flex gap-3 py-3 hover:bg-paper-alt/60 focus-visible:bg-paper-alt md:px-2">
              <MessageCircleQuestion className="mt-0.5 size-5 shrink-0 text-signal" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-medium text-ink group-hover:text-brand">{q.text ?? q.title}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted">
                  <span className="font-medium text-ink/80">{q.agent_name}</span>
                  <span aria-hidden>·</span>
                  <span className="truncate">{q.source_subject ?? q.case_id}</span>
                  {(q.option_count ?? 0) > 0 ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{q.option_count} options</span>
                    </>
                  ) : null}
                </p>
              </div>
              <time className="hidden shrink-0 text-xs text-muted sm:block" title={formatDateTime(q.created_at)}>
                {relativeTime(q.created_at)}
              </time>
            </Link>
          </li>
        ))}
      </ul>
      {more > 0 ? (
        <Link href={withParams(inbox, { agent })} className="mt-2 inline-block text-sm font-medium text-brand hover:underline">
          {more} more in the Human Inbox →
        </Link>
      ) : null}
    </div>
  );
}
