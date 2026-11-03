"use client";
import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  label,
  className,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  /** Accessible name. */
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-brand" : "bg-line",
        className,
      )}
    >
      <span className={cn("inline-block size-4 rounded-full bg-surface shadow transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

export function Progress({ value, max = 1, tone = "brand", className, label }: { value: number; max?: number; tone?: "brand" | "signal" | "danger"; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label} className={cn("h-1.5 w-full overflow-hidden rounded-full bg-paper-alt", className)}>
      <div className={cn("h-full rounded-full", tone === "brand" ? "bg-brand" : tone === "signal" ? "bg-signal" : "bg-danger")} style={{ width: `${pct}%` }} />
    </div>
  );
}
