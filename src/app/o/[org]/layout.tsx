import { AppShell } from "@/components/layout/app-shell";
import { EXTRA_SECTIONS, MAIN_SECTIONS, MOBILE_SECTIONS, type NavItem } from "@/components/layout/nav-items";
import { logoutAction } from "@/app/actions";
import { api, isMockApi } from "@/lib/api";
import { requireOrg } from "@/lib/server/session";
import { common } from "@/lib/i18n/common";
import { sectionByKey, type SectionKey } from "@/lib/features";
import { orgPath } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizationLayout({ children, params }: { children: React.ReactNode; params: Promise<{ org: string }> }) {
  const { org: orgId } = await params;
  const ctx = await requireOrg(decodeURIComponent(orgId));
  const m = common[ctx.lang];
  const pending = ctx.access("questions") === "open" ? (await api().listQuestions(ctx.org.id, { status: "pending" })).length : 0;

  const item = (key: SectionKey): NavItem | null => {
    const access = ctx.access(key);
    if (access === "hidden" || access === "forbidden") return null;
    const def = sectionByKey(key);
    return {
      key,
      href: def.segment ? orgPath(ctx.org.id, ...def.segment.split("/")) : orgPath(ctx.org.id),
      label: m.nav[key],
      access,
      badge: key === "questions" ? pending : undefined,
      hint: access === "locked" ? m.locked[def.lockHint] : undefined,
    };
  };
  const list = (keys: SectionKey[]) => keys.map(item).filter((x): x is NavItem => x !== null);
  const membership = ctx.viewer.user.memberships.find((mm) => mm.orgId === ctx.org.id);

  return (
    <AppShell
      org={{ id: ctx.org.id, name: ctx.org.name, phase: ctx.org.phase }}
      organizations={ctx.viewer.organizations}
      main={list(MAIN_SECTIONS)}
      extra={list(EXTRA_SECTIONS).filter((i) => i.key !== "roadmap" || ctx.staff || ctx.role === "admin")}
      mobile={list(MOBILE_SECTIONS)}
      user={{ name: ctx.viewer.user.name, initials: ctx.viewer.user.initials, roleLabel: ctx.staff ? m.staff : membership ? m.role[membership.role] : "", staff: ctx.staff }}
      showExpand={ctx.flags.expand}
      demo={isMockApi()}
      logoutAction={logoutAction}
    >
      {children}
    </AppShell>
  );
}
