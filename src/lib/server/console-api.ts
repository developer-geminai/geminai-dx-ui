import "server-only";
import type { OrganizationConfig } from "./config";
import { ConfigurationError } from "./config";
import type {
  AgentsResponse,
  CaseDetail,
  CasesResponse,
  Insights,
  OverviewResponse,
  QuestionContext,
  QuestionsResponse,
  Run,
} from "../types";
import { buildBackendPath, type BackendQuery } from "../api-paths";
import { demoRead, type DemoResponse } from "./demo/data";

/**
 * Read client for one organization.
 *
 * DEMO BUILD: reads are served from the bundled synthetic snapshot (see ./demo/data.ts) instead
 * of a Python agent-console backend. The allow-list, organization check and error handling are
 * the same as in the production client, so pages behave identically.
 */

export class BackendError extends Error {
  override name = "BackendError";
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function declaredOrganization(body: unknown): string | undefined {
  if (body && typeof body === "object") {
    const rec = body as Record<string, unknown>;
    const value = rec.organization ?? rec.organization_id;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

export function backendFetch(org: OrganizationConfig, segments: string[], query: BackendQuery = {}): DemoResponse {
  if (!buildBackendPath(segments, query)) throw new BackendError("This read is not available.", 400);
  return demoRead(org.id, segments, query);
}

export async function backendJson<T>(org: OrganizationConfig, segments: string[], query: BackendQuery = {}): Promise<T> {
  const res = backendFetch(org, segments, query);
  const body: unknown = JSON.parse(res.body);
  if (res.status >= 400) {
    const error = (body as { error?: unknown }).error;
    throw new BackendError(typeof error === "string" ? error : `HTTP ${res.status}`, res.status);
  }
  const declared = declaredOrganization(body);
  if (declared !== undefined && declared !== org.id) {
    throw new BackendError("The data source returned data for a different organization; the response was discarded.", 502);
  }
  return body as T;
}

const agentQuery = (agent?: string) => (agent && agent !== "all" ? { agent } : {});

export function createConsoleClient(org: OrganizationConfig) {
  return {
    organization: org,
    agents: () => backendJson<AgentsResponse>(org, ["agents"]),
    overview: (agent?: string) => backendJson<OverviewResponse>(org, ["overview"], agentQuery(agent)),
    cases: (opts: { agent?: string; q?: string; status?: string } = {}) =>
      backendJson<CasesResponse>(org, ["cases"], {
        ...agentQuery(opts.agent),
        ...(opts.q ? { q: opts.q } : {}),
        ...(opts.status ? { status: opts.status } : {}),
      }),
    questions: (agent?: string) => backendJson<QuestionsResponse>(org, ["questions"], agentQuery(agent)),
    insights: (agent?: string) => backendJson<Insights>(org, ["insights"], agentQuery(agent)),
    caseDetail: (agentId: string, caseId: string) => backendJson<CaseDetail>(org, ["cases", agentId, caseId]),
    runs: (agentId: string, caseId: string) =>
      backendJson<{ items: Run[]; agent_id: string; case_id: string }>(org, ["cases", agentId, caseId, "runs"]),
    questionContext: (agentId: string, caseId: string, questionId: string) =>
      backendJson<QuestionContext>(org, ["cases", agentId, caseId, "questions", questionId]),
  };
}

export type ConsoleClient = ReturnType<typeof createConsoleClient>;

/** Convert thrown errors into a safe, displayable message (never leaks stack traces). */
export function describeError(err: unknown): { title: string; detail: string; status: number } {
  if (err instanceof BackendError) {
    if (err.status === 404) return { title: "Not found", detail: err.message, status: 404 };
    if (err.status === 403) return { title: "Access restricted", detail: err.message, status: 403 };
    if (err.status === 503) return { title: "Agent backend unavailable", detail: err.message, status: 503 };
    return { title: "Could not load data", detail: err.message, status: err.status };
  }
  if (err instanceof ConfigurationError) return { title: "Configuration required", detail: err.message, status: 500 };
  return { title: "Unexpected error", detail: "The data could not be loaded.", status: 500 };
}
