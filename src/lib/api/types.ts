/**
 * Client portal domain model — the contract between this UI and the GeminAI Dx backend.
 *
 * Mirrors the "Implicaciones para el backend" entity table of the UI spec (v0.1). Everything hangs
 * off an Organization (multi-tenant root, `org_id` + row-level policies on the server). Timestamps
 * are ISO-8601 strings. Money is plain euros (number, 2 decimals); if the real API uses minor units,
 * convert inside the http client so components stay unchanged.
 *
 * Personal data never reaches the UI unmasked: fields named `masked*` / `MaskedField` arrive
 * already masked from the server.
 */

export type ISODate = string;
export type Lang = "es" | "en";

/* ───────────────────────────── Organization & structure ───────────────────────────── */

/** Client lifecycle. Product phases 0/1/2; the spec's 5 phases fold into these three. */
export type Phase = "onboarding" | "diagnostic" | "automation";
export const PHASES: Phase[] = ["onboarding", "diagnostic", "automation"];

/** Industry profile, only used by the mock to pick realistic demo content. */
export type OrgProfile = "healthcare" | "logistics" | "manufacturing";

export interface Organization {
  id: string;
  name: string;
  /** Current phase of the organization (the most advanced of its areas). */
  phase: Phase;
  profile: OrgProfile;
  /** €/h set by the client to value hours saved. null → only hours are shown, never €. */
  hourlyRate: number | null;
  currency: "EUR";
  lang: Lang;
  /** Data retention for captured activity. */
  retention: "18m" | "90d";
  /** Converted to a paying client (unlocks Billing). */
  paying: boolean;
  /** Timezone + working hours (notifications only go out inside them). */
  timezone: string;
  workingHours: { start: string; end: string; days: number[] };
  createdAt: ISODate;
}

export type EntityKind = "company" | "center" | "department";

/** Sociedad / centro / departamento. Phases coexist per area, not per client. */
export interface OrgEntity {
  id: string;
  orgId: string;
  parentId: string | null;
  kind: EntityKind;
  name: string;
  legalName?: string;
  nif?: string;
  address?: string;
  /** Phase of this area (a client can be in Diagnostic for one department and Automation in another). */
  phase: Phase;
}

/* ───────────────────────────── Users & roles ───────────────────────────── */

export type Role = "admin" | "process_owner" | "reviewer" | "finance" | "signer";
export const ROLES: Role[] = ["admin", "process_owner", "reviewer", "finance", "signer"];

export interface Membership {
  orgId: string;
  role: Role;
  /** Entity the role is scoped to (center or department); null = whole organization. */
  scopeEntityId: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  /** GeminAI team superadmin: sees the client selector + internal view, never listed as a client user. */
  geminaiStaff: boolean;
  memberships: Membership[];
  status: "active" | "invited";
  lastSeenAt: ISODate | null;
}

/** Current viewer as resolved by the session. */
export interface Viewer {
  user: User;
  /** Organizations this viewer can open (all of them for GeminAI staff). */
  organizations: Pick<Organization, "id" | "name" | "phase">[];
}

/* ───────────────────────────── Feature flags (Roadmap) ───────────────────────────── */

export type FeatureKey =
  | "home"
  | "onboarding.wizard"
  | "devices.list"
  | "devices.blocklist"
  | "devices.transparency"
  | "contracts"
  | "diagnostic.progress"
  | "diagnostic.results"
  | "diagnostic.history"
  | "agents.list"
  | "agents.summary"
  | "agents.runs"
  | "agents.shadow"
  | "agents.learned"
  | "agents.performance"
  | "agents.pause"
  | "questions"
  | "notifications.desktop"
  | "audit"
  | "billing"
  | "expand"
  | "internal.costs"
  | "sso";

export interface FeatureFlags {
  orgId: string;
  flags: Record<FeatureKey, boolean>;
}

/* ───────────────────────────── Onboarding ───────────────────────────── */

export type OnboardingStepKey = "account" | "company" | "contracts" | "privacy" | "devices" | "done";
export const ONBOARDING_STEPS: OnboardingStepKey[] = ["account", "company", "contracts", "privacy", "devices", "done"];

