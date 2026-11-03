import Link from "next/link";
import { cn } from "@/lib/utils";
import { number } from "@/lib/format";

export function MetricCard({
  label,
  value,
  hint,
  href,
  emphasis = "default",
  icon,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  emphasis?: "default" | "attention";
  icon?: React.ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[0.68rem] uppercase tracking-eyebrow text-muted">{label}</p>
        {icon ? <span className={cn("text-muted", emphasis === "attention" && "text-signal")}>{icon}</span> : null}
      </div>
      <p className={cn("tabular mt-3 font-display text-[2.4rem] font-semibold leading-none tracking-[-0.02em]", emphasis === "attention" && Number(value) > 0 ? "text-[rgb(var(--signal-ink))]" : "text-ink")}>
        {typeof value === "number" ? number.format(value) : value}
      </p>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </>
  );
  const cls = "block rounded-lg border border-line bg-surface p-5 transition-colors";
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-brand/50 focus-visible:border-brand")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
