import { type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { requireOrg } from "@/lib/server/session";
import { can } from "@/lib/permissions";
import { parseAuditQuery } from "@/components/settings/audit-query";

export const dynamic = "force-dynamic";

const cell = (v: string | undefined) => {
  const s = (v ?? "").replace(/\r?\n/g, " ");
  // Quote, escape quotes and neutralise spreadsheet formula injection.
  return `"${(/^[=+\-@\t]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ org: string }> }) {
  const ctx = await requireOrg(decodeURIComponent((await params).org));
  if (!ctx.flags.audit || !can(ctx.role, ctx.staff, "audit.view")) return new Response("Forbidden", { status: 403 });
  const query = parseAuditQuery((k) => req.nextUrl.searchParams.get(k));
  const events = await api().listAudit(ctx.org.id, query);
  const header = ["at", "actor_type", "actor", "type", "action", "object", "before", "after"];
  const lines = [header.join(","), ...events.map((e) => [e.at, e.actor.type, e.actor.label, e.type, e.action, e.object, e.before, e.after].map(cell).join(","))];
  const date = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="auditoria-${ctx.org.id}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
