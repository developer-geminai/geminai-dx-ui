import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva("inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium leading-5 [&_svg]:size-3.5", {
  variants: {
    tone: {
      done: "border-transparent bg-brand-soft text-brand-ink",
      /** Amber: ONLY for "requires attention". */
      attention: "border-signal-line bg-signal-soft text-signal-ink",
      info: "border-transparent bg-[rgb(var(--chart-2)/0.12)] text-[rgb(var(--chart-2))]",
      paused: "border-ink/20 bg-ink/5 text-ink",
      error: "border-transparent bg-danger-soft text-danger",
      neutral: "border-line bg-paper-alt text-muted",
      outline: "border-line bg-transparent text-ink",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
