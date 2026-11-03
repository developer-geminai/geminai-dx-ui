import type { Metadata } from "next";
import Link from "next/link";
import { Bot, CheckCircle2, Clock, Hourglass, UserRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { QuestionKindBadge, QuestionStatusBadge } from "@/components/status-badges";
import { sectionGate } from "@/components/locked-section";
import { AnswerForm } from "@/components/questions/answer-form";
import { ReassignSelect } from "@/components/questions/reassign-select";
import { questionsMsg } from "@/components/questions/messages";
import { api } from "@/lib/api";
import type { Assignee, Question, QuestionStatus } from "@/lib/api/types";
import type { Lang } from "@/lib/i18n";
import { requireOrg } from "@/lib/server/session";
import { can } from "@/lib/permissions";
import { common } from "@/lib/i18n/common";
import { fmt } from "@/lib/format";
import { cn, first, orgPath, withParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Preguntas" };

function Detail({ orgId, q, lang, canAnswer, canReassign, assignees }: { orgId: string; q: Question; lang: Lang; canAnswer: boolean; canReassign: boolean; assignees: Assignee[] }) {
  const m = questionsMsg[lang];
  const c = common[lang];
  const f = fmt(lang);
  const overdue = q.status === "pending" && new Date(q.dueAt).getTime() < Date.now();
  const runHref = `${orgPath(orgId, "agents", q.agentId)}?tab=ejecuciones&run=${encodeURIComponent(q.runId)}`;
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <QuestionKindBadge kind={q.kind} />
          <QuestionStatusBadge status={q.status} />
          <span className="text-xs text-muted">
            {m.received} {f.relative(q.createdAt)}
          </span>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="label-mono">{lang === "es" ? "Agente" : "Agent"}</dt>
            <dd>
              <Link href={orgPath(orgId, "agents", q.agentId)} className="font-medium text-ink hover:underline">
                {q.agentName}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="label-mono">{m.run}</dt>
            <dd>
              <Link href={runHref} className="font-mono text-brand-ink hover:underline">
                #{q.runId.slice(1)}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="label-mono">{m.stoppedAt}</dt>
            <dd className="text-ink">{q.stepLabel}</dd>
          </div>
        </dl>

        <div className="mt-5">
          <p className="label-mono mb-1">{m.context}</p>
          <p className="text-sm text-ink-2">{q.context}</p>
        </div>

        {q.data.length ? (
          <div className="mt-4">
            <p className="label-mono mb-2">
              {m.data} · {m.masked}
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {q.data.map((d) => (
                <li key={d.label} className="rounded-sm border border-line bg-paper px-2 py-0.5 text-xs">
                  <span className="text-muted">{d.label}:</span> <span className="font-mono text-ink">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 border-t border-line pt-5">
          <p className="label-mono mb-1">{m.question}</p>
          <h2 className="font-display text-xl font-medium leading-snug text-ink">{q.text}</h2>
        </div>

        <div className="mt-4">
          {q.status === "pending" ? (
            <>
              <AnswerForm key={q.id} orgId={orgId} question={q} disabled={!canAnswer} />
              {!canAnswer ? <p className="mt-2 text-xs text-muted">{m.noPermission}</p> : null}
            </>
          ) : q.answer ? (
            <div className="rounded-md border border-brand-line bg-brand-soft/60 px-4 py-3">
              <p className="label-mono">{m.answer}</p>
              <p className="mt-1 font-semibold text-ink">{q.answer.value}</p>
              <p className="mt-1 text-xs text-muted">{m.answeredBy(q.answer.by, f.dateTime(q.answer.at))}</p>
              {q.answer.applyAlways ? (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-ink">
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  {m.ruleCreated} ·{" "}
                  <Link href={`${orgPath(orgId, "agents", q.agentId)}?tab=aprendido`} className="underline">
                    {m.seeRule}
                  </Link>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <Clock className={cn("mt-0.5 size-4 shrink-0", overdue ? "text-signal" : "text-muted")} aria-hidden />
            <div>
              <p className="label-mono">{m.due}</p>
              <p className={cn(overdue ? "font-medium text-signal-ink" : "text-ink")}>
                {overdue ? m.overdue(f.relative(q.dueAt)) : q.status === "pending" ? m.dueIn(f.relative(q.dueAt)) : f.dateTime(q.dueAt)}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                <Hourglass className="size-3" aria-hidden />
                {m.ifNoAnswer}: {c.fallback[q.fallback].toLowerCase()}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <UserRound className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
            <div className="min-w-0">
              <p className="label-mono mb-1">{m.assignedTo}</p>
              {q.status === "pending" && canReassign ? (
                <ReassignSelect orgId={orgId} questionId={q.id} current={q.assignee} options={assignees} />
              ) : (
                <p className="text-ink">{q.assignee.type === "role" ? m.roleOption(q.assignee.label) : q.assignee.label}</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function QuestionsPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireOrg(decodeURIComponent((await params).org));
  const gate = sectionGate(ctx, "questions");
  if (gate) return gate;
  const sp = await searchParams;
  const orgId = ctx.org.id;
  const m = questionsMsg[ctx.lang];
  const c = common[ctx.lang];
  const f = fmt(ctx.lang);

  const qParam = first(sp.q);
  const linked = qParam ? await api().getQuestion(orgId, qParam) : null;
  const statusParam = first(sp.status);
  const status: QuestionStatus = statusParam === "answered" || statusParam === "pending" ? statusParam : linked?.status === "answered" ? "answered" : "pending";
  const agent = first(sp.agent) || undefined;
  const mine = first(sp.mine) === "1";

  const [list, agents, users, pendingAll] = await Promise.all([
    api().listQuestions(orgId, { status, agentId: agent, assignedTo: mine ? ctx.actor : undefined }),
    api().listAgents(orgId),
    api().listUsers(orgId),
    api().listQuestions(orgId, { status: "pending" }),
  ]);
  // A linked question (?q=) is shown even if the current filters would hide it.
  const selected = linked ?? list[0] ?? null;
  const agentsWithQuestions = agents.filter((a) => a.mode !== "building" && a.mode !== "testing");

  const base = orgPath(orgId, "questions");
  const href = (p: Record<string, string | undefined>) => withParams(base, { status, agent, mine: mine ? "1" : undefined, ...p });
  const assignees: Assignee[] = [
    ...users
      .filter((u) => u.status === "active" && u.memberships.some((mm) => mm.orgId === orgId && ["admin", "process_owner", "reviewer"].includes(mm.role)))
      .map((u) => ({ type: "user" as const, id: u.id, label: u.name })),
    { type: "role", id: "process_owner", label: c.role.process_owner },
    { type: "role", id: "reviewer", label: c.role.reviewer },
  ];
  const counts = {
    q: pendingAll.filter((q) => q.kind === "question").length,
    e: pendingAll.filter((q) => q.kind === "exception").length,
    a: pendingAll.filter((q) => q.kind === "approval").length,
  };

  const tab = (s: QuestionStatus, label: string, n?: number) => (
    <Link
      href={withParams(base, { status: s, agent, mine: mine ? "1" : undefined })}
      aria-current={status === s ? "page" : undefined}
      className={cn("-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium", status === s ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink")}
    >
      {label}
      {n ? <span className="tabular rounded-full bg-signal px-1.5 text-[0.7rem] font-semibold leading-5 text-white">{n}</span> : null}
    </Link>
  );

  return (
    <div>
      <PageHeader eyebrow={m.eyebrow} title={m.title} description={<>{m.description} <span className="font-medium text-ink">{m.counts(counts.q, counts.e, counts.a)}</span></>} />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line">
        <nav aria-label={m.title} className="flex">
          {tab("pending", m.pending, pendingAll.length)}
          {tab("answered", m.answered)}
        </nav>
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <Link
            href={href({ mine: mine ? undefined : "1", q: undefined })}
            aria-pressed={mine}
            className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", mine ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink-2 hover:border-muted")}
          >
            <UserRound className="size-3.5" aria-hidden />
            {m.mine}
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5" role="group" aria-label={m.byAgent}>
        <span className="label-mono mr-1">{m.byAgent}</span>
        <Link href={href({ agent: undefined, q: undefined })} className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", !agent ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink-2 hover:border-muted")}>
          {m.allAgents}
        </Link>
        {agentsWithQuestions.map((a) => (
          <Link key={a.id} href={href({ agent: a.id, q: undefined })} className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", agent === a.id ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink-2 hover:border-muted")}>
            {a.name}
          </Link>
        ))}
      </div>

      {list.length === 0 && !selected ? (
        <EmptyState title={m.none}>{status === "pending" ? m.noneHint : null}</EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
          <ul className="flex flex-col gap-2" aria-label={m.title}>
            {list.length === 0 ? <EmptyState title={m.none} /> : null}
            {list.map((q) => {
              const active = selected?.id === q.id;
              const overdue = q.status === "pending" && new Date(q.dueAt).getTime() < Date.now();
              return (
                <li key={q.id}>
                  <Link
                    href={href({ q: q.id })}
                    scroll={false}
                    aria-current={active ? "true" : undefined}
                    className={cn("block rounded-lg border bg-surface p-4 transition-colors", active ? "border-brand ring-1 ring-brand" : "border-line hover:border-muted")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <QuestionKindBadge kind={q.kind} />
                      <span className={cn("text-xs", overdue ? "font-medium text-signal-ink" : "text-muted")}>{q.status === "pending" ? (overdue ? m.overdue(f.relative(q.dueAt)) : m.dueIn(f.relative(q.dueAt))) : f.relative(q.answer?.at ?? q.createdAt)}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-medium text-ink">{q.text}</p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                      <Bot className="size-3.5" aria-hidden />
                      {q.agentName}
                      <span className="text-faint">·</span>
                      {q.stepLabel}
                      <span className="text-faint">·</span>
                      {q.assignee.type === "role" ? m.roleOption(q.assignee.label) : q.assignee.label}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="lg:sticky lg:top-20 lg:self-start">
            {selected ? (
              <Detail orgId={orgId} q={selected} lang={ctx.lang} canAnswer={can(ctx.role, ctx.staff, "questions.answer")} canReassign={can(ctx.role, ctx.staff, "questions.reassign")} assignees={assignees} />
            ) : (
              <EmptyState title={m.select} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
