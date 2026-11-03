import "server-only";
import rawSnapshot from "./snapshot.json";
import type { BackendQuery } from "../../api-paths";

/**
 * DEMO DATA SOURCE.
 *
 * This deployment does not talk to any agent backend. Every read is served from
 * `snapshot.json`, a capture of the fictional, synthetic multi-agent demo that ships with the
 * GeminAI Dx Python agent console (`--demo`). No real organization, customer or case is included.
 *
 * Timestamps are shifted forward by whole days at load so the newest demo event is always
 * "recent" (time-window analytics keep working). The sealed audit export is served unchanged so
 * its embedded SHA-256 digest still matches its bytes.
 */

interface CaseItem {
  id: string;
  agent_id: string;
  status?: string;
  title?: string;
  status_label?: string;
  subject?: string | null;
  [key: string]: unknown;
}

interface OrgSnapshot {
  agents: unknown;
  overview: Record<string, unknown>;
  questions: Record<string, unknown>;
  insights: Record<string, unknown>;
  cases: { items: CaseItem[]; [key: string]: unknown };
  caseDetails: Record<string, unknown>;
  runs: Record<string, unknown>;
  audit: Record<string, string>;
  questionContexts: Record<string, unknown>;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
const DAY_MS = 86_400_000;

function newestTimestamp(value: unknown, key = ""): number {
  if (typeof value === "string" && ISO.test(value)) return Date.parse(value) || 0;
  if (typeof value === "number" && key.endsWith("_at") && value > 1e9 && value < 1e11) return value * 1000;
  if (Array.isArray(value)) return value.reduce<number>((m, v) => Math.max(m, newestTimestamp(v)), 0);
  if (value && typeof value === "object") {
    return Object.entries(value).reduce<number>((m, [k, v]) => Math.max(m, newestTimestamp(v, k)), 0);
  }
  return 0;
}

function shift(value: unknown, offsetMs: number, key = ""): unknown {
  if (typeof value === "string" && ISO.test(value)) {
    const t = Date.parse(value);
    if (!t) return value;
    // Keep the original UTC offset notation simple: emit UTC.
    return new Date(t + offsetMs).toISOString();
  }
  if (typeof value === "number" && key.endsWith("_at") && value > 1e9 && value < 1e11) return value + offsetMs / 1000;
  if (Array.isArray(value)) return value.map((v) => shift(v, offsetMs));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === "audit" ? v : shift(v, offsetMs, k)]));
  }
  return value;
}

function prepare(): Record<string, OrgSnapshot> {
  const snapshot = rawSnapshot as unknown as Record<string, OrgSnapshot>;
  const newest = newestTimestamp(Object.values(snapshot).map((o) => ({ ...o, audit: undefined })));
  const offsetDays = newest ? Math.max(0, Math.floor((Date.now() - newest) / DAY_MS)) : 0;
  return shift(snapshot, offsetDays * DAY_MS) as Record<string, OrgSnapshot>;
}

let prepared: Record<string, OrgSnapshot> | null = null;
function data(orgId: string): OrgSnapshot | undefined {
  prepared ??= prepare();
  return prepared[orgId];
}

export interface DemoResponse {
  status: number;
  body: string;
}

const json = (status: number, value: unknown): DemoResponse => ({ status, body: JSON.stringify(value) });
const notFound = (what: string) => json(404, { error: `${what} not found` });

function casesResponse(org: OrgSnapshot, orgId: string, query: BackendQuery): unknown {
  const agent = query.agent && query.agent !== "all" ? query.agent : "all";
  const status = query.status && query.status !== "all" ? query.status : "";
  const term = (query.q ?? "").trim().toLowerCase().slice(0, 100);
  const inScope = org.cases.items.filter((c) => (agent === "all" || c.agent_id === agent) && (!status || c.status === status));
  const items = inScope.filter(
    (c) => !term || [c.id, c.title, c.status_label, c.subject].some((v) => typeof v === "string" && v.toLowerCase().includes(term)),
  );
  return {
    ...org.cases,
    items,
    total_in_status: inScope.length,
    matched_in_scanned_window: items.length,
    truncated_search: false,
    organization: orgId,
    agent_filter: agent,
  };
}

/** Serve one allow-listed read (same shapes as the Python agent-console API) from the snapshot. */
export function demoRead(orgId: string, segments: string[], query: BackendQuery = {}): DemoResponse {
  const org = data(orgId);
  if (!org) return notFound("Organization");
  const [head, agentId, caseId, sub, questionId] = segments;
  const agentKey = query.agent && query.agent !== "all" ? query.agent : "all";

  if (segments.length === 1) {
    switch (head) {
      case "agents":
        return json(200, org.agents);
      case "cases":
        return json(200, casesResponse(org, orgId, query));
      case "overview":
      case "questions":
      case "insights": {
        const value = org[head][agentKey];
        return value === undefined ? json(400, { error: "Unknown agent" }) : json(200, value);
      }
      default:
        return json(400, { error: "Unknown read endpoint" });
    }
  }
  if (head !== "cases" || !agentId || !caseId) return json(400, { error: "Unknown read endpoint" });
  const key = `${agentId}/${caseId}`;
  if (segments.length === 3) return org.caseDetails[key] ? json(200, org.caseDetails[key]) : notFound("Case");
  if (sub === "runs") return org.runs[key] ? json(200, org.runs[key]) : notFound("Case");
  if (sub === "audit") return org.audit[key] ? { status: 200, body: org.audit[key] } : notFound("Case");
  if (sub === "questions" && questionId) {
    const ctx = org.questionContexts[`${key}/${questionId}`];
    return ctx ? json(200, ctx) : notFound("Question");
  }
  return json(400, { error: "Unknown read endpoint" });
}
