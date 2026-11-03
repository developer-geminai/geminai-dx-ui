"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Modal built on the native <dialog> element (focus trap, Esc and backdrop for free). */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn("w-[min(560px,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-forest/50", className)}
    >
      {open ? (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 className="font-display text-xl font-medium leading-tight">{title}</h2>
              {description ? <div className="mt-1 text-sm text-muted">{description}</div> : null}
            </div>
            <button type="button" onClick={onClose} className="rounded-sm p-1 text-muted hover:bg-paper-alt hover:text-ink" aria-label="Close">
              <X className="size-4" aria-hidden />
            </button>
          </div>
          {children ? <div className="overflow-y-auto px-5 py-4">{children}</div> : null}
          {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div> : null}
        </div>
      ) : null}
    </dialog>
  );
}
