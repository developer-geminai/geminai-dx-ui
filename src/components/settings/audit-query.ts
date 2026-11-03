import type { AuditEventType, AuditQuery } from "@/lib/api/types";

const TYPES: AuditEventType[] = ["agent_action", "human_answer", "config_change", "signature"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse audit filters from URL params (page and CSV export share this). */
export function parseAuditQuery(get: (k: string) => string | null | undefined): AuditQuery {
  const s = (k: string) => {
    const v = get(k)?.trim();
    return v ? v.slice(0, 200) : undefined;
  };
  const type = s("type");
  const from = s("from");
  const to = s("to");
  return {
    type: type && (TYPES as string[]).includes(type) ? (type as AuditEventType) : undefined,
    agentId: s("agentId"),
    actorId: s("actor"),
    from: from && DATE.test(from) ? from : undefined,
    to: to && DATE.test(to) ? to : undefined,
    q: s("q"),
  };
}

export function auditQueryString(q: AuditQuery): string {
  const p = new URLSearchParams();
  if (q.type) p.set("type", q.type);
  if (q.agentId) p.set("agentId", q.agentId);
  if (q.actorId) p.set("actor", q.actorId);
  if (q.from) p.set("from", q.from);
  if (q.to) p.set("to", q.to);
  if (q.q) p.set("q", q.q);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const AUDIT_TYPES = TYPES;
