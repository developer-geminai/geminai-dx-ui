/**
 * In-memory mock of the GeminAI Dx portal API. State lives on globalThis so it survives
 * hot reloads in dev, and resets when the server restarts. Every mutation appends to the
 * organization's audit trail, as the real backend must.
 */
import type { PortalApi } from "../contract";
import type {
  AuditEvent,
  Diagnostic,
  DiagnosticProgress,
  DiagnosticResults,
  HomeSummary,
  InternalCosts,
  Opportunity,
  Organization,
  Phase,
  RunDetail,
  RunStep,
  User,
} from "../types";
import { ONBOARDING_STEPS } from "../types";
import { createDb, DEMO_STAFF_USER, hash, onboardingFor, type MockDb, type OrgData } from "./seed";

const g = globalThis as unknown as { __gdxMockDb?: MockDb };
function db(): MockDb {
  if (!g.__gdxMockDb) g.__gdxMockDb = createDb();
  return g.__gdxMockDb;
}
/** Test helper: reset the store. */
export function resetMockDb(now?: number) {
  g.__gdxMockDb = createDb(now);
}

const DAY = 86_400_000;
const clone = <T>(v: T): T => structuredClone(v);
const nowIso = () => new Date().toISOString();

function data(orgId: string): OrgData {
  const d = db().orgs[orgId];
  if (!d) throw new Error(`Unknown organization: ${orgId}`);
  return d;
}
function userName(id: string): string {
  return db().users.find((u) => u.id === id)?.name ?? id;
}
function audit(d: OrgData, actor: string, e: Omit<AuditEvent, "id" | "at" | "actor">) {
  d.audit.unshift({ id: `${d.org.id}-ev${++d.seq}`, at: nowIso(), actor: { type: "user", id: actor, label: userName(actor) }, ...e });
}

/* ───────── derived, phase-aware views ───────── */

function diagnosticsFor(d: OrgData): Diagnostic[] {
  const now = db().now;
  const total = d.devices.length;
  const active = d.devices.filter((x) => x.status === "online" || x.status === "idle").length;
  const departments = d.profile.departments;
  switch (d.org.phase) {
    case "onboarding":
      return [{ id: "diag-initial", type: "initial", scope: departments.join(", "), startedAt: new Date(now + 3 * DAY).toISOString(), endsAt: new Date(now + 24 * DAY).toISOString(), status: "scheduled", day: 0, totalDays: 21, devicesActive: active, devicesTotal: total }];
    case "diagnostic":
      return [{ id: "diag-initial", type: "initial", scope: departments.join(", "), startedAt: new Date(now - 11 * DAY).toISOString(), endsAt: new Date(now + 10 * DAY).toISOString(), status: "capturing", day: 12, totalDays: 21, devicesActive: active, devicesTotal: total }];
    case "automation":
      return [
        { id: "diag-review", type: "review", scope: "Revisión semestral · todos los departamentos", startedAt: new Date(now + 60 * DAY).toISOString(), endsAt: new Date(now + 81 * DAY).toISOString(), status: "scheduled", day: 0, totalDays: 21, devicesActive: active, devicesTotal: total },
        { id: "diag-expansion", type: "expansion", scope: departments.at(-1)!, startedAt: new Date(now - 12 * DAY).toISOString(), endsAt: new Date(now + 9 * DAY).toISOString(), status: "capturing", day: 13, totalDays: 21, devicesActive: Math.min(active, 3), devicesTotal: 3 },
        { id: "diag-initial", type: "initial", scope: departments.slice(0, -1).join(", "), startedAt: new Date(now - 125 * DAY).toISOString(), endsAt: new Date(now - 104 * DAY).toISOString(), status: "ready", day: 21, totalDays: 21, devicesActive: total, devicesTotal: total },
      ];
  }
}

function opportunitiesFor(d: OrgData): Opportunity[] {
  return d.profile.opportunities.map((o) => {
    const agent = o.agentId ? d.agents.find((a) => a.id === o.agentId) : undefined;
    let status: Opportunity["status"] = "detected";
    if (d.org.phase === "automation" && agent) status = agent.mode === "active" || agent.mode === "supervised" || agent.mode === "paused" ? "live" : "building";
    const requested = d.requests.some((r) => r.opportunityId === `${d.org.id}-op${o.rank}`);
    if (status === "detected" && requested) status = "requested";
    return { id: `${d.org.id}-op${o.rank}`, ...o, systems: [...new Set(o.sequence)], status, agentId: d.org.phase === "automation" ? o.agentId : undefined };
  });
}

