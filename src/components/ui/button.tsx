import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Mirrors .btn / .btn-solid / .btn-line on geminaidx.com (6px radius, 600 weight, press scale). */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-semibold transition-[transform,background-color,border-color,color] duration-150 ease-brand active:scale-[.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        solid: "bg-brand text-brand-on hover:bg-brand-strong",
        line: "border border-line bg-transparent text-ink hover:border-muted",
        ghost: "text-muted hover:bg-paper-alt hover:text-ink",
        soft: "bg-brand-soft text-brand hover:bg-brand-soft/70",
      },
      size: {
        sm: "h-8 px-3 text-[0.8rem]",
        md: "h-9 px-4",
        lg: "h-11 px-5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "solid", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
});
Button.displayName = "Button";
