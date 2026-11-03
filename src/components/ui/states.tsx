import * as React from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-line/70", className)} {...props} />;
}

export function EmptyState({ title, children, icon, className }: { title: string; children?: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line px-6 py-10 text-center", className)}>
      <div className="text-muted">{icon ?? <Inbox className="size-6" aria-hidden />}</div>
      <p className="font-medium text-ink">{title}</p>
      {children ? <div className="max-w-md text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function ErrorState({ title, detail, action, className }: { title: string; detail?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn("flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3", className)}>
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{title}</p>
        {detail ? <p className="mt-0.5 text-sm text-muted">{detail}</p> : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}
