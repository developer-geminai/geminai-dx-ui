"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MessageCircleQuestion, RefreshCw, Search } from "lucide-react";
import type { Question, QuestionContext } from "@/lib/types";
import { QuestionContextPanel } from "./question-context-panel";
import { questionKey } from "./question-preview-list";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";

type Loaded = { status: "idle" } | { status: "loading"; key: string } | { status: "ready"; key: string; ctx: QuestionContext } | { status: "error"; key: string; message: string };

export function filterQuestions(items: Question[], status: string, term: string): Question[] {
  const t = term.trim().toLowerCase();
  return items.filter(
    (q) =>
      (status === "all" || (status === "open" ? q.status === "open" : q.status !== "open")) &&
      (!t || [q.text ?? "", q.title, q.source_subject ?? "", q.case_id, q.agent_name ?? ""].some((v) => v.toLowerCase().includes(t))),
  );
}

export function InboxView({ org, questions }: { org: string; questions: Question[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedKey = params.get("question");
  const [status, setStatus] = useState("open");
  const [term, setTerm] = useState("");
  const [loaded, setLoaded] = useState<Loaded>({ status: "idle" });
  const latest = useRef<string | null>(null);

  const visible = useMemo(() => filterQuestions(questions, status, term), [questions, status, term]);
  const selected = questions.find((q) => questionKey(q) === selectedKey) ?? null;

  const load = useCallback(
    async (q: Question) => {
      const key = questionKey(q);
      latest.current = key;
      setLoaded({ status: "loading", key });
      try {
        const res = await fetch(`/api/orgs/${encodeURIComponent(org)}/cases/${encodeURIComponent(q.agent_id ?? "")}/${encodeURIComponent(q.case_id)}/questions/${encodeURIComponent(q.id)}`, { cache: "no-store" });
        const body = (await res.json()) as QuestionContext & { error?: string };
        if (latest.current !== key) return; // a later selection won; drop this late response
        if (!res.ok) setLoaded({ status: "error", key, message: body.error ?? `HTTP ${res.status}` });
        else setLoaded({ status: "ready", key, ctx: body });
      } catch {
        if (latest.current === key) setLoaded({ status: "error", key, message: "The question context could not be loaded." });
      }
    },
    [org],
  );

  useEffect(() => {
    if (selected) void load(selected);
    else {
      latest.current = null;
      setLoaded({ status: "idle" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  function select(q: Question) {
    const next = new URLSearchParams(params.toString());
    next.set("question", questionKey(q));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.4fr)]">
      <section aria-label="Questions" className="min-w-0 rounded-lg border border-line bg-surface">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-b border-line p-3">
          <div className="relative">
            <Label htmlFor="inbox-search" className="sr-only">
              Search questions
            </Label>
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted" aria-hidden />
            <Input id="inbox-search" className="pl-8" placeholder="Search questions" value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          <Label htmlFor="inbox-status" className="sr-only">
            Question status
          </Label>
          <Select id="inbox-status" className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="open">Open</option>
            <option value="closed">Answered / closed</option>
            <option value="all">All</option>
          </Select>
        </div>
        <p className="px-4 pt-2 text-xs text-muted" aria-live="polite">
          {visible.length} question{visible.length === 1 ? "" : "s"}
        </p>
        {visible.length ? (
          <ul className="max-h-[70vh] overflow-y-auto p-2" role="listbox" aria-label="Questions" aria-activedescendant={selectedKey ? `q-${selectedKey}` : undefined}>
            {visible.map((q) => {
              const key = questionKey(q);
              const active = key === selectedKey;
              return (
                <li key={key} id={`q-${key}`} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => select(q)}
                    className={cn("flex w-full gap-3 rounded-md px-3 py-2.5 text-left transition-colors", active ? "bg-brand-soft" : "hover:bg-paper-alt")}
                  >
                    <MessageCircleQuestion className={cn("mt-0.5 size-4 shrink-0", q.status === "open" ? "text-signal" : "text-muted")} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-medium text-ink">{q.text ?? q.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {q.agent_name} · {q.source_subject ?? q.case_id}
                      </span>
                    </span>
                    <span className="shrink-0 text-[0.7rem] text-muted">{relativeTime(q.created_at)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState className="m-3" title={status === "open" ? "No open questions" : "No questions match"}>
            {status === "open" ? "No agent is currently waiting for a person." : "Try another filter."}
          </EmptyState>
        )}
      </section>

      <section aria-label="Question context" className="min-w-0 rounded-lg border border-line bg-surface p-5" aria-busy={loaded.status === "loading"}>
        {!selected ? (
          <EmptyState title="Select a question" icon={<MessageCircleQuestion className="size-6" aria-hidden />}>
            The agent&rsquo;s original input, what it understood, and exactly what it needs from you will appear here.
          </EmptyState>
        ) : loaded.status === "loading" || loaded.status === "idle" ? (
          <div className="flex flex-col gap-3" aria-label="Loading question context">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
          </div>
        ) : loaded.status === "error" ? (
          <ErrorState
            title="Question context unavailable"
            detail={loaded.message}
            action={
              <Button size="sm" variant="line" onClick={() => void load(selected)}>
                Retry
              </Button>
            }
          />
        ) : (
          <>
            <div className="mb-3 flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => void load(selected)}>
                <RefreshCw aria-hidden /> Reload context
              </Button>
            </div>
            <QuestionContextPanel org={org} ctx={loaded.ctx} />
          </>
        )}
      </section>
    </div>
  );
}
