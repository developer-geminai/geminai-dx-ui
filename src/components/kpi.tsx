import Link from "next/link";
import { cn } from "@/lib/utils";

/** Stat tile: one headline number, a mono label and an optional hint. */
export function Kpi({
  label,
  value,
  hint,
  href,
  icon,
  tone = "default",
  badge,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  icon?: React.ReactNode;
  tone?: "default" | "attention";
  badge?: React.ReactNode;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="label-mono">{label}</p>
        {icon ? <span className={cn("text-muted [&_svg]:size-4", tone === "attention" && "text-signal")}>{icon}</span> : null}
      </div>
      <p className={cn("tabular mt-3 font-display text-[2.3rem] font-medium leading-none tracking-[-0.02em]", tone === "attention" ? "text-signal-ink" : "text-ink")}>{value}</p>
      {hint || badge ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          {badge}
          {hint}
        </div>
      ) : null}
    </>
  );
  const cls = cn("block rounded-lg border border-line bg-surface p-5", className);
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:border-brand/50")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