function resultsFor(d: OrgData, diagnosticId?: string): DiagnosticResults | null {
  if (d.org.phase === "onboarding") return null;
  const now = db().now;
  const preliminary = d.org.phase === "diagnostic";
  const scale = preliminary ? 12 / 21 : 1;
  const opps = opportunitiesFor(d);
  const weekly = opps.reduce((s, o) => s + o.weeklyHours, 0);
  const rnd = (i: number) => ((hash(`${d.org.id}-${i}`) % 1000) / 1000);
  const days = preliminary ? 12 : 21;
  const start = preliminary ? now - 11 * DAY : now - 125 * DAY;
  return {
    diagnosticId: diagnosticId ?? "diag-initial",
    preliminary,
    period: { from: new Date(start).toISOString(), to: new Date(preliminary ? now : now - 104 * DAY).toISOString() },
    summary: {
      weeklyHoursRecoverable: Math.round(weekly * 10) / 10,
      weeksObserved: preliminary ? 1.7 : 3,
      devicesObserved: d.devices.filter((x) => x.installedAt).length,
      patternsMapped: Math.round(156 * scale),
      appSwitches: Math.round(1248 * 3 * scale),
      copyPasteEvents: Math.round(3842 * scale),
    },
    departments: d.profile.departments.map((name) => {
      const os = opps.filter((o) => o.department === name);
      return { name, weeklyHours: Math.round(os.reduce((s, o) => s + o.weeklyHours, 0) * 10) / 10, devices: d.devices.filter((x) => x.department === name).length, topTask: os[0]?.shortName ?? "—" };
    }),
    opportunities: opps,
    appUsage: d.profile.apps,
    patterns: d.profile.patterns,
    frictionTrend: Array.from({ length: Math.min(days, 14) }, (_, i) => ({
      date: new Date(start + (days - Math.min(days, 14) + i) * DAY).toISOString(),
      trackedHours: Math.round((4.5 + rnd(i) * 5) * 10) / 10,
      focusSwitches: Math.round(240 + rnd(i + 50) * 360),
    })),
  };
}

function progressFor(d: OrgData): DiagnosticProgress | null {
  const diag = diagnosticsFor(d).find((x) => x.status === "capturing");
  if (!diag) return null;
  const now = db().now;
  const teams = d.org.phase === "automation" ? [d.profile.departments.at(-1)!] : d.profile.departments;
  const start = new Date(diag.startedAt).getTime();
  const daily = Array.from({ length: diag.day }, (_, i) => {
    const date = start + i * DAY;
    const dow = new Date(date).getUTCDay();
    const weekend = dow === 0 || dow === 6;
    return {
      date: new Date(date).toISOString(),
      byTeam: Object.fromEntries(teams.map((t) => [t, weekend ? 0 : Math.round((6 + ((hash(`${t}${i}`) % 100) / 100) * 9) * (i === diag.day - 1 ? 0.5 : 1) * 10) / 10])),
    };
  });
  return {
    diagnostic: diag,
    daily,
    teams,
    silentDevices: d.devices.filter((x) => x.lastEventAt && now - new Date(x.lastEventAt).getTime() > 2 * DAY).map(({ id, alias, department, lastEventAt }) => ({ id, alias, department, lastEventAt })),
    eventsCaptured: d.devices.reduce((s, x) => s + x.eventsToday, 0) * diag.day,
  };
}

