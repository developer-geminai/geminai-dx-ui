import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: string; title: string; description?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="text-[1.9rem] font-semibold leading-tight tracking-[-0.015em] md:text-[2.2rem]">{title}</h1>
        {description ? <div className="mt-2 text-[0.95rem] text-muted">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
