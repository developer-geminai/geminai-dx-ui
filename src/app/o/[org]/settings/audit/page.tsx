import Link from "next/link";
import { ArrowLeft, Bot, Download, Lock, Server, User } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { LockedSection } from "@/components/locked-section";
import { PrintButton } from "@/components/settings/print-button";
import { AUDIT_TYPES, auditQueryString, parseAuditQuery } from "@/components/settings/audit-query";
import { api } from "@/lib/api";
import type { AuditEventType } from "@/lib/api/types";
import { requireOrg } from "@/lib/server/session";
import { common } from "@/lib/i18n/common";
import { defineMessages } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { fmt } from "@/lib/format";
import { first, orgPath } from "@/lib/utils";

export const dynamic = "force-dynamic";

const msg = defineMessages({
  es: {
    eyebrow: "Ajustes · Auditoría",
    title: "Auditoría",
    description: "Registro cronológico de todo lo que pasa: acciones de los agentes, respuestas humanas, cambios de configuración y firmas.",
    immutable: "Solo inserción, nunca edición. Nadie, tampoco GeminAI, puede modificar ni borrar un evento.",
    back: "Ajustes",
    from: "Desde",
    to: "Hasta",
    type: "Tipo",
    agent: "Agente",
    actor: "Usuario",
    q: "Buscar",
    qPlaceholder: "Acción, objeto…",
    apply: "Filtrar",
    clear: "Limpiar",
    csv: "Exportar CSV",
    pdf: "Exportar PDF",
    colAt: "Fecha",
    colActor: "Actor",
    colType: "Tipo",
    colAction: "Acción",
    colObject: "Objeto",
    colChange: "Antes → después",
    count: (n: number) => `${n} eventos`,
    empty: "Ningún evento coincide con los filtros.",
    masked: "Los registros afectados se muestran enmascarados.",
    actorType: { user: "Usuario", agent: "Agente", system: "Sistema" },
  },
  en: {
    eyebrow: "Settings · Audit log",
    title: "Audit log",
    description: "Chronological record of everything that happens: agent actions, human answers, configuration changes and signatures.",
    immutable: "Insert-only, never edited. Nobody, GeminAI included, can change or delete an event.",
    back: "Settings",
    from: "From",
    to: "To",
    type: "Type",
    agent: "Agent",
    actor: "User",
    q: "Search",
    qPlaceholder: "Action, object…",
    apply: "Filter",
    clear: "Clear",
    csv: "Export CSV",
    pdf: "Export PDF",
    colAt: "Date",
    colActor: "Actor",
    colType: "Type",
    colAction: "Action",
    colObject: "Object",
    colChange: "Before → after",
    count: (n: number) => `${n} events`,
    empty: "No event matches the filters.",
    masked: "Affected records are shown masked.",
    actorType: { user: "User", agent: "Agent", system: "System" },
  },
});

const TYPE_TONE: Record<AuditEventType, "done" | "info" | "outline" | "neutral"> = { agent_action: "neutral", human_answer: "done", config_change: "outline", signature: "info" };

export default async function AuditPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireOrg(decodeURIComponent((await params).org));
  if (!ctx.flags.audit) return <LockedSection ctx={ctx} section="settings" reason="hidden" />;
  if (!can(ctx.role, ctx.staff, "audit.view")) return <LockedSection ctx={ctx} section="settings" reason="forbidden" />;
  const sp = await searchParams;
  const query = parseAuditQuery((k) => first(sp[k]));
  const m = msg[ctx.lang];
  const c = common[ctx.lang];
  const f = fmt(ctx.lang);
  const [events, agents, users] = await Promise.all([api().listAudit(ctx.org.id, query), api().listAgents(ctx.org.id), api().listUsers(ctx.org.id)]);
  const base = orgPath(ctx.org.id, "settings", "audit");
  const qs = auditQueryString(query);

  return (
    <div>
      <div className="no-print mb-3">
        <Link href={orgPath(ctx.org.id, "settings")} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden />
          {m.back}
        </Link>
      </div>
      <PageHeader
        eyebrow={m.eyebrow}
        title={m.title}
        description={
          <>
            {m.description}
            <span className="mt-2 flex items-center gap-1.5 text-sm text-ink-2">
              <Lock className="size-3.5" aria-hidden />
              {m.immutable}
            </span>
          </>
        }
        actions={
          <div className="no-print flex gap-2">
            <Button asChild variant="line" size="sm">
              <a href={`${base}/export${qs}`}>
                <Download aria-hidden />
                {m.csv}
              </a>
            </Button>
            <PrintButton label={m.pdf} />
          </div>
        }
      />

      <form method="get" action={base} className="no-print mb-4 grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_minmax(0,1.4fr)_auto]">
        <div className="flex flex-col gap-1">
          <Label htmlFor="a-from">{m.from}</Label>
          <Input id="a-from" type="date" name="from" defaultValue={query.from} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="a-to">{m.to}</Label>
          <Input id="a-to" type="date" name="to" defaultValue={query.to} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="a-type">{m.type}</Label>
          <Select id="a-type" name="type" defaultValue={query.type ?? ""}>
            <option value="">{c.actions.all}</option>
            {AUDIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {c.auditType[t]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="a-agent">{m.agent}</Label>
          <Select id="a-agent" name="agentId" defaultValue={query.agentId ?? ""}>
            <option value="">{c.actions.all}</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="a-actor">{m.actor}</Label>
          <Select id="a-actor" name="actor" defaultValue={query.actorId ?? ""}>
            <option value="">{c.actions.all}</option>
            {users.map((u) => (
              <option key={u.id} value={u.name}>
                {u.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="a-q">{m.q}</Label>
          <Input id="a-q" name="q" defaultValue={query.q} placeholder={m.qPlaceholder} />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" size="md">
            {m.apply}
          </Button>
          {qs ? (
            <Button asChild variant="ghost" size="md">
              <Link href={base}>{m.clear}</Link>
            </Button>
          ) : null}
        </div>
      </form>

      <p className="mb-2 text-xs text-muted">
        {m.count(events.length)} · {m.masked}
      </p>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          {events.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{m.colAt}</th>
                  <th>{m.colActor}</th>
                  <th>{m.colType}</th>
                  <th>{m.colAction}</th>
                  <th>{m.colObject}</th>
                  <th>{m.colChange}</th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 500).map((e) => {
                  const Icon = e.actor.type === "agent" ? Bot : e.actor.type === "system" ? Server : User;
                  return (
                    <tr key={e.id}>
                      <td className="tabular whitespace-nowrap text-muted">{f.dateTime(e.at)}</td>
                      <td className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5" title={m.actorType[e.actor.type]}>
                          <Icon className="size-3.5 text-muted" aria-label={m.actorType[e.actor.type]} />
                          {e.actor.label}
                        </span>
                      </td>
                      <td>
                        <Badge tone={TYPE_TONE[e.type]}>{c.auditType[e.type]}</Badge>
                      </td>
                      <td className="text-ink">{e.action}</td>
                      <td className="max-w-[28rem] text-ink-2">{e.object}</td>
                      <td className="whitespace-nowrap font-mono text-xs text-muted">{e.before || e.after ? `${e.before ?? "—"} → ${e.after ?? "—"}` : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-5">
              <EmptyState title={m.empty} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
