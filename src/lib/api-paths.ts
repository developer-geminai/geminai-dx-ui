/**
 * Allow-list of read-only backend endpoints. Anything not matched here is refused before a
 * request ever leaves the Next.js server. Mirrors the routing in agent_console/server.py.
 */

export type BackendQuery = Partial<Record<"agent" | "q" | "status", string>>;

const ROOT_READS = new Set(["agents", "overview", "cases", "questions", "insights"]);
const MAX_ID = 180;

export function isSafeId(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_ID && !/[\\/\u0000-\u001f]/.test(value);
}

function cleanQuery(query: BackendQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ["agent", "q", "status"] as const) {
    const value = query[key];
    if (typeof value !== "string" || value === "") continue;
    const limit = key === "q" ? 100 : MAX_ID;
    if (value.length > limit || /[\u0000-\u001f]/.test(value)) continue;
    params.set(key, value);
  }
  return params;
}

/**
 * Returns "/api/…?…" for an allowed read, or null.
 * Accepted shapes: [read] | ["cases", agent, case] | ["cases", agent, case, "runs"|"audit"]
 *                  | ["cases", agent, case, "questions", question]
 */
export function buildBackendPath(segments: string[], query: BackendQuery = {}): string | null {
  let path: string | null = null;
  const [head, agent, kase, sub, question, ...rest] = segments;
  if (rest.length) return null;
  if (segments.length === 1 && head && ROOT_READS.has(head)) {
    path = `/api/${head}`;
  } else if (head === "cases" && isSafeId(agent) && isSafeId(kase)) {
    const base = `/api/cases/${encodeURIComponent(agent)}/${encodeURIComponent(kase)}`;
    if (segments.length === 3) path = base;
    else if (segments.length === 4 && (sub === "runs" || sub === "audit")) path = `${base}/${sub}`;
    else if (segments.length === 5 && sub === "questions" && isSafeId(question))
      path = `${base}/questions/${encodeURIComponent(question)}`;
  }
  if (!path) return null;
  const qs = path === "/api/agents" ? "" : cleanQuery(query).toString();
  return qs ? `${path}?${qs}` : path;
}