export interface CompanyDetails {
  legalName: string;
  nif: string;
  address: string;
  city: string;
  /** Contract model: GDX-CL-01 (clinics) or GDX-CL-03 (companies). */
  contractModel: "clinic" | "company";
  signer: { name: string; role: string; email: string };
  incidentContact: { name: string; email: string; phone: string };
  /** Workers' legal representation exists (adds 15-day notice; 4D Legal review). */
  workersRepresentation: boolean;
  pilotStart: string;
  pilotEnd: string;
  positions: string;
}

export interface OnboardingState {
  orgId: string;
  completed: Record<OnboardingStepKey, boolean>;
  current: OnboardingStepKey;
  company: CompanyDetails;
  invitedEmails: string[];
}

/* ───────────────────────────── Devices & privacy ───────────────────────────── */

export type DeviceStatus = "online" | "idle" | "offline" | "paused" | "pending";

/** A computer with the tracker. No employee personal data: alias + department only. */
export interface Device {
  id: string;
  alias: string;
  department: string;
  os: "windows" | "macos";
  trackerVersion: string;
  status: DeviceStatus;
  captureEnabled: boolean;
  lastEventAt: ISODate | null;
  installedAt: ISODate | null;
  eventsToday: number;
}

export type BlockRuleKind = "app" | "url" | "category";

export interface BlockRule {
  id: string;
  kind: BlockRuleKind;
  /** Executable, domain or category key. */
  value: string;
  label: string;
  description?: string;
  /** Icon hint for apps/urls (lucide name or initials). */
  icon?: string;
  /** true = analyze, false = "No analizar" (blocked). */
  analyze: boolean;
  /** Category rules: recommended default from the contract. */
  sensitive?: boolean;
  author: string;
  updatedAt: ISODate;
}

export interface TransparencyInfo {
  orgName: string;
  captured: string[];
  notCaptured: string[];
  blocked: BlockRule[];
  retention: Organization["retention"];
  contact: { name: string; email: string };
  dpoEmail: string;
}

/* ───────────────────────────── Diagnostic ───────────────────────────── */

export type DiagnosticType = "initial" | "expansion" | "review";
export type DiagnosticStatus = "scheduled" | "capturing" | "analyzing" | "ready";

export interface Diagnostic {
  id: string;
  type: DiagnosticType;
  scope: string;
  startedAt: ISODate;
  endsAt: ISODate;
  status: DiagnosticStatus;
  /** Capture day (1..totalDays). */
  day: number;
  totalDays: number;
  devicesActive: number;
  devicesTotal: number;
}

export interface DiagnosticProgress {
  diagnostic: Diagnostic;
  /** Aggregated by team, never per person. Hours of captured activity per day. */
  daily: { date: ISODate; byTeam: Record<string, number> }[];
  teams: string[];
  /** Devices that have not sent data for 48 h. */
  silentDevices: Pick<Device, "id" | "alias" | "department" | "lastEventAt">[];
  eventsCaptured: number;
}

export type Confidence = "high" | "medium" | "low";
export type OpportunityStatus = "detected" | "requested" | "building" | "live";

export interface Opportunity {
  id: string;
  workflow: string;
  shortName: string;
  department: string;
  description: string;
  sequence: string[];
  systems: string[];
  weeklyHours: number;
  frequencyPerWeek: number;
  avgDurationMin: number;
  copyPasteRate: number;
  confidence: Confidence;
  status: OpportunityStatus;
  timeToLive: string;
  rank: number;
  agentId?: string;
  whatWeNeed: string[];
  whatWeDeliver: string[];
}

export interface DiagnosticResults {
  diagnosticId: string;
  /** true while capture is still running: early figures, not the final report. */
  preliminary: boolean;
  period: { from: ISODate; to: ISODate };
  summary: {
    weeklyHoursRecoverable: number;
    weeksObserved: number;
    devicesObserved: number;
    patternsMapped: number;
    appSwitches: number;
    copyPasteEvents: number;
  };
  departments: { name: string; weeklyHours: number; devices: number; topTask: string }[];
  opportunities: Opportunity[];
  appUsage: { label: string; share: number }[];
  patterns: { pattern: string; frequency: number; avgDurationMin: number; weeklyHours: number; label: string }[];
  frictionTrend: { date: ISODate; trackedHours: number; focusSwitches: number }[];
}

