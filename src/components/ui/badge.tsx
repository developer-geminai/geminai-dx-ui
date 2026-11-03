import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium leading-5 [&_svg]:size-3.5", {
  variants: {
    tone: {
      done: "border-transparent bg-brand-soft text-brand",
      attention: "border-transparent bg-signal-soft text-[rgb(var(--signal-ink))]",
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
