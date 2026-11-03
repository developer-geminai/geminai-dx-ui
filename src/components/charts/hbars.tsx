import { cn } from "@/lib/utils";

/* No "use client": usable from server components with a format function. */
/** Horizontal magnitude bars as plain HTML (labels stay in ink, bar carries magnitude). */
export function HBars({ items, format, className }: { items: { label: string; value: number; hint?: string }[]; format: (v: number) => string; className?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cn("flex flex-col divide-y divide-line", className)}>
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 py-2.5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]" title={`${i.label}: ${format(i.value)}`}>
          <span className="truncate text-sm text-ink">{i.label}</span>
          <span className="order-last col-span-2 h-1.5 rounded-full bg-paper-alt sm:order-none sm:col-span-1">
            <span className="block h-full rounded-full bg-brand" style={{ width: `${(i.value / max) * 100}%` }} />
          </span>
          <span className="tabular text-right text-sm text-muted">
            {format(i.value)}
            {i.hint ? <span className="ml-2 text-faint">{i.hint}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
