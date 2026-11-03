import "server-only";
import type { PortalApi } from "./contract";

/**
 * HTTP implementation of PortalApi — the REST contract the backend must serve (see docs/API.md).
 * Not used by the demo (GDX_API_MODE defaults to "mock"). Every path is relative to GDX_API_URL,
 * e.g. https://api.geminai-dx.com. `actor` travels as the X-GDX-Actor header; in production the
 * server must derive it from the session token instead of trusting the header.
 */
export function createHttpApi(baseUrl: string, token?: () => Promise<string | undefined>): PortalApi {
  async function call<T>(method: string, path: string, body?: unknown, actor?: string): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (actor) headers["X-GDX-Actor"] = actor;
    const t = await token?.();
    if (t) headers.Authorization = `Bearer ${t}`;
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
    if (res.status === 404 && method === "GET") return null as T;
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
  const o = (orgId: string) => `/orgs/${encodeURIComponent(orgId)}`;
  const qs = (p?: object) => {
    if (!p) return "";
    const s = new URLSearchParams(Object.entries(p).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString();
    return s ? `?${s}` : "";
  };

  return {
    authenticate: (email, password) => call("POST", "/auth/login", { email, password }),
    authenticateSso: (provider) => call("POST", `/auth/sso/${provider}`),
    getViewer: (userId) => call("GET", `/users/${userId}/viewer`),

    getOrganization: (orgId) => call("GET", o(orgId)),
    listEntities: (orgId) => call("GET", `${o(orgId)}/entities`),
    updateSettings: (orgId, actor, input) => call("PATCH", `${o(orgId)}/settings`, input, actor),
    setPhase: (orgId, actor, phase) => call("PUT", `${o(orgId)}/phase`, { phase }, actor),
    getFeatureFlags: (orgId) => call("GET", `${o(orgId)}/features`),
    setFeatureFlag: (orgId, actor, key, enabled) => call("PUT", `${o(orgId)}/features/${key}`, { enabled }, actor),

    getHome: (orgId) => call("GET", `${o(orgId)}/home`),

    getOnboarding: (orgId) => call("GET", `${o(orgId)}/onboarding`),
    saveCompany: (orgId, actor, company) => call("PUT", `${o(orgId)}/onboarding/company`, company, actor),
    completeOnboardingStep: (orgId, actor, step) => call("POST", `${o(orgId)}/onboarding/steps/${step}/complete`, undefined, actor),

    listDevices: (orgId) => call("GET", `${o(orgId)}/devices`),
    setDeviceCapture: (orgId, actor, deviceId, enabled) => call("PUT", `${o(orgId)}/devices/${deviceId}/capture`, { enabled }, actor),
    getTrackerDownload: (orgId) => call("GET", `${o(orgId)}/tracker/download`),
    listBlockRules: (orgId) => call("GET", `${o(orgId)}/block-rules`),
    upsertBlockRule: (orgId, actor, rule) => (rule.id ? call("PUT", `${o(orgId)}/block-rules/${rule.id}`, rule, actor) : call("POST", `${o(orgId)}/block-rules`, rule, actor)),
    deleteBlockRule: (orgId, actor, ruleId) => call("DELETE", `${o(orgId)}/block-rules/${ruleId}`, undefined, actor),
    getTransparency: (orgId) => call("GET", `${o(orgId)}/transparency`),

    listDiagnostics: (orgId) => call("GET", `${o(orgId)}/diagnostics`),
    getDiagnosticProgress: (orgId) => call("GET", `${o(orgId)}/diagnostics/current/progress`),
    getDiagnosticResults: (orgId, diagnosticId) => call("GET", `${o(orgId)}/diagnostics/${diagnosticId ?? "latest"}/results`),
    listOpportunities: (orgId) => call("GET", `${o(orgId)}/opportunities`),

    listAgents: (orgId, filter) => call("GET", `${o(orgId)}/agents${qs(filter)}`),
    getAgent: (orgId, agentId) => call("GET", `${o(orgId)}/agents/${agentId}`),
    pauseAgent: (orgId, actor, agentId, reason) => call("POST", `${o(orgId)}/agents/${agentId}/pause`, { reason }, actor),
    resumeAgent: (orgId, actor, agentId) => call("POST", `${o(orgId)}/agents/${agentId}/resume`, undefined, actor),
    promoteAgent: (orgId, actor, agentId) => call("POST", `${o(orgId)}/agents/${agentId}/promote`, undefined, actor),
    listRuns: (orgId, filter) => call("GET", `${o(orgId)}/runs${qs(filter)}`),
    getRun: (orgId, runId) => call("GET", `${o(orgId)}/runs/${runId}`),
    getShadowReport: (orgId, agentId) => call("GET", `${o(orgId)}/agents/${agentId}/shadow`),
    listRules: (orgId, agentId) => call("GET", `${o(orgId)}/rules${qs({ agentId })}`),
    updateRule: (orgId, actor, ruleId, patch) => call("PATCH", `${o(orgId)}/rules/${ruleId}`, patch, actor),
    deleteRule: (orgId, actor, ruleId) => call("DELETE", `${o(orgId)}/rules/${ruleId}`, undefined, actor),
    getPerformance: (orgId, agentId) => call("GET", `${o(orgId)}/agents/${agentId}/performance`),

    listQuestions: (orgId, filter) => call("GET", `${o(orgId)}/questions${qs(filter)}`),
    getQuestion: (orgId, questionId) => call("GET", `${o(orgId)}/questions/${questionId}`),
    answerQuestion: (orgId, actor, questionId, input) => call("POST", `${o(orgId)}/questions/${questionId}/answer`, input, actor),
    reassignQuestion: (orgId, actor, questionId, assignee) => call("PUT", `${o(orgId)}/questions/${questionId}/assignee`, assignee, actor),

    listContracts: (orgId) => call("GET", `${o(orgId)}/contracts`),
    signContract: (orgId, actor, contractId) => call("POST", `${o(orgId)}/contracts/${contractId}/sign`, undefined, actor),

    getBilling: (orgId) => call("GET", `${o(orgId)}/billing`),

    listUsers: (orgId) => call("GET", `${o(orgId)}/users`),
    inviteUser: (orgId, actor, input) => call("POST", `${o(orgId)}/users`, input, actor),
    updateMembership: (orgId, actor, userId, role, scopeEntityId) => call("PUT", `${o(orgId)}/users/${userId}/membership`, { role, scopeEntityId }, actor),
    getNotificationPrefs: (orgId, userId) => call("GET", `${o(orgId)}/users/${userId}/notifications`),
    updateNotificationPrefs: (orgId, actor, prefs) => call("PUT", `${o(orgId)}/users/${prefs.userId}/notifications`, prefs, actor),

    listAudit: (orgId, query) => call("GET", `${o(orgId)}/audit${qs(query)}`),

    listServiceRequests: (orgId) => call("GET", `${o(orgId)}/service-requests`),
    createServiceRequest: (orgId, actor, input) => call("POST", `${o(orgId)}/service-requests`, input, actor),

    getInternalCosts: (orgId) => call("GET", `/internal${o(orgId)}/costs`),
  };
}
