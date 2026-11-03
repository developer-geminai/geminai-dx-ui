"use client";
import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X, FlaskConical, EyeOff } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./sidebar-nav";
import { AgentSelector, OrganizationSelector, type AgentOption, type OrgOption } from "./selectors";
import { ThemeToggle } from "./theme-toggle";

export interface AppShellProps {
  org: string;
  organizations: OrgOption[];
  agents: AgentOption[];
  openQuestions: number;
  operatorName: string;
  demo: boolean;
  contentVisible: boolean;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}

function Sidebar({ org, openQuestions, onNavigate }: { org: string; openQuestions: number; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-band px-3 py-4 text-band-fg">
      <div className="px-2 pb-6">
        <Logo onDark />
      </div>
      <Suspense>
        <SidebarNav org={org} openQuestions={openQuestions} onNavigate={onNavigate} />
      </Suspense>
      <div className="mt-auto px-3 pt-6 font-mono text-[0.65rem] uppercase leading-relaxed tracking-eyebrow text-band-muted">
        Read-only console
        <br />
        No business actions
      </div>
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  const { org, organizations, agents, openQuestions, operatorName, demo, contentVisible, logoutAction, children } = props;
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="hidden bg-band lg:block">
        <aside className="sticky top-0 h-screen" aria-label="Sidebar">
          <Sidebar org={org} openQuestions={openQuestions} />
        </aside>
      </div>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close navigation" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[260px] shadow-pop animate-in slide-in-from-left">
            <Sidebar org={org} openQuestions={openQuestions} onNavigate={() => setOpen(false)} />
            <Button variant="ghost" size="icon" className="absolute right-2 top-3 text-band-muted hover:bg-band-line hover:text-band-fg" aria-label="Close navigation" onClick={() => setOpen(false)}>
              <X aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 md:px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)}>
              <Menu aria-hidden />
            </Button>
            <div className="lg:hidden">
              <Logo product={false} />
            </div>
            <div className="order-last flex w-full flex-wrap items-center gap-x-4 gap-y-2 sm:order-none sm:w-auto">
              <OrganizationSelector current={org} options={organizations} />
              <Suspense>
                <AgentSelector agents={agents} />
              </Suspense>
            </div>
            <div className="ml-auto flex items-center gap-1">
              {demo ? (
                <span className="mr-2 hidden items-center gap-1 rounded-full bg-signal-soft px-2 py-0.5 text-xs font-medium text-[rgb(var(--signal-ink))] sm:inline-flex" title="This backend serves synthetic demo data, not production cases.">
                  <FlaskConical className="size-3.5" aria-hidden /> Synthetic demo data
                </span>
              ) : null}
              {!contentVisible ? (
                <span className="mr-2 hidden items-center gap-1 rounded-full bg-paper-alt px-2 py-0.5 text-xs text-muted sm:inline-flex" title="Source contents are hidden for this backend session.">
                  <EyeOff className="size-3.5" aria-hidden /> Contents hidden
                </span>
              ) : null}
              <span className="hidden text-sm text-muted md:inline">{operatorName}</span>
              <ThemeToggle />
              <form action={logoutAction}>
                <Button variant="ghost" size="icon" type="submit" aria-label="Sign out" title="Sign out">
                  <LogOut aria-hidden />
                </Button>
              </form>
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
