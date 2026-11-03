import Link from "next/link";
import { Lock, ShieldOff, ToggleLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { common } from "@/lib/i18n/common";
import { sectionByKey, type SectionKey } from "@/lib/features";
import type { OrgContext } from "@/lib/server/session";
import { orgPath } from "@/lib/utils";
import { notFound } from "next/navigation";

/**
 * Gate for a section page. Returns a "locked / forbidden / disabled" panel, or null when open.
 * Principle: future-phase sections are never empty — they say what unlocks them.
 *
 *   const gate = sectionGate(ctx, "agents"); if (gate) return gate;
 */
export function sectionGate(ctx: OrgContext, key: SectionKey): React.ReactElement | null {
  const access = ctx.access(key);
  if (access === "open") return null;
  if (access === "hidden" && sectionByKey(key).staffOnly) notFound();
  return <LockedSection ctx={ctx} section={key} reason={access} />;
}

export function LockedSection({ ctx, section, reason }: { ctx: OrgContext; section: SectionKey; reason: "locked" | "forbidden" | "hidden" }) {
  const m = common[ctx.lang];
  const def = sectionByKey(section);
  const Icon = reason === "forbidden" ? ShieldOff : reason === "hidden" ? ToggleLeft : Lock;
  const detail = reason === "forbidden" ? m.locked.role : reason === "hidden" ? m.locked.disabled : m.locked[def.lockHint];
  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-10 text-center">
        <span className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-paper-alt text-muted">
          <Icon className="size-5" aria-hidden />
        </span>
        <p className="eyebrow mb-2 justify-center">{m.nav[section]}</p>
        <h1 className="font-display text-2xl font-medium">{m.locked.title}</h1>
        {reason === "locked" ? <p className="mt-2 text-sm font-medium text-ink">{m.locked.unlocksIn(m.phase[def.unlockPhase])}</p> : null}
        <p className="mt-1 text-sm text-muted">{detail}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="line" size="sm">
            <Link href={orgPath(ctx.org.id)}>{m.locked.goHome}</Link>
          </Button>
          {ctx.staff || ctx.role === "admin" ? (
            <Button asChild variant="soft" size="sm">
              <Link href={orgPath(ctx.org.id, "roadmap")}>{m.locked.goRoadmap}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