/* ───────────────────────────── Agents ───────────────────────────── */

export type AgentMode = "building" | "testing" | "shadow" | "supervised" | "active" | "paused";
/** Lifecycle order, Paused can happen at any point. */
export const AGENT_MODES: AgentMode[] = ["building", "testing", "shadow", "supervised", "active", "paused"];

export interface FlowStep {
  id: string;
  label: string;
  system: string;
}

export interface Agent {
  id: string;
  /** Business name of the flow ("Alta de referral"), never a technical name. */
  name: string;
  area: string;
  entityId: string | null;
  summary: string;
  mode: AgentMode;
  /** Mode before the pause, to resume to. */
  pausedFrom?: AgentMode;
  pause?: { reason: string; by: string; at: ISODate };
  version: string;
  flow: FlowStep[];
  systems: { name: string; access: "read" | "read_write" }[];
  permissions: { granted: string[]; denied: string[] };
  schedule: string;
  opportunityId?: string;
  owner: string;
  stats: {
    runs7d: number;
    noInterventionRate: number;
    pendingQuestions: number;
    lastRunAt: ISODate | null;
    hoursSavedMonth: number;
    runsMonth: number;
  };
  /** Sandbox test status while in building/testing. */
  testing?: { scenariosPassed: number; scenariosTotal: number; lastRunAt: ISODate | null };
}

export type RunStatus = "completed" | "escalated" | "failed" | "running" | "awaiting_approval";

export interface MaskedField {
  label: string;
  value: string;
}

export interface RunStep {
  id: string;
  flowStepId: string;
  system: string;
  action: string;
  decision: string;
  reason: string;
  at: ISODate;
  durationSec: number;
  retries: number;
  status: "ok" | "escalated" | "failed" | "running" | "skipped";
  data: MaskedField[];
}

export interface Run {
  id: string;
  agentId: string;
  agentName: string;
  agentVersion: string;
  trigger: string;
  status: RunStatus;
  startedAt: ISODate;
  endedAt: ISODate | null;
  durationSec: number;
  retries: number;
  /** One-line business summary ("Referral de M*** G*** dado de alta, cita 12/11"). */
  summary: string;
  questionId?: string;
}

export interface RunDetail extends Run {
  steps: RunStep[];
}

export interface ShadowComparison {
  runId: string;
  at: ISODate;
  caseLabel: string;
  agentWouldDo: string;
  teamDid: string;
  match: boolean;
}

export interface ShadowReport {
  agentId: string;
  matchRate: number;
  sampleSize: number;
  criterion: { minMatchRate: number; minRuns: number };
  ready: boolean;
  comparisons: ShadowComparison[];
  promotedAt?: ISODate;
  promotedBy?: string;
}

export interface LearnedRule {
  id: string;
  agentId: string;
  condition: string;
  action: string;
  sourceQuestionId: string | null;
  active: boolean;
  createdAt: ISODate;
  createdBy: string;
  updatedAt?: ISODate;
}

export interface AgentPerformance {
  agentId: string;
  weekly: { weekStart: ISODate; runs: number; noInterventionRate: number; hoursSaved: number; avgDurationSec: number }[];
}

/* ───────────────────────────── Questions inbox ───────────────────────────── */

export type QuestionKind = "question" | "exception" | "approval";
export type QuestionStatus = "pending" | "answered" | "expired";
export type QuestionFallback = "wait" | "skip" | "handoff";

export interface Assignee {
  type: "user" | "role";
  id: string;
  label: string;
}

export interface Question {
  id: string;
  kind: QuestionKind;
  agentId: string;
  agentName: string;
  runId: string;
  stepLabel: string;
  /** What the agent was doing. */
  context: string;
  data: MaskedField[];
  text: string;
  options: string[];
  allowFreeText: boolean;
  createdAt: ISODate;
  dueAt: ISODate;
  fallback: QuestionFallback;
  assignee: Assignee;
  status: QuestionStatus;
  answer?: { value: string; by: string; at: ISODate; applyAlways: boolean; ruleId?: string };
}

