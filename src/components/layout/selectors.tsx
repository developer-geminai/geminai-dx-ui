"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Building2, Bot } from "lucide-react";
import { Select } from "@/components/ui/form";
import { orgPath } from "@/lib/utils";

export interface OrgOption {
  id: string;
  label: string;
}
export interface AgentOption {
  id: string;
  name: string;
}

/** Switching organization lands on that organization's equivalent page, dropping agent/case context. */
export function OrganizationSelector({ current, options }: { current: string; options: OrgOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  if (options.length < 2) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Building2 className="size-4 text-muted" aria-hidden />
        <span className="font-medium">{options.find((o) => o.id === current)?.label ?? current}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Building2 className="size-4 shrink-0 text-muted" aria-hidden />
      <label htmlFor="org-select" className="sr-only">
        Organization
      </label>
      <Select
        id="org-select"
        value={current}
        disabled={pending}
        className="h-8 w-auto min-w-[10rem] max-w-[16rem]"
        onChange={(e) => {
          const section = pathname.split("/")[3];
          const keep = section && ["agents", "journeys", "inbox", "analytics"].includes(section) ? section : "";
          start(() => router.push(keep ? `${orgPath(e.target.value)}/${keep}` : orgPath(e.target.value)));
        }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

/** Global agent filter: sets ?agent= on the current page (all pages honour it). */
export function AgentSelector({ agents }: { agents: AgentOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const current = params.get("agent") ?? "all";
  // Agent detail and case pages already pin one agent; the filter would be ambiguous there.
  const pinned = /\/agents\/[^/]+$|\/journeys\/[^/]+\/[^/]+$/.test(pathname);
  if (pinned) return null;
  return (
    <div className="flex items-center gap-2">
      <Bot className="size-4 shrink-0 text-muted" aria-hidden />
      <label htmlFor="agent-select" className="sr-only">
        Agent filter
      </label>
      <Select
        id="agent-select"
        value={current}
        disabled={pending}
        className="h-8 w-auto min-w-[10rem] max-w-[16rem]"
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value === "all") next.delete("agent");
          else next.set("agent", e.target.value);
          next.delete("question");
          const qs = next.toString();
          start(() => router.push(qs ? `${pathname}?${qs}` : pathname));
        }}
      >
        <option value="all">All agents ({agents.length})</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
