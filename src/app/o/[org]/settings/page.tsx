import Link from "next/link";
import { Building2, ChevronRight, History, KeyRound, Layers, MonitorSmartphone, ShieldCheck, Store } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/form";
import { PhaseBadge } from "@/components/status-badges";
import { DataPanel, LanguagePicker, NotificationsPanel, UsersPanel } from "@/components/settings/panels";
import { SETTINGS_TABS, settingsMsg, type SettingsTab } from "@/components/settings/messages";
import { api } from "@/lib/api";
import type { OrgEntity } from "@/lib/api/types";
import { ROLES } from "@/lib/api/types";
import { requireOrg } from "@/lib/server/session";
import { common } from "@/lib/i18n/common";
import { can } from "@/lib/permissions";
import { cn, first, orgPath } from "@/lib/utils";

export const dynamic = "force-dynamic";

function EntityTree({ entities, parentId, m, depth = 0 }: { entities: OrgEntity[]; parentId: string | null; m: (typeof settingsMsg)["es"]; depth?: number }) {
  const children = entities.filter((e) => e.parentId === parentId);
  if (!children.length) return null;
  return (
    <ul className={cn("flex flex-col gap-2", depth > 0 && "mt-2 border-l border-line pl-4")}>
      {children.map((e) => {
        const Icon = e.kind === "company" ? Building2 : e.kind === "center" ? Store : Layers;
        return (
          <li key={e.id}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line bg-surface px-3 py-2">
              <Icon className="size-4 text-muted" aria-hidden />
              <span className="font-medium text-ink">{e.legalName ?? e.name}</span>
              <Badge tone="outline">{m.kind[e.kind]}</Badge>
              {e.nif ? (
                <span className="text-xs text-muted">
                  {m.nif} <span className="font-mono">{e.nif}</span>
                </span>
              ) : null}
              {e.address ? <span className="text-xs text-muted">{e.address}</span> : null}
              <span className="ml-auto">
                <PhaseBadge phase={e.phase} />
              </span>
            </div>
            <EntityTree entities={entities} parentId={e.id} m={m} depth={depth + 1} />
          </li>
        );
      })}
    </ul>
  );
}

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireOrg(decodeURIComponent((await params).org));
  const sp = await searchParams;
  const raw = first(sp.tab);
  const tab: SettingsTab = (SETTINGS_TABS as readonly string[]).includes(raw ?? "") ? (raw as SettingsTab) : "profile";
  const m = settingsMsg[ctx.lang];
  const c = common[ctx.lang];
  const base = orgPath(ctx.org.id, "settings");
  const showAudit = ctx.flags.audit && can(ctx.role, ctx.staff, "audit.view");
  const membership = ctx.viewer.user.memberships.find((x) => x.orgId === ctx.org.id);

  let body: React.ReactNode = null;
  if (tab === "profile") {
    const u = ctx.viewer.user;
    body = (
      <Card>
        <CardHeader>
          <CardTitle>{m.profileTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-full bg-forest text-lg font-semibold text-band-fg">{u.initials}</span>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted">{m.name}</dt>
              <dd className="font-medium">{u.name}</dd>
              <dt className="text-muted">{m.email}</dt>
              <dd>{u.email}</dd>
              <dt className="text-muted">{m.role}</dt>
              <dd>{ctx.staff ? c.staff : membership ? c.role[membership.role] : "—"}</dd>
            </dl>
          </div>
          {ctx.staff ? <p className="rounded-md bg-paper-alt px-3 py-2 text-sm text-ink-2">{m.staffNote}</p> : null}
          <LanguagePicker />
          <p className="flex items-center gap-2 text-xs text-muted">
            <MonitorSmartphone className="size-4" aria-hidden />
            {m.themeHint}
          </p>
        </CardContent>
      </Card>
    );
  } else if (tab === "users") {
    const [users, entities] = await Promise.all([api().listUsers(ctx.org.id), api().listEntities(ctx.org.id)]);
    body = (
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{m.usersTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <UsersPanel orgId={ctx.org.id} users={users} entities={entities} canManage={can(ctx.role, ctx.staff, "users.manage")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{m.rolesTitle}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{m.role}</th>
                  <th>{m.rolesWho}</th>
                  <th>{m.rolesWhat}</th>
                </tr>
              </thead>
              <tbody>
                {ROLES.map((r) => (
                  <tr key={r}>
                    <td className="whitespace-nowrap font-medium">{c.role[r]}</td>
                    <td className="text-muted">{m.roleWho[r]}</td>
                    <td className="text-ink-2">{m.roleWhat[r]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    );
  } else if (tab === "structure") {
    const entities = await api().listEntities(ctx.org.id);
    body = (
      <Card>
        <CardHeader>
          <CardTitle>{m.structureTitle}</CardTitle>
          <CardDescription>{m.structureHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center gap-2 font-medium">
            <Building2 className="size-4 text-brand-ink" aria-hidden />
            {ctx.org.name}
            <PhaseBadge phase={ctx.org.phase} />
          </div>
          <EntityTree entities={entities} parentId={null} m={m} />
        </CardContent>
      </Card>
    );
  } else if (tab === "notifications") {
    const prefs = await api().getNotificationPrefs(ctx.org.id, ctx.actor);
    body = (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{m.notifTitle}</CardTitle>
            <CardDescription>{m.notifHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationsPanel orgId={ctx.org.id} prefs={prefs} desktopEnabled={ctx.flags["notifications.desktop"]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{m.rulesTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-ink-2">
              {m.rules(ctx.org.workingHours.start, ctx.org.workingHours.end).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="mt-4 rounded-md bg-paper-alt px-3 py-2 text-xs text-muted">{m.desktopNote}</p>
          </CardContent>
        </Card>
      </div>
    );
  } else if (tab === "data") {
    body = (
      <Card>
        <CardHeader>
          <CardTitle>{m.dataTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataPanel org={ctx.org} canEdit={can(ctx.role, ctx.staff, "settings.edit")} />
        </CardContent>
      </Card>
    );
  } else {
    body = (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <KeyRound className="size-4 text-muted" aria-hidden />
              <CardTitle>{m.ssoTitle}</CardTitle>
              <Badge tone="outline">{m.ssoSoon}</Badge>
            </div>
            <CardDescription>{ctx.flags.sso ? m.ssoBody : m.ssoDisabled}</CardDescription>
          </CardHeader>
          <CardContent>
            <fieldset disabled className="grid gap-4 opacity-70">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sso-proto">{m.ssoProtocol}</Label>
                <Select id="sso-proto" defaultValue="saml">
                  <option value="saml">SAML 2.0</option>
                  <option value="oidc">OpenID Connect</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sso-meta">{m.ssoMetadata}</Label>
                <Input id="sso-meta" placeholder="https://login.microsoftonline.com/…/federationmetadata.xml" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sso-domain">{m.ssoDomain}</Label>
                <Input id="sso-domain" placeholder="empresa.com" />
              </div>
            </fieldset>
            <p className="mt-4 text-xs text-muted">{m.ssoContact} · contact@geminai-dx.com</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-muted" aria-hidden />
              <CardTitle>{m.sessionTitle}</CardTitle>
            </div>
            <CardDescription>{m.sessionBody}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {m.signedInAs} <span className="font-medium">{ctx.viewer.user.email}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow={m.eyebrow} title={m.title} description={m.description} />
      <nav aria-label={m.title} className="mb-6 flex flex-wrap items-center gap-1 rounded-md border border-line bg-paper-alt p-1">
        {SETTINGS_TABS.map((t) => (
          <Link
            key={t}
            href={t === "profile" ? base : `${base}?tab=${t}`}
            aria-current={tab === t ? "page" : undefined}
            className={cn("rounded-sm px-3 py-1.5 text-sm font-medium transition-colors", tab === t ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}
          >
            {m.tabs[t]}
          </Link>
        ))}
        {showAudit ? (
          <Link href={`${base}/audit`} className="ml-auto inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium text-brand-ink hover:bg-surface">
            <History className="size-4" aria-hidden />
            {m.audit}
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </nav>
      {body}
    </div>
  );
}