export interface AnswerInput {
  value: string;
  applyAlways: boolean;
}

/* ───────────────────────────── Home ───────────────────────────── */

export interface HomeSummary {
  phase: Phase;
  attention: { questions: number; exceptions: number; approvals: number };
  kpis: {
    agentsActive: number;
    agentsShadow: number;
    runsMonth: number;
    hoursSavedMonth: number;
    /** null when the client has not set a €/h rate. */
    valueSavedMonth: number | null;
    noInterventionRate: number;
  };
  recentRuns: Run[];
  nextOpportunity: Opportunity | null;
}

/* ───────────────────────────── Contracts & billing ───────────────────────────── */

export type ContractType = "pilot" | "dpa" | "service" | "expansion";
export type ContractStatus = "draft" | "pending_signature" | "signed";

export interface Contract {
  id: string;
  entityId: string;
  entityName: string;
  type: ContractType;
  title: string;
  templateVersion: string;
  status: ContractStatus;
  date: ISODate;
  signer: string;
  signedAt?: ISODate;
  pdfUrl: string;
}

export interface PlanComponent {
  id: string;
  label: string;
  kind: "platform" | "per_agent" | "overage" | "other";
  amount: number;
  /** "month" | "agent/month" | "execution" … rendered as given. */
  unit: string;
  quantity?: number;
  includedVolume?: number;
}

export interface BillingOverview {
  planName: string;
  period: { from: ISODate; to: ISODate };
  components: PlanComponent[];
  estimatedTotal: number;
  usage: { agentId: string; agentName: string; used: number; included: number; forecast: number }[];
  invoices: { id: string; number: string; period: string; amount: number; status: "paid" | "open" | "overdue"; issuedAt: ISODate; pdfUrl: string }[];
  paymentMethod: { type: "card" | "sepa"; label: string; expires?: string } | null;
}

/* ───────────────────────────── Audit ───────────────────────────── */

export type AuditEventType = "agent_action" | "human_answer" | "config_change" | "signature";

export interface AuditEvent {
  id: string;
  at: ISODate;
  actor: { type: "user" | "agent" | "system"; id: string; label: string };
  type: AuditEventType;
  action: string;
  object: string;
  agentId?: string;
  before?: string;
  after?: string;
}

export interface AuditQuery {
  type?: AuditEventType;
  agentId?: string;
  actorId?: string;
  from?: string;
  to?: string;
  q?: string;
}

/* ───────────────────────────── Settings & notifications ───────────────────────────── */

export type NotificationEvent =
  | "agent_question"
  | "run_approval"
  | "agent_exception"
  | "shadow_ready"
  | "diagnostic_ready"
  | "device_silent"
  | "contract_pending"
  | "invoice_issued";

export type NotificationChannel = "desktop" | "portal" | "email";

export interface NotificationPrefs {
  userId: string;
  matrix: Record<NotificationEvent, NotificationChannel[]>;
}

export interface OrgSettingsInput {
  hourlyRate?: number | null;
  retention?: Organization["retention"];
  lang?: Lang;
  name?: string;
  workingHours?: Organization["workingHours"];
}

/* ───────────────────────────── Expand service ───────────────────────────── */

export type ServiceRequestKind = "new_department" | "automate_opportunity" | "semester_review";

export interface ServiceRequest {
  id: string;
  kind: ServiceRequestKind;
  note: string;
  opportunityId?: string;
  department?: string;
  createdAt: ISODate;
  createdBy: string;
  /** Becomes an opportunity in the CRM; reviewed by GeminAI. */
  status: "received" | "in_review" | "accepted";
}

/* ───────────────────────────── Internal view (GeminAI only) ───────────────────────────── */

export interface InternalCosts {
  orgId: string;
  period: { from: ISODate; to: ISODate };
  totals: { runs: number; tokensIn: number; tokensOut: number; llmCost: number; revenue: number; margin: number };
  byAgent: { agentId: string; agentName: string; model: string; runs: number; tokensIn: number; tokensOut: number; calls: number; retries: number; cost: number; costPerRun: number }[];
  health: { agentId: string; agentName: string; errorRate: number; p95DurationSec: number; lastError?: string }[];
}
