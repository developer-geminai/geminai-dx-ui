"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BarChart3, Bot, Inbox, LayoutDashboard, Route } from "lucide-react";
import { NAV_ITEMS, type NavIcon } from "./nav-items";
import { cn, orgPath, withParams } from "@/lib/utils";

const ICONS: Record<NavIcon, typeof Bot> = { overview: LayoutDashboard, agents: Bot, journeys: Route, inbox: Inbox, analytics: BarChart3 };

export function SidebarNav({ org, openQuestions, onNavigate }: { org: string; openQuestions: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const agent = params.get("agent");
  const base = orgPath(org);

  return (
    <nav aria-label="Primary" className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const href = item.segment ? `${base}/${item.segment}` : base;
        const active = item.segment ? pathname.startsWith(href) : pathname === base;
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.segment}
            href={withParams(href, { agent })}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-band-brand/15 text-band-fg" : "text-band-muted hover:bg-band-line/60 hover:text-band-fg",
            )}
          >
            <Icon className={cn("size-4", active ? "text-band-brand" : "")} aria-hidden />
            <span className="flex-1">{item.label}</span>
            {item.icon === "inbox" && openQuestions > 0 ? (
              <span className="tabular rounded-full bg-band-signal px-1.5 text-[0.7rem] font-semibold leading-5 text-band" aria-label={`${openQuestions} open questions`}>
                {openQuestions}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
