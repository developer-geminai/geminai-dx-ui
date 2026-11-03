import type {
  Agent,
  AgentMode,
  AgentPerformance,
  AnswerInput,
  AuditEvent,
  AuditQuery,
  BillingOverview,
  BlockRule,
  CompanyDetails,
  Contract,
  Device,
  Diagnostic,
  DiagnosticProgress,
  DiagnosticResults,
  FeatureFlags,
  FeatureKey,
  HomeSummary,
  InternalCosts,
  LearnedRule,
  NotificationPrefs,
  OnboardingState,
  OnboardingStepKey,
  Opportunity,
  OrgEntity,
  OrgSettingsInput,
  Organization,
  Phase,
  Question,
  QuestionStatus,
  Role,
  Run,
  RunDetail,
  RunStatus,
  ServiceRequest,
  ServiceRequestKind,
  ShadowReport,
  TransparencyInfo,
  User,
  Viewer,
} from "./types";

/**
 * The one seam between the UI and the backend.
 *
 * - `mock` implementation (src/lib/api/mock) keeps an in-memory, per-organization store seeded
 *   with fictional data, so every screen and every action works without a server.
 * - `http` implementation (src/lib/api/http.ts) maps each method to the REST endpoint documented
 *   in docs/API.md. Switch with GDX_API_MODE=http + GDX_API_URL.
 *
 * Every method is scoped by `orgId` (row-level tenancy on the server). `actor` is the signed-in
 * user id, passed explicitly so the server can write the audit trail.
 */
export interface PortalApi {
  /* Session */
  authenticate(email: string, password: string): Promise<User | null>;
  authenticateSso(provider: "google" | "microsoft"): Promise<User | null>;
  getViewer(userId: string): Promise<Viewer | null>;

  /* Organization */
  getOrganization(orgId: string): Promise<Organization | null>;
  listEntities(orgId: string): Promise<OrgEntity[]>;
  updateSettings(orgId: string, actor: string, input: OrgSettingsInput): Promise<Organization>;
  /** Demo/roadmap control: move the organization to a phase. On the real API this is internal-only. */
  setPhase(orgId: string, actor: string, phase: Phase): Promise<Organization>;
  getFeatureFlags(orgId: string): Promise<FeatureFlags>;
  setFeatureFlag(orgId: string, actor: string, key: FeatureKey, enabled: boolean): Promise<FeatureFlags>;

  /* Home */
  getHome(orgId: string): Promise<HomeSummary>;

  /* Onboarding */
  getOnboarding(orgId: string): Promise<OnboardingState>;
  saveCompany(orgId: string, actor: string, company: CompanyDetails): Promise<OnboardingState>;
  completeOnboardingStep(orgId: string, actor: string, step: OnboardingStepKey): Promise<OnboardingState>;

  /* Devices & privacy */
  listDevices(orgId: string): Promise<Device[]>;
  setDeviceCapture(orgId: string, actor: string, deviceId: string, enabled: boolean): Promise<Device>;
  getTrackerDownload(orgId: string): Promise<{ windowsUrl: string; macUrl: string; enrollmentCode: string; version: string }>;
  listBlockRules(orgId: string): Promise<BlockRule[]>;
  upsertBlockRule(orgId: string, actor: string, rule: Omit<BlockRule, "id" | "author" | "updatedAt"> & { id?: string }): Promise<BlockRule>;
  deleteBlockRule(orgId: string, actor: string, ruleId: string): Promise<void>;
  getTransparency(orgId: string): Promise<TransparencyInfo>;

  /* Diagnostic */
  listDiagnostics(orgId: string): Promise<Diagnostic[]>;
  getDiagnosticProgress(orgId: string): Promise<DiagnosticProgress | null>;
  getDiagnosticResults(orgId: string, diagnosticId?: string): Promise<DiagnosticResults | null>;
  listOpportunities(orgId: string): Promise<Opportunity[]>;

  /* Agents */
  listAgents(orgId: string, filter?: { mode?: AgentMode; area?: string }): Promise<Agent[]>;
  getAgent(orgId: string, agentId: string): Promise<Agent | null>;
  pauseAgent(orgId: string, actor: string, agentId: string, reason: string): Promise<Agent>;
  resumeAgent(orgId: string, actor: string, agentId: string): Promise<Agent>;
  /** Shadow → Supervised (Responsable de proceso). */
  promoteAgent(orgId: string, actor: string, agentId: string): Promise<Agent>;
  listRuns(orgId: string, filter?: { agentId?: string; status?: RunStatus; limit?: number }): Promise<Run[]>;
  getRun(orgId: string, runId: string): Promise<RunDetail | null>;
  getShadowReport(orgId: string, agentId: string): Promise<ShadowReport | null>;
  listRules(orgId: string, agentId?: string): Promise<LearnedRule[]>;
  updateRule(orgId: string, actor: string, ruleId: string, patch: Partial<Pick<LearnedRule, "condition" | "action" | "active">>): Promise<LearnedRule>;
  deleteRule(orgId: string, actor: string, ruleId: string): Promise<void>;
  getPerformance(orgId: string, agentId: string): Promise<AgentPerformance>;

  /* Questions inbox */
  listQuestions(orgId: string, filter?: { status?: QuestionStatus; agentId?: string; assignedTo?: string }): Promise<Question[]>;
  getQuestion(orgId: string, questionId: string): Promise<Question | null>;
  answerQuestion(orgId: string, actor: string, questionId: string, input: AnswerInput): Promise<Question>;
  reassignQuestion(orgId: string, actor: string, questionId: string, assignee: Question["assignee"]): Promise<Question>;

  /* Contracts */
  listContracts(orgId: string): Promise<Contract[]>;
  signContract(orgId: string, actor: string, contractId: string): Promise<Contract>;

  /* Billing */
  getBilling(orgId: string): Promise<BillingOverview | null>;

  /* Users & settings */
  listUsers(orgId: string): Promise<User[]>;
  inviteUser(orgId: string, actor: string, input: { email: string; name: string; role: Role; scopeEntityId: string | null }): Promise<User>;
  updateMembership(orgId: string, actor: string, userId: string, role: Role, scopeEntityId: string | null): Promise<User>;
  getNotificationPrefs(orgId: string, userId: string): Promise<NotificationPrefs>;
  updateNotificationPrefs(orgId: string, actor: string, prefs: NotificationPrefs): Promise<NotificationPrefs>;

  /* Audit (append-only) */
  listAudit(orgId: string, query?: AuditQuery): Promise<AuditEvent[]>;

  /* Expand service → CRM opportunity */
  listServiceRequests(orgId: string): Promise<ServiceRequest[]>;
  createServiceRequest(orgId: string, actor: string, input: { kind: ServiceRequestKind; note: string; opportunityId?: string; department?: string }): Promise<ServiceRequest>;

  /* Internal view (GeminAI staff only) */
  getInternalCosts(orgId: string): Promise<InternalCosts>;
}
