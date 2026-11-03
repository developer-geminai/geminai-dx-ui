"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Building2, CircleHelp, CreditCard, FileSignature, Home, Laptop, Lock, Map, Settings, Stethoscope } from "lucide-react";
import type { SectionKey } from "@/lib/features";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-items";

export const SECTION_ICONS: Record<SectionKey, typeof Bot> = {
  home: Home,
  questions: CircleHelp,
  agents: Bot,
  diagnostic: Stethoscope,
  devices: Laptop,
  contracts: FileSignature,
  billing: CreditCard,
  settings: Settings,
  roadmap: Map,
  internal: Building2,
};

export function isActive(pathname: string, item: NavItem, base: string) {
  return item.key === "home" ? pathname === base || pathname === `${base}/onboarding` : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SidebarNav({ items, base, onNavigate, label }: { items: NavItem[]; base: string; onNavigate?: () => void; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = isActive(pathname, item, base);
        const locked = item.access === "locked";
        const Icon = SECTION_ICONS[item.key];
        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            title={locked ? item.hint : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand-soft text-ink" : locked ? "text-faint hover:bg-paper-alt hover:text-muted" : "text-ink-2 hover:bg-paper-alt hover:text-ink",
            )}
          >
            <Icon className={cn("size-4", active ? "text-brand-ink" : locked ? "text-faint" : "text-muted")} aria-hidden />
            <span className="flex-1 truncate">{item.label}</span>
            {locked ? <Lock className="size-3.5 text-faint" aria-label="Locked" /> : null}
            {!locked && item.badge ? (
              <span className="tabular rounded-full bg-signal px-1.5 text-[0.7rem] font-semibold leading-5 text-white" aria-label={`${item.badge}`}>
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
