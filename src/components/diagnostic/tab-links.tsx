import Link from "next/link";
import { cn } from "@/lib/utils";

/** URL-driven tabs (?tab=…) so each tab is linkable and server-rendered. */
export function TabLinks({ tabs, current, label }: { tabs: { key: string; label: string; href: string; badge?: React.ReactNode }[]; current: string; label: string }) {
  return (
    <nav aria-label={label} className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === current ? "page" : undefined}
          className={cn(
            "-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            t.key === current ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink",
          )}
        >
          {t.label}
          {t.badge}
        </Link>
      ))}
    </nav>
  );
}
