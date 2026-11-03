"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FlaskConical, LogOut, MoreHorizontal, Plus, X, Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { PhaseBadge } from "@/components/status-badges";
import { useLang } from "@/lib/i18n/client";
import { common } from "@/lib/i18n/common";
import type { Phase } from "@/lib/api/types";
import { setLangAction } from "@/app/actions";
import { cn, orgPath } from "@/lib/utils";
import { SidebarNav, SECTION_ICONS, isActive } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";
import type { NavItem } from "./nav-items";

export interface AppShellProps {
  org: { id: string; name: string; phase: Phase };
  organizations: { id: string; name: string; phase: Phase }[];
  main: NavItem[];
  extra: NavItem[];
  mobile: NavItem[];
  user: { name: string; initials: string; roleLabel: string; staff: boolean };
  showExpand: boolean;
  demo: boolean;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}

function ClientSelector({ current, options }: { current: string; options: AppShellProps["organizations"] }) {
  const router = useRouter();
  const pathname = usePathname();
  const m = common[useLang()];
  return (
    <label className="block">
      <span className="label-mono mb-1 block">{m.clientSelector} · {m.staff}</span>
      <select
        className="h-9 w-full cursor-pointer rounded-md border border-line bg-surface px-2 text-sm font-medium text-ink focus-visible:border-brand focus-visible:shadow-focus focus-visible:outline-none"
        value={current}
        onChange={(e) => {
          // Keep the current section, drop deeper ids (agents/runs differ per client).
          const section = pathname.split("/")[3];
          router.push(orgPath(e.target.value) + (section ? `/${section}` : ""));
        }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Sidebar(props: AppShellProps & { onNavigate?: () => void }) {
  const { org, organizations, main, extra, user, showExpand, onNavigate } = props;
  const m = common[useLang()];
  const base = orgPath(org.id);
  return (
    <div className="flex h-full flex-col border-r border-line bg-surface px-3 py-4">
      <div className="px-2 pb-5">
        <Logo product={m.product} />
      </div>
      <div className="mb-4 rounded-md border border-line bg-paper px-3 py-3">
        {user.staff && organizations.length > 1 ? (
          <ClientSelector current={org.id} options={organizations} />
        ) : (
          <p className="truncate text-sm font-semibold text-ink">{org.name}</p>
        )}
        <div className="mt-2">
          <PhaseBadge phase={org.phase} />
        </div>
      </div>
      <SidebarNav items={main} base={base} onNavigate={onNavigate} label="Primary" />
      {extra.length ? (
        <>
          <div className="mx-3 my-3 border-t border-line" />
          <SidebarNav items={extra} base={base} onNavigate={onNavigate} label="Secondary" />
        </>
      ) : null}
      <div className="mt-auto pt-4">
        {showExpand ? (
          <Button asChild className="w-full" variant="forest">
            <Link href={orgPath(org.id, "expand")} onClick={onNavigate}>
              <Plus aria-hidden />
              {m.nav.expand}
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function LangSwitch() {
  const lang = useLang();
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="inline-flex rounded-sm border border-line p-0.5 text-xs font-semibold" role="group" aria-label="Language">
      {(["es", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          aria-pressed={lang === l}
          onClick={() =>
            start(async () => {
              await setLangAction(l);
              router.refresh();
            })
          }
          className={cn("rounded-[4px] px-2 py-1 uppercase", lang === l ? "bg-ink text-paper" : "text-muted hover:text-ink")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  const { org, mobile, user, demo, logoutAction, children } = props;
  const m = common[useLang()];
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const base = orgPath(org.id);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="hidden border-r border-line bg-surface lg:block">
        <aside className="sticky top-0 h-screen" aria-label="Sidebar">
          <Sidebar {...props} />
        </aside>
      </div>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-forest/50" aria-label={m.actions.close} onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[272px] shadow-pop animate-in slide-in-from-left">
            <Sidebar {...props} onNavigate={() => setOpen(false)} />
            <Button variant="ghost" size="icon" className="absolute right-2 top-3" aria-label={m.actions.close} onClick={() => setOpen(false)}>
              <X aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col pb-16 lg:pb-0">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
          <div className="flex items-center gap-3 px-4 py-2.5 md:px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(true)}>
              <Menu aria-hidden />
            </Button>
            <div className="min-w-0 lg:hidden">
              <Logo />
            </div>
            <p className="hidden min-w-0 truncate text-sm text-muted lg:block">
              <span className="font-semibold text-ink">{org.name}</span>
              <span className="mx-2 text-faint">·</span>
              {m.phaseNumber[org.phase]} · {m.phase[org.phase]}
            </p>
            <div className="ml-auto flex items-center gap-1.5">
              {demo ? (
                <span className="mr-1 hidden items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 text-xs font-medium text-muted sm:inline-flex" title={m.demoDataTitle}>
                  <FlaskConical className="size-3.5" aria-hidden /> {m.demoData}
                </span>
              ) : null}
              <LangSwitch />
              <ThemeToggle />
              <span className="ml-1 hidden items-center gap-2 md:inline-flex" title={user.roleLabel}>
                <span className="flex size-8 items-center justify-center rounded-full bg-forest text-xs font-semibold text-band-fg">{user.initials}</span>
                <span className="flex flex-col leading-tight">
                  <span className="text-sm font-medium text-ink">{user.name}</span>
                  <span className="text-[0.7rem] text-muted">{user.roleLabel}</span>
                </span>
              </span>
              <form action={logoutAction}>
                <Button variant="ghost" size="icon" type="submit" aria-label={m.actions.signOut} title={m.actions.signOut}>
                  <LogOut aria-hidden />
                </Button>
              </form>
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom bar: Inicio, Agentes, Preguntas, Más */}
      <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface lg:hidden">
        {mobile.map((item) => {
          const Icon = SECTION_ICONS[item.key];
          const active = isActive(pathname, item, base);
          return (
            <Link key={item.key} href={item.href} aria-current={active ? "page" : undefined} className={cn("relative flex flex-col items-center gap-0.5 py-2 text-[0.7rem] font-medium", active ? "text-brand-ink" : item.access === "locked" ? "text-faint" : "text-muted")}>
              <Icon className="size-5" aria-hidden />
              {item.label}
              {item.badge && item.access === "open" ? <span className="absolute right-[calc(50%-1.4rem)] top-1 rounded-full bg-signal px-1 text-[0.6rem] font-semibold leading-4 text-white">{item.badge}</span> : null}
            </Link>
          );
        })}
        <button type="button" onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[0.7rem] font-medium text-muted">
          <MoreHorizontal className="size-5" aria-hidden />
          {m.nav.more}
        </button>
      </nav>
    </div>
  );
}
