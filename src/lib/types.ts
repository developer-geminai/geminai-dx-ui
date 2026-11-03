/**
 * Types for the read-only GeminAI-DX agent-console API (src/geminai_automation/agent_console/server.py).
 *
 * The API is domain-neutral: every business word (shipment, invoice, ticket…) arrives as data from
 * an agent's source adapter. Different adapters (legacy case store vs. generic event store) populate
 * different optional fields, so most fields beyond identity/status are optional here and every
 * component must render gracefully when they are absent.
 */

export type Tone = "done" | "attention" | "error" | "neutral" | (string & {});
export type EffectsStatus = "executed" | "not_executed" | "unknown";
/** Epoch seconds (legacy question rows) or ISO-8601 string. */
export type Timestamp = string | number | null | undefined;

export interface AgentCounts {
  cases: number;
  questions_open: number;
  needs_review: number;
}

export interface Agent {
  id: string;
  name: string;
  purpose: string;
  category?: string | null;
  icon?: string | null;
  /** Source adapter: legacy_cases | generic_events | merged_real_case_events */
  source?: string;
  counts: AgentCounts;
  statuses: Record<string, number>;
  /** Forward-compatible: rendered only when a source adapter reports them. */
  capabilities?: string[];
}

export interface AgentsResponse {
  items: Agent[];
  organization: string;
}

export interface CaseSummary {
  id: string;
  title: string;
  subject?: string | null;
  message_id?: string | null;
  status: string;
  status_label: string;
  status_description?: string;
  tone: Tone;
  updated_at?: string | null;
  mode?: string;
  effects_executed?: boolean | null;
  agent_id: string;
  agent_name: string;
}

export interface CasesResponse {
  items: CaseSummary[];
  total_in_status: number;
  matched_in_scanned_window: number;
  truncated_search: boolean;
  organization: string;
  agent_filter: string;
  scanned_limit_per_agent: number;
}

export interface OverviewResponse {
  organization: string;
  demo: boolean;
  content_visible: boolean;
  mode: "mixed" | "recorded" | "shadow" | (string & {});
  agents_count: number;
  total_agents_in_org: number;
  agent_filter: string;
  counts: { agents: number; cases: number; questions_open: number; needs_review: number };
  statuses: Record<string, number>;
  recent: CaseSummary[];
  note?: string;
}

export interface QuestionOption {
  id?: string;
  option_id?: string;
  label?: string;
  [key: string]: unknown;
}

export interface QuestionField {
  kind?: string;
  path?: string;
  [key: string]: unknown;
}

export interface Question {
  id: string;
  case_id: string;
  status: string;
  title: string;
  text?: string | null;
  options?: QuestionOption[];
  option_count?: number;
  fields?: QuestionField[];
  fields_count?: number;
  request_path?: string | null;
  state_version?: number | null;
  current_case_version?: number | null;
  case_status?: string;
  origin_messages?: string[];
  source_subject?: string | null;
  source_sender?: string | null;
  source_received_at?: Timestamp;
  source_message_id?: string | null;
  created_at?: Timestamp;
  expires_at?: Timestamp;
  agent_id?: string;
  agent_name?: string;
}

export interface QuestionsResponse {
  items: Question[];
}

export interface Insights {
  dispositions: Record<string, number>;
  questions: Record<string, number>;
  historical: HistoricalEvaluation[];
  note?: string;
}

export interface HistoricalEvaluation {
  label: string;
  cases?: number;
  facts?: number;
  comparable_values?: number;
  dispositions?: Record<string, number>;
  global_accuracy?: number | null;
  agent_id: string;
  agent_name: string;
}

export interface JourneyStep {
  id: string;
  title: string;
  explanation?: string | null;
  tone?: Tone;
  based_on?: string | null;
  at?: string | null;
  category?: string | null;
  event_type?: string | null;
  evidence_ref?: string | null;
  run_id?: string | null;
  parent_event_id?: string | null;
  event_state?: string | null;
  effect_state?: string | null;
}

export interface ContextField {
  label: string;
  value: string;
  sensitive?: boolean;
}

export interface Attachment {
  name?: string;
  filename?: string;
  content_type?: string;
  size?: number;
  [key: string]: unknown;
}

export interface CaseRequest {
  channel?: string | null;
  subject?: string | null;
  body?: string | null;
  message_id?: string | null;
  summary?: string | null;
  sender?: string | null;
  received_at?: Timestamp;
  metadata?: Record<string, unknown>;
  attachments?: Attachment[];
  actions?: Record<string, unknown>[];
  context?: ContextField[];
}

export interface Observation {
  id: string;
  title: string;
  explanation?: string | null;
  reason?: string | null;
  pending: boolean;
  verified?: boolean;
  tone?: Tone;
  status_label?: string;
  source_label?: string;
  property_label?: string;
  reference_label?: string;
  reported_display?: string;
  database_display?: string;
  incoming_value_label?: string;
  source_quote_label?: string;
  evidence_quote?: string | null;
  evidence_scope?: string;
  evidence_valid?: boolean;
  assertion_label?: string;
  saved_at?: string | null;
  check_details?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Run {
  id: string;
  label?: string | null;
  state?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
}

export interface HistoryEntry {
  id: string | number;
  at?: string | null;
  title: string;
  kind?: string;
}

export interface CaseOutcome {
  label: string;
  detail?: string | null;
  effects_status: EffectsStatus;
}

export interface CaseDetail {
  id: string;
  title: string;
  status: string;
  status_label: string;
  status_description?: string;
  tone: Tone;
  updated_at?: string | null;
  version?: number | null;
  mode?: string;
  effects_executed?: boolean | null;
  execution_receipt?: Record<string, unknown>;
  request?: CaseRequest;
  interpretation?: { summary?: string | null; requests?: Record<string, unknown>[] };
  saved_decision?: Record<string, unknown>;
  steps: JourneyStep[];
  /** Present when chronology (steps) comes from recorded events and the adapter's own explanation is kept apart. */
  source_explanations?: JourneyStep[];
  runs?: Run[];
  questions: Question[];
  open_question_count?: number;
  answer_history?: Record<string, unknown>[];
  observations: Observation[];
  pending_observations?: number;
  history?: HistoryEntry[];
  next_action?: string | null;
  outcome: CaseOutcome;
  technical?: Record<string, unknown>;
  narration_disclaimer?: string;
  agent_id: string;
  agent_name: string;
  agent_purpose?: string;
}

export interface QuestionContext {
  contract: string;
  organization_id: string;
  agent_id: string;
  case_id: string;
  question_id: string;
  loaded_at: string;
  question: Question;
  case: CaseDetail;
  affected_requests: {
    index: number;
    path: string;
    intent?: string | null;
    property?: string | null;
    source_phrase?: string | null;
    reference?: unknown;
    value?: unknown;
    source_quote?: string | null;
    fields?: QuestionField[];
  }[];
  requested_fields: { kind?: string; path?: string; current_value?: unknown; source_phrase?: string | null }[];
  focused_observations: Observation[];
  version_check: {
    question_state_version: number | null;
    case_version: number | null;
    changed_since_question: boolean | null;
  };
  availability: { missing: string[]; request_link_method?: string };
  reply_submission_enabled: boolean;
}