function runDetail(d: OrgData, runId: string): RunDetail | null {
  const run = d.runs.find((r) => r.id === runId);
  if (!run) return null;
  const tpl = d.templates[run.agentId]!;
  const q = run.questionId ? d.questions.find((x) => x.id === run.questionId) : undefined;
  const stopAt =
    run.status === "completed"
      ? tpl.flow.length - 1
      : q
        ? tpl.flow.findIndex((f) => f[0] === q.stepLabel)
        : run.status === "running"
          ? Math.min(2, tpl.flow.length - 1)
          : Math.max(0, (hash(run.id) % tpl.flow.length));
  const steps: RunStep[] = [];
  let t = new Date(run.startedAt).getTime();
  const per = Math.max(4, Math.round(run.durationSec / Math.max(1, stopAt + 1)));
  for (let i = 0; i <= stopAt; i++) {
    const [label, system] = tpl.flow[i]!;
    const [action, decision, reason] = tpl.stepActions[i] ?? [label, "—", ""];
    const isLast = i === stopAt;
    let status: RunStep["status"] = "ok";
    let dec = decision;
    let why = reason;
    if (isLast && run.status === "escalated") {
      status = "escalated";
      dec = "Pregunta a una persona";
      why = q?.text ?? "Caso no cubierto por las reglas";
    } else if (isLast && run.status === "awaiting_approval") {
      status = "escalated";
      dec = "Espera aprobación";
      why = "Modo supervisado: una persona debe aprobar antes de cerrar";
    } else if (isLast && run.status === "failed") {
      status = "failed";
      dec = "Error";
      why = `${system} no respondió tras 2 intentos`;
    } else if (isLast && run.status === "running") {
      status = "running";
      dec = "En curso…";
      why = "";
    }
    steps.push({
      id: `${run.id}-st${i}`,
      flowStepId: `${tpl.id}-s${i}`,
      system,
      action,
      decision: dec,
      reason: why,
      at: new Date(t).toISOString(),
      durationSec: per,
      retries: i === 1 ? run.retries : 0,
      status,
      data: (tpl.stepData[i] ?? []).map(([label, value]) => ({ label, value })),
    });
    t += per * 1000;
  }
  return { ...clone(run), steps };
}

function homeFor(d: OrgData): HomeSummary {
  const pending = d.questions.filter((q) => q.status === "pending");
  const running = d.agents.filter((a) => a.mode === "active" || a.mode === "supervised");
  const runsMonth = d.agents.reduce((s, a) => s + a.stats.runsMonth, 0);
  const hours = Math.round(d.agents.reduce((s, a) => s + a.stats.hoursSavedMonth, 0) * 10) / 10;
  const last7 = d.runs.filter((r) => new Date(r.startedAt).getTime() > Date.now() - 30 * DAY && r.status !== "running");
  const next = opportunitiesFor(d).find((o) => o.status === "detected" || o.status === "requested") ?? null;
  return {
    phase: d.org.phase,
    attention: {
      questions: pending.filter((q) => q.kind === "question").length,
      exceptions: pending.filter((q) => q.kind === "exception").length,
      approvals: pending.filter((q) => q.kind === "approval").length,
    },
    kpis: {
      agentsActive: running.length,
      agentsShadow: d.agents.filter((a) => a.mode === "shadow").length,
      runsMonth,
      hoursSavedMonth: hours,
      valueSavedMonth: d.org.hourlyRate ? Math.round(hours * d.org.hourlyRate) : null,
      noInterventionRate: last7.length ? last7.filter((r) => r.status === "completed").length / last7.length : 0,
    },
    recentRuns: clone(d.runs.slice(0, 10)),
    nextOpportunity: next,
  };
}

/* ───────── API ───────── */

