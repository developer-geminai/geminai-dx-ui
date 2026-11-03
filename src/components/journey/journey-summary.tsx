import type { JourneySection } from "@/lib/journey";
import { ToneIcon, normalizeTone } from "@/components/status";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";

const toneText: Record<string, string> = {
  done: "text-brand",
  attention: "text-signal",
  error: "text-danger",
  neutral: "text-muted",
};

/** Eight business questions, each answered only with recorded items (or an explicit "not recorded"). */
export function JourneySummary({ sections, unclassifiedSteps }: { sections: JourneySection[]; unclassifiedSteps: number }) {
  return (
    <div>
      <ol className="grid gap-3 md:grid-cols-2">
        {sections.map((s, i) => (
          <li key={s.key} className={cn("rounded-md border border-line bg-surface p-4", s.key === "unresolved" && s.items.length && "border-signal/40 bg-signal-soft/40", s.key === "achieved" && "md:col-span-1")} aria-labelledby={`js-${s.key}`}>
            <h3 id={`js-${s.key}`} className="flex items-center gap-2 font-sans text-sm font-semibold text-ink">
              <span className="tabular grid size-5 place-items-center rounded-full bg-brand-soft font-mono text-[0.65rem] text-brand">{i + 1}</span>
              {s.question}
            </h3>
            {s.items.length ? (
              <ul className="mt-2 flex flex-col gap-2">
                {s.items.slice(0, 6).map((item, j) => (
                  <li key={j} className="flex gap-2 text-sm">
                    <ToneIcon tone={item.tone} className={cn("mt-0.5 size-4 shrink-0", toneText[normalizeTone(item.tone)])} />
                    <div className="min-w-0">
                      <p className="break-words font-medium leading-snug text-ink">{item.title}</p>
                      {item.detail ? <p className="mt-0.5 whitespace-pre-line break-words text-muted">{item.detail}</p> : null}
                      <p className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted/90">
                        {item.provenance}
                        {item.at ? ` · ${formatDateTime(item.at)}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
                {s.items.length > 6 ? <li className="text-xs text-muted">+{s.items.length - 6} more in the timeline below</li> : null}
              </ul>
            ) : (
              <p className="mt-2 text-sm italic text-muted">{s.emptyText}</p>
            )}
          </li>
        ))}
      </ol>
      {unclassifiedSteps > 0 ? (
        <p className="mt-3 text-xs text-muted">
          {unclassifiedSteps} other recorded step{unclassifiedSteps === 1 ? "" : "s"} use event types this summary does not classify; they appear in the full timeline.
        </p>
      ) : null}
    </div>
  );
}