export const mockApi: PortalApi = {
  async authenticate(email) {
    const e = email.trim().toLowerCase();
    // DEMO: any credentials work. A seeded client email signs in as that user; anything else as GeminAI staff.
    return clone(db().users.find((u) => u.email === e) ?? DEMO_STAFF_USER);
  },
  async authenticateSso() {
    return clone(DEMO_STAFF_USER);
  },
  async getViewer(userId) {
    const user = db().users.find((u) => u.id === userId);
    if (!user) return null;
    const orgs = Object.values(db().orgs)
      .filter((o) => user.geminaiStaff || user.memberships.some((m) => m.orgId === o.org.id))
      .map((o) => ({ id: o.org.id, name: o.org.name, phase: o.org.phase }));
    return { user: clone(user), organizations: orgs };
  },

  async getOrganization(orgId) {
    const d = db().orgs[orgId];
    return d ? clone(d.org) : null;
  },
  async listEntities(orgId) {
    return clone(data(orgId).entities);
  },
  async updateSettings(orgId, actor, input) {
    const d = data(orgId);
    const before = { ...d.org };
    Object.assign(d.org, Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)));
    const changed = (Object.keys(input) as (keyof Organization)[]).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(d.org[k]));
    for (const k of changed) audit(d, actor, { type: "config_change", action: `Cambió ajuste «${k}»`, object: d.org.name, before: String(JSON.stringify(before[k])), after: String(JSON.stringify(d.org[k])) });
    return clone(d.org);
  },
  async setPhase(orgId, actor, phase: Phase) {
    const d = data(orgId);
    const before = d.org.phase;
    d.org.phase = phase;
    for (const e of d.entities) e.phase = phase;
    d.onboarding = onboardingFor(orgId, phase, d.onboarding.company);
    audit(d, actor, { type: "config_change", action: "Cambió la fase (demo)", object: d.org.name, before, after: phase });
    return clone(d.org);
  },
  async getFeatureFlags(orgId) {
    return clone(data(orgId).flags);
  },
  async setFeatureFlag(orgId, actor, key, enabled) {
    const d = data(orgId);
    d.flags.flags[key] = enabled;
    audit(d, actor, { type: "config_change", action: enabled ? "Activó funcionalidad" : "Desactivó funcionalidad", object: key });
    return clone(d.flags);
  },

  async getHome(orgId) {
    return homeFor(data(orgId));
  },

  async getOnboarding(orgId) {
    return clone(data(orgId).onboarding);
  },
  async saveCompany(orgId, actor, company) {
    const d = data(orgId);
    d.onboarding.company = clone(company);
    const co = d.entities.find((e) => e.kind === "company");
    if (co) Object.assign(co, { legalName: company.legalName, nif: company.nif, address: company.address });
    audit(d, actor, { type: "config_change", action: "Guardó los datos de la empresa", object: company.legalName });
    return clone(d.onboarding);
  },
  async completeOnboardingStep(orgId, actor, step) {
    const d = data(orgId);
    d.onboarding.completed[step] = true;
    const next = ONBOARDING_STEPS.find((s) => !d.onboarding.completed[s]);
    d.onboarding.current = next ?? "done";
    if (step === "contracts") {
      for (const c of d.contracts.filter((x) => (x.type === "pilot" || x.type === "dpa") && x.status !== "signed")) {
        c.status = "signed";
        c.signedAt = nowIso();
        audit(d, actor, { type: "signature", action: "Firmó", object: `${c.title} · ${c.entityName}` });
      }
    }
    if (step === "done" || !next) {
      d.onboarding.completed.done = true;
      if (d.org.phase === "onboarding") {
        d.org.phase = "diagnostic";
        audit(d, actor, { type: "config_change", action: "Onboarding completado · empieza el diagnóstico", object: d.org.name, before: "onboarding", after: "diagnostic" });
      }
    }
    return clone(d.onboarding);
  },

  async listDevices(orgId) {
    return clone(data(orgId).devices);
  },
  async setDeviceCapture(orgId, actor, deviceId, enabled) {
    const d = data(orgId);
    const dev = d.devices.find((x) => x.id === deviceId);
    if (!dev) throw new Error("Unknown device");
    dev.captureEnabled = enabled;
    dev.status = enabled ? "online" : "paused";
    audit(d, actor, { type: "config_change", action: enabled ? "Reanudó la captura del equipo" : "Pausó la captura del equipo", object: dev.alias });
    return clone(dev);
  },
  async getTrackerDownload(orgId) {
    return { windowsUrl: `/api/mock/tracker/${orgId}/GeminAI-Dx-Setup.exe`, macUrl: `/api/mock/tracker/${orgId}/GeminAI-Dx.pkg`, enrollmentCode: `${orgId.slice(0, 4).toUpperCase()}-${(hash(orgId) % 9000) + 1000}`, version: "0.34.58" };
  },
  async listBlockRules(orgId) {
    return clone(data(orgId).blockRules);
  },
  async upsertBlockRule(orgId, actor, rule) {
    const d = data(orgId);
    const existing = rule.id ? d.blockRules.find((r) => r.id === rule.id) : undefined;
    if (existing) {
      const before = existing.analyze ? "Analizar" : "No analizar";
      Object.assign(existing, rule, { author: userName(actor), updatedAt: nowIso() });
      audit(d, actor, { type: "config_change", action: "Blocklist: cambió regla", object: existing.label, before, after: existing.analyze ? "Analizar" : "No analizar" });
      return clone(existing);
    }
    const created = { ...rule, id: `${rule.kind}-${++d.seq}`, author: userName(actor), updatedAt: nowIso() };
    d.blockRules.push(created);
    audit(d, actor, { type: "config_change", action: "Blocklist: añadió regla", object: created.label, after: created.analyze ? "Analizar" : "No analizar" });
    return clone(created);
  },
  async deleteBlockRule(orgId, actor, ruleId) {
    const d = data(orgId);
    const r = d.blockRules.find((x) => x.id === ruleId);
    d.blockRules = d.blockRules.filter((x) => x.id !== ruleId);
    if (r) audit(d, actor, { type: "config_change", action: "Blocklist: eliminó regla", object: r.label });
  },
  async getTransparency(orgId) {
    const d = data(orgId);
    const admin = db().users.find((u) => u.id === d.userIds[0]);
    return {
      orgName: d.org.name,
      captured: ["Qué aplicación y ventana está activa, y durante cuánto tiempo", "Cambios entre aplicaciones y acciones de copiar y pegar (sin el contenido)", "Texto de pantalla de las aplicaciones de trabajo, anonimizado en tu ordenador antes de enviarse"],
      notCaptured: ["Pulsaciones de teclado, contraseñas o el contenido que copias", "Aplicaciones, webs y categorías bloqueadas", "Micrófono, cámara o archivos personales", "Nada fuera del horario laboral o con la captura en pausa"],
      blocked: clone(d.blockRules.filter((r) => !r.analyze)),
      retention: d.org.retention,
      contact: { name: admin?.name ?? "", email: admin?.email ?? "" },
      dpoEmail: "privacidad@geminai-dx.com",
    };
  },

  async listDiagnostics(orgId) {
    return diagnosticsFor(data(orgId));
  },
  async getDiagnosticProgress(orgId) {
    return progressFor(data(orgId));
  },
  async getDiagnosticResults(orgId, diagnosticId) {
    return resultsFor(data(orgId), diagnosticId);
  },
  async listOpportunities(orgId) {
    return opportunitiesFor(data(orgId));
  },

  async listAgents(orgId, filter) {
    return clone(data(orgId).agents.filter((a) => (!filter?.mode || a.mode === filter.mode) && (!filter?.area || a.area === filter.area)));
  },
  async getAgent(orgId, agentId) {
    const a = data(orgId).agents.find((x) => x.id === agentId);
    return a ? clone(a) : null;
  },
  async pauseAgent(orgId, actor, agentId, reason) {
    const d = data(orgId);
    const a = d.agents.find((x) => x.id === agentId);
    if (!a) throw new Error("Unknown agent");
    if (a.mode !== "paused") {
      a.pausedFrom = a.mode;
      a.mode = "paused";
      a.pause = { reason, by: userName(actor), at: nowIso() };
      audit(d, actor, { type: "config_change", action: "Pausó el agente", object: a.name, agentId, before: a.pausedFrom, after: "paused" });
    }
    return clone(a);
  },
  async resumeAgent(orgId, actor, agentId) {
    const d = data(orgId);
    const a = d.agents.find((x) => x.id === agentId);
    if (!a) throw new Error("Unknown agent");
    if (a.mode === "paused") {
      a.mode = a.pausedFrom ?? "supervised";
      a.pause = undefined;
      a.pausedFrom = undefined;
      audit(d, actor, { type: "config_change", action: "Reanudó el agente", object: a.name, agentId, before: "paused", after: a.mode });
    }
    return clone(a);
  },
  async promoteAgent(orgId, actor, agentId) {
    const d = data(orgId);
    const a = d.agents.find((x) => x.id === agentId);
    if (!a) throw new Error("Unknown agent");
    if (a.mode === "shadow") {
      a.mode = "supervised";
      const s = d.shadow[agentId];
      if (s) {
        s.promotedAt = nowIso();
        s.promotedBy = userName(actor);
      }
      audit(d, actor, { type: "config_change", action: "Aprobó el paso de shadow a supervisado", object: a.name, agentId, before: "shadow", after: "supervised" });
    }
    return clone(a);
  },
  async listRuns(orgId, filter) {
    const rs = data(orgId).runs.filter((r) => (!filter?.agentId || r.agentId === filter.agentId) && (!filter?.status || r.status === filter.status));
    return clone(rs.slice(0, filter?.limit ?? 200));
  },
  async getRun(orgId, runId) {
    return runDetail(data(orgId), runId);
  },
  async getShadowReport(orgId, agentId) {
    const s = data(orgId).shadow[agentId];
    return s ? clone(s) : null;
  },
  async listRules(orgId, agentId) {
    return clone(data(orgId).rules.filter((r) => !agentId || r.agentId === agentId));
  },
  async updateRule(orgId, actor, ruleId, patch) {
    const d = data(orgId);
    const r = d.rules.find((x) => x.id === ruleId);
    if (!r) throw new Error("Unknown rule");
    const before = `${r.condition} → ${r.action}${r.active ? "" : " (inactiva)"}`;
    Object.assign(r, patch, { updatedAt: nowIso() });
    audit(d, actor, { type: "config_change", action: "Editó una regla aprendida", object: d.agents.find((a) => a.id === r.agentId)?.name ?? r.agentId, agentId: r.agentId, before, after: `${r.condition} → ${r.action}${r.active ? "" : " (inactiva)"}` });
    return clone(r);
  },
  async deleteRule(orgId, actor, ruleId) {
    const d = data(orgId);
    const r = d.rules.find((x) => x.id === ruleId);
    d.rules = d.rules.filter((x) => x.id !== ruleId);
    if (r) audit(d, actor, { type: "config_change", action: "Borró una regla aprendida", object: d.agents.find((a) => a.id === r.agentId)?.name ?? r.agentId, agentId: r.agentId, before: `${r.condition} → ${r.action}` });
  },
  async getPerformance(orgId, agentId) {
    const d = data(orgId);
    const tpl = d.templates[agentId];
    const runs = d.runs.filter((r) => r.agentId === agentId && r.status !== "running");
    const weekStart = (t: number) => {
      const x = new Date(t);
      const dow = (x.getUTCDay() + 6) % 7;
      return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate() - dow);
    };
    const buckets = new Map<number, typeof runs>();
    for (const r of runs) {
      const k = weekStart(new Date(r.startedAt).getTime());
      buckets.set(k, [...(buckets.get(k) ?? []), r]);
    }
    const acting = (mode: string) => mode !== "shadow" && mode !== "testing" && mode !== "building";
    const agent = d.agents.find((a) => a.id === agentId);
    return {
      agentId,
      weekly: [...buckets.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([k, rs]) => {
          const ok = rs.filter((r) => r.status === "completed").length;
          return {
            weekStart: new Date(k).toISOString(),
            runs: rs.length,
            noInterventionRate: rs.length ? ok / rs.length : 0,
            hoursSaved: agent && acting(agent.pausedFrom ?? agent.mode) && tpl ? Math.round((ok * tpl.manualMinutes) / 6) / 10 : 0,
            avgDurationSec: Math.round(rs.reduce((s, r) => s + r.durationSec, 0) / Math.max(1, rs.length)),
          };
        }),
    };
  },

  async listQuestions(orgId, filter) {
    const qs = data(orgId).questions.filter(
      (q) =>
        (!filter?.status || q.status === filter.status) &&
        (!filter?.agentId || q.agentId === filter.agentId) &&
        (!filter?.assignedTo || q.assignee.id === filter.assignedTo || (q.assignee.type === "role" && db().users.find((u) => u.id === filter.assignedTo)?.memberships.some((m) => m.role === q.assignee.id))),
    );
    return clone([...qs].sort((a, b) => (a.status === b.status ? (a.createdAt < b.createdAt ? 1 : -1) : a.status === "pending" ? -1 : 1)));
  },
  async getQuestion(orgId, questionId) {
    const q = data(orgId).questions.find((x) => x.id === questionId);
    return q ? clone(q) : null;
  },
  async answerQuestion(orgId, actor, questionId, input) {
    const d = data(orgId);
    const q = d.questions.find((x) => x.id === questionId);
    if (!q) throw new Error("Unknown question");
    if (q.status !== "pending") return clone(q);
    let ruleId: string | undefined;
    const tplRule = d.profile.agents.find((a) => a.id === q.agentId)?.questions.find((t) => t.text === q.text)?.rule;
    if (input.applyAlways && q.kind !== "approval") {
      ruleId = `rule-${++d.seq}`;
      d.rules.unshift({ id: ruleId, agentId: q.agentId, condition: tplRule?.condition ?? q.text, action: input.value, sourceQuestionId: q.id, active: true, createdAt: nowIso(), createdBy: userName(actor) });
    }
    q.status = "answered";
    q.answer = { value: input.value, by: userName(actor), at: nowIso(), applyAlways: input.applyAlways && q.kind !== "approval", ruleId };
    const run = d.runs.find((r) => r.id === q.runId);
    if (run) {
      const rejected = q.kind === "approval" && /rechaz|reject/i.test(input.value);
      run.status = rejected ? "escalated" : "completed";
      run.endedAt = nowIso();
    }
    const agent = d.agents.find((a) => a.id === q.agentId);
    if (agent) agent.stats.pendingQuestions = d.questions.filter((x) => x.agentId === agent.id && x.status === "pending").length;
    audit(d, actor, { type: "human_answer", action: `Respondió «${input.value}»${q.answer.applyAlways ? " · guardado como regla" : ""}`, object: `${q.agentName} · ${q.text}`, agentId: q.agentId });
    return clone(q);
  },
  async reassignQuestion(orgId, actor, questionId, assignee) {
    const d = data(orgId);
    const q = d.questions.find((x) => x.id === questionId);
    if (!q) throw new Error("Unknown question");
    const before = q.assignee.label;
    q.assignee = assignee;
    audit(d, actor, { type: "config_change", action: "Reasignó una pregunta", object: `${q.agentName} · ${q.text}`, agentId: q.agentId, before, after: assignee.label });
    return clone(q);
  },

  async listContracts(orgId) {
    return clone(data(orgId).contracts);
  },
  async signContract(orgId, actor, contractId) {
    const d = data(orgId);
    const c = d.contracts.find((x) => x.id === contractId);
    if (!c) throw new Error("Unknown contract");
    c.status = "signed";
    c.signedAt = nowIso();
    audit(d, actor, { type: "signature", action: "Firmó", object: `${c.title} · ${c.entityName}` });
    return clone(c);
  },

  async getBilling(orgId) {
    const d = data(orgId);
    return d.org.paying || d.org.phase === "automation" ? clone(d.billing ?? fallbackBilling(d)) : null;
  },

  async listUsers(orgId) {
    const d = data(orgId);
    return clone(db().users.filter((u) => d.userIds.includes(u.id)));
  },
  async inviteUser(orgId, actor, input) {
    const d = data(orgId);
    const user: User = {
      id: `${orgId}-u${++d.seq}`,
      name: input.name || input.email.split("@")[0]!,
      email: input.email.toLowerCase(),
      initials: (input.name || input.email).slice(0, 2).toUpperCase(),
      geminaiStaff: false,
      memberships: [{ orgId, role: input.role, scopeEntityId: input.scopeEntityId }],
      status: "invited",
      lastSeenAt: null,
    };
    db().users.push(user);
    d.userIds.push(user.id);
    d.notificationPrefs[user.id] = clone(d.notificationPrefs[d.userIds[0]!]!);
    d.notificationPrefs[user.id]!.userId = user.id;
    audit(d, actor, { type: "config_change", action: "Invitó a un usuario", object: user.email, after: input.role });
    return clone(user);
  },
  async updateMembership(orgId, actor, userId, role, scopeEntityId) {
    const d = data(orgId);
    const u = db().users.find((x) => x.id === userId);
    if (!u) throw new Error("Unknown user");
    const m = u.memberships.find((x) => x.orgId === orgId);
    const before = m?.role;
    if (m) Object.assign(m, { role, scopeEntityId });
    else u.memberships.push({ orgId, role, scopeEntityId });
    audit(d, actor, { type: "config_change", action: "Cambió el rol de un usuario", object: u.email, before, after: role });
    return clone(u);
  },
  async getNotificationPrefs(orgId, userId) {
    const d = data(orgId);
    return clone(d.notificationPrefs[userId] ?? { ...d.notificationPrefs[d.userIds[0]!]!, userId });
  },
  async updateNotificationPrefs(orgId, actor, prefs) {
    const d = data(orgId);
    d.notificationPrefs[prefs.userId] = clone(prefs);
    audit(d, actor, { type: "config_change", action: "Cambió sus notificaciones", object: userName(prefs.userId) });
    return clone(prefs);
  },

  async listAudit(orgId, query) {
    const q = query?.q?.toLowerCase();
    return clone(
      data(orgId).audit.filter(
        (e) =>
          (!query?.type || e.type === query.type) &&
          (!query?.agentId || e.agentId === query.agentId) &&
          (!query?.actorId || e.actor.id === query.actorId || e.actor.label === query.actorId) &&
          (!query?.from || e.at >= query.from) &&
          (!query?.to || e.at <= `${query.to}T23:59:59.999Z`) &&
          (!q || `${e.action} ${e.object} ${e.actor.label}`.toLowerCase().includes(q)),
      ),
    );
  },

  async listServiceRequests(orgId) {
    return clone(data(orgId).requests);
  },
  async createServiceRequest(orgId, actor, input) {
    const d = data(orgId);
    const req = { id: `${orgId}-req${++d.seq}`, ...input, createdAt: nowIso(), createdBy: userName(actor), status: "received" as const };
    d.requests.unshift(req);
    audit(d, actor, { type: "config_change", action: "Solicitó ampliar el servicio", object: input.kind, after: input.note.slice(0, 80) });
    return clone(req);
  },

  async getInternalCosts(orgId) {
    const d = data(orgId);
    const since = Date.now() - 30 * DAY;
    const byAgent = d.agents
      .map((a) => {
        const rs = d.runs.filter((r) => r.agentId === a.id && new Date(r.startedAt).getTime() > since);
        const h = hash(a.id);
        const model = h % 3 === 0 ? "claude-haiku-5-5" : "claude-sonnet-5-5";
        const inPer = 5200 + (h % 4000);
        const outPer = 900 + (h % 700);
        const calls = rs.length * (3 + (h % 3));
        const retries = rs.reduce((s, r) => s + r.retries, 0);
        const cost = Math.round(rs.length * (model.includes("haiku") ? 0.006 : 0.031) * (1 + retries / Math.max(1, rs.length)) * 100) / 100;
        return { agentId: a.id, agentName: a.name, model, runs: rs.length, tokensIn: rs.length * inPer, tokensOut: rs.length * outPer, calls, retries, cost, costPerRun: rs.length ? Math.round((cost / rs.length) * 1000) / 1000 : 0 };
      })
      .filter((x) => x.runs > 0);
    const llmCost = Math.round(byAgent.reduce((s, x) => s + x.cost, 0) * 100) / 100;
    const revenue = d.billing?.estimatedTotal ?? 0;
    const result: InternalCosts = {
      orgId,
      period: { from: new Date(since).toISOString(), to: nowIso() },
      totals: {
        runs: byAgent.reduce((s, x) => s + x.runs, 0),
        tokensIn: byAgent.reduce((s, x) => s + x.tokensIn, 0),
        tokensOut: byAgent.reduce((s, x) => s + x.tokensOut, 0),
        llmCost,
        revenue,
        margin: revenue ? (revenue - llmCost) / revenue : 0,
      },
      byAgent,
      health: d.agents
        .filter((a) => d.runs.some((r) => r.agentId === a.id))
        .map((a) => {
          const rs = d.runs.filter((r) => r.agentId === a.id);
          const failed = rs.filter((r) => r.status === "failed").length;
          return { agentId: a.id, agentName: a.name, errorRate: rs.length ? failed / rs.length : 0, p95DurationSec: Math.round((d.templates[a.id]?.avgRunSec ?? 60) * 1.6), lastError: failed ? `${d.templates[a.id]?.flow[1]?.[1] ?? "Sistema"}: timeout tras 2 reintentos` : undefined };
        }),
    };
    return result;
  },
};

function fallbackBilling(d: OrgData) {
  // Previewing a non-paying org in the Automation phase: show an estimate with the same components.
  const running = d.agents.filter((a) => a.mode === "active" || a.mode === "supervised");
  const today = new Date();
  return {
    planName: "Plan Agentes · estimación",
    period: { from: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString(), to: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).toISOString() },
    components: [
      { id: "platform", label: "Cuota de plataforma", kind: "platform" as const, amount: 490, unit: "mes" },
      { id: "per-agent", label: "Cuota por agente", kind: "per_agent" as const, amount: 250, unit: "agente/mes", quantity: running.length, includedVolume: 400 },
      { id: "overage", label: "Exceso de ejecuciones", kind: "overage" as const, amount: 0.12, unit: "ejecución" },
    ],
    estimatedTotal: 490 + 250 * running.length,
    usage: running.map((a) => ({ agentId: a.id, agentName: a.name, used: a.stats.runsMonth, included: 400, forecast: Math.round(a.stats.runsMonth * 1.1) })),
    invoices: [],
    paymentMethod: null,
  };
}
