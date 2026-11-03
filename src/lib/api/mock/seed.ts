/**
 * Deterministic generator of the fictional demo dataset. Timestamps are relative to "now" at
 * server start, so the demo always looks current. Nothing here is real data.
 */
import type {
  Agent,
  AuditEvent,
  BillingOverview,
  BlockRule,
  Contract,
  Device,
  FeatureFlags,
  FeatureKey,
  LearnedRule,
  NotificationEvent,
  NotificationPrefs,
  OnboardingState,
  OnboardingStepKey,
  OrgEntity,
  OrgProfile,
  Organization,
  Phase,
  Question,
  QuestionFallback,
  Run,
  RunStatus,
  ServiceRequest,
  ShadowReport,
  User,
} from "../types";
import { ONBOARDING_STEPS } from "../types";
import { PROFILES, type AgentTemplate, type ProfileContent } from "./profiles";

export const ALL_FEATURES: FeatureKey[] = [
  "home",
  "onboarding.wizard",
  "devices.list",
  "devices.blocklist",
  "devices.transparency",
  "contracts",
  "diagnostic.progress",
  "diagnostic.results",
  "diagnostic.history",
  "agents.list",
  "agents.summary",
  "agents.runs",
  "agents.shadow",
  "agents.learned",
  "agents.performance",
  "agents.pause",
  "questions",
  "notifications.desktop",
  "audit",
  "billing",
  "expand",
  "internal.costs",
  "sso",
];

export interface OrgData {
  org: Organization;
  profile: ProfileContent;
  entities: OrgEntity[];
  flags: FeatureFlags;
  onboarding: OnboardingState;
  devices: Device[];
  blockRules: BlockRule[];
  agents: Agent[];
  templates: Record<string, AgentTemplate>;
  runs: Run[];
  shadow: Record<string, ShadowReport>;
  rules: LearnedRule[];
  questions: Question[];
  contracts: Contract[];
  billing: BillingOverview | null;
  userIds: string[];
  notificationPrefs: Record<string, NotificationPrefs>;
  audit: AuditEvent[];
  requests: ServiceRequest[];
  seq: number;
}

export interface MockDb {
  now: number;
  users: User[];
  orgs: Record<string, OrgData>;
}

/* ───────────── helpers ───────────── */

const HOUR = 3600_000;
const DAY = 24 * HOUR;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const iso = (ms: number) => new Date(ms).toISOString();
const initials = (name: string) =>
  name
    .replace(/^(Dr\.|Dra\.)\s*/, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

function workingHourAt(dayStart: number, rnd: () => number): number {
  // between 8:00 and 18:30 local-ish (UTC+1 approximated)
  return dayStart + (7 + rnd() * 10.5) * HOUR;
}

/* ───────────── organizations ───────────── */

interface OrgSeed {
  id: string;
  name: string;
  profile: Exclude<OrgProfile, "manufacturing">;
  phase: Phase;
  paying: boolean;
  hourlyRate: number | null;
  domain: string;
  companies: { name: string; legalName: string; nif: string; address: string }[];
  centers: { name: string; company: number }[];
  people?: string[];
  devices: number;
}

const ORG_SEEDS: OrgSeed[] = [
  {
    id: "grupo-helios",
    name: "Grupo Médico Helios",
    profile: "healthcare",
    phase: "automation",
    paying: true,
    hourlyRate: 28,
    domain: "helios.demo",
    companies: [
      { name: "Helios Salud", legalName: "Helios Salud Demo, S.L.", nif: "B00000011", address: "Calle Ficticia 12, 41001 Sevilla" },
      { name: "Helios Diagnóstico", legalName: "Helios Diagnóstico Demo, S.L.", nif: "B00000022", address: "Avenida Inventada 3, 41010 Sevilla" },
    ],
    centers: [
      { name: "Clínica Helios Centro", company: 0 },
      { name: "Clínica Helios Norte", company: 0 },
      { name: "Centro de Imagen Helios", company: 1 },
    ],
    devices: 12,
  },
  {
    id: "logistica-brisa",
    name: "Logística Brisa",
    profile: "logistics",
    phase: "diagnostic",
    paying: false,
    hourlyRate: null,
    domain: "brisa.demo",
    companies: [{ name: "Logística Brisa", legalName: "Logística Brisa Demo, S.A.", nif: "A00000033", address: "Polígono Imaginario, nave 7, 46000 Valencia" }],
    centers: [{ name: "Almacén Valencia", company: 0 }],
    devices: 9,
  },
  {
    id: "clinica-aurora",
    name: "Clínica Aurora",
    profile: "healthcare",
    phase: "onboarding",
    paying: false,
    hourlyRate: null,
    domain: "aurora.demo",
    companies: [{ name: "Clínica Aurora", legalName: "Clínica Aurora Demo, S.L.P.", nif: "B00000044", address: "Plaza Ejemplo 1, 28001 Madrid" }],
    centers: [],
    people: ["Inés Calvo", "Hugo Serrano", "Rocío Blanco", "Óscar Peña", "Alba Fuentes", "Gema Rubio", "Dra. Laura Méndez"],
    devices: 4,
  },
];

export const DEMO_STAFF_USER: User = {
  id: "u-geminai",
  name: "Equipo GeminAI",
  email: "demo@geminai-dx.com",
  initials: "GD",
  geminaiStaff: true,
  memberships: [],
  status: "active",
  lastSeenAt: null,
};

/* ───────────── main ───────────── */

export function createDb(now = Date.now()): MockDb {
  const users: User[] = [DEMO_STAFF_USER];
  const orgs: Record<string, OrgData> = {};
  for (const seed of ORG_SEEDS) {
    orgs[seed.id] = buildOrg(seed, now, users);
  }
  return { now, users, orgs };
}

function buildOrg(seed: OrgSeed, now: number, users: User[]): OrgData {
  const rnd = mulberry32(hash(seed.id));
  const profile = PROFILES[seed.profile];
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  const org: Organization = {
    id: seed.id,
    name: seed.name,
    phase: seed.phase,
    profile: seed.profile,
    hourlyRate: seed.hourlyRate,
    currency: "EUR",
    lang: "es",
    retention: "18m",
    paying: seed.paying,
    timezone: "Europe/Madrid",
    workingHours: { start: "08:00", end: "19:00", days: [1, 2, 3, 4, 5] },
    createdAt: iso(now - 150 * DAY),
  };

  /* entities: companies → centers → departments */
  const entities: OrgEntity[] = [];
  seed.companies.forEach((c, i) => {
    entities.push({ id: `${seed.id}-co${i}`, orgId: seed.id, parentId: null, kind: "company", name: c.name, legalName: c.legalName, nif: c.nif, address: c.address, phase: seed.phase });
  });
  seed.centers.forEach((c, i) => {
    entities.push({ id: `${seed.id}-ce${i}`, orgId: seed.id, parentId: `${seed.id}-co${c.company}`, kind: "center", name: c.name, phase: seed.phase });
  });
  const deptParent = seed.centers.length ? `${seed.id}-ce0` : `${seed.id}-co0`;
  profile.departments.forEach((d, i) => {
    // In the automation org, one department is back in Diagnostic (expansion) — phases coexist per area.
    const phase: Phase = seed.phase === "automation" && d === "Dirección médica" ? "diagnostic" : seed.phase;
    entities.push({ id: `${seed.id}-dep${i}`, orgId: seed.id, parentId: deptParent, kind: "department", name: d, phase });
  });
  const deptId = (name: string) => entities.find((e) => e.kind === "department" && e.name === name)?.id ?? null;

  /* users */
  const people = profile.people.map((p, i) => {
    const name = seed.people?.[i] ?? p.name;
    const local = name
      .replace(/^(Dr\.|Dra\.)\s*/, "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .split(/\s+/)
      .join(".");
    return { ...p, name, email: `${local}@${seed.domain}` };
  });
  const orgUsers: User[] = people.map((p, i) => ({
    id: `${seed.id}-u${i}`,
    name: p.name,
    email: p.email,
    initials: initials(p.name),
    geminaiStaff: false,
    memberships: [{ orgId: seed.id, role: p.role, scopeEntityId: p.scope ? deptId(p.scope) : null }],
    status: i === people.length - 1 && seed.phase === "onboarding" ? "invited" : "active",
    lastSeenAt: iso(now - Math.floor(rnd() * 5 * DAY)),
  }));
  users.push(...orgUsers);
  const admin = orgUsers[0]!;
  const ownerOf = (area: string) => orgUsers.find((u) => u.memberships[0]!.role === "process_owner" && u.memberships[0]!.scopeEntityId === deptId(area)) ?? orgUsers[1]!;
  const reviewerOf = (area: string) => orgUsers.find((u) => u.memberships[0]!.role === "reviewer" && u.memberships[0]!.scopeEntityId === deptId(area));
  const personName = (templateName: string) => {
    const idx = profile.people.findIndex((p) => p.name === templateName);
    return idx >= 0 ? people[idx]!.name : templateName;
  };

  /* feature flags: everything on (Roadmap toggles them per client) */
  const flags: FeatureFlags = { orgId: seed.id, flags: Object.fromEntries(ALL_FEATURES.map((k) => [k, true])) as Record<FeatureKey, boolean> };

  /* onboarding */
  const onboarding = onboardingFor(seed.id, seed.phase, {
    legalName: seed.companies[0]!.legalName,
    nif: seed.companies[0]!.nif,
    address: seed.companies[0]!.address,
    city: seed.companies[0]!.address.split(" ").pop() ?? "",
    contractModel: seed.profile === "healthcare" ? "clinic" : "company",
    signer: { name: people.find((p) => p.role === "signer")!.name, role: "Administrador único", email: people.find((p) => p.role === "signer")!.email },
    incidentContact: { name: admin.name, email: admin.email, phone: "+34 600 000 000" },
    workersRepresentation: false,
    pilotStart: iso(now - 30 * DAY).slice(0, 10),
    pilotEnd: iso(now - 9 * DAY).slice(0, 10),
    positions: profile.departments.map((d) => `${d} (2)`).join(", "),
  });

  /* devices */
  const devices: Device[] = [];
  for (let i = 0; i < seed.devices; i++) {
    const dept = profile.departments[i % profile.departments.length]!;
    const prefix = dept.normalize("NFD").replace(/[̀-ͯ]/g, "").slice(0, 3).toUpperCase();
    let status: Device["status"] = rnd() < 0.7 ? "online" : "idle";
    let lastEventAt: number | null = now - Math.floor(rnd() * 40) * 60_000;
    let installedAt: number | null = now - (20 + Math.floor(rnd() * 5)) * DAY;
    if (seed.phase === "onboarding") {
      installedAt = i === 0 ? now - 2 * HOUR : null;
      status = i === 0 ? "online" : "pending";
      lastEventAt = i === 0 ? now - 3 * 60_000 : null;
    } else if (i === seed.devices - 1) {
      status = "offline";
      lastEventAt = now - 58 * HOUR;
    } else if (i === seed.devices - 2 && seed.phase === "diagnostic") {
      status = "paused";
      lastEventAt = now - 6 * HOUR;
    }
    devices.push({
      id: `${seed.id}-pc${i}`,
      alias: `${prefix}-${String(Math.floor(i / profile.departments.length) + 1).padStart(2, "0")}`,
      department: dept,
      os: i % 5 === 4 ? "macos" : "windows",
      trackerVersion: i % 4 === 3 ? "0.34.57" : "0.34.58",
      status,
      captureEnabled: status !== "paused",
      lastEventAt: lastEventAt ? iso(lastEventAt) : null,
      installedAt: installedAt ? iso(installedAt) : null,
      eventsToday: status === "online" || status === "idle" ? 200 + Math.floor(rnd() * 900) : 0,
    });
  }

  /* blocklist — same categories as the contract */
  const blockRules: BlockRule[] = [
    ...profile.sensitiveCategories.map<BlockRule>((c) => ({
      id: `cat-${c.key}`,
      kind: "category",
      value: c.key,
      label: c.name,
      description: c.desc,
      analyze: false,
      sensitive: true,
      author: admin.name,
      updatedAt: iso(now - 40 * DAY),
    })),
    ...[
      ["WhatsApp (personal)", "WhatsApp.exe", "message-circle"],
      ["Telegram", "Telegram.exe", "send"],
      ["Gestor de contraseñas", "1Password.exe", "key-round"],
      ["Spotify", "Spotify.exe", "music"],
    ].map<BlockRule>(([label, value, icon], i) => ({ id: `app-${i}`, kind: "app", value: value!, label: label!, icon, analyze: false, author: admin.name, updatedAt: iso(now - 40 * DAY) })),
    ...["mail.google.com", "outlook.live.com", "web.whatsapp.com", "web.telegram.org", "facebook.com", "instagram.com", "x.com", "tiktok.com"].map<BlockRule>((u, i) => ({
      id: `url-${i}`,
      kind: "url",
      value: u,
      label: u,
      analyze: false,
      author: admin.name,
      updatedAt: iso(now - 40 * DAY),
    })),
    { id: "url-corp", kind: "url", value: seed.profile === "healthcare" ? "portal.aseguradora-demo.es" : "portal.transportes-demo.es", label: seed.profile === "healthcare" ? "portal.aseguradora-demo.es" : "portal.transportes-demo.es", analyze: true, author: admin.name, updatedAt: iso(now - 38 * DAY) },
  ];

  /* agents + runs */
  const templates: Record<string, AgentTemplate> = {};
  const agents: Agent[] = [];
  const runs: Run[] = [];
  let runSeq = 20000 + Math.floor(rnd() * 3000);
  const runsByAgent: Record<string, Run[]> = {};

  for (const tpl of profile.agents) {
    const t: AgentTemplate = { ...tpl, owner: personName(tpl.owner) };
    templates[tpl.id] = t;
    const agentRuns: Run[] = [];
    const producing = ["active", "supervised", "shadow", "paused"].includes(tpl.mode);
    if (producing) {
      const pausedAt = tpl.mode === "paused" ? now - 5 * DAY : null;
      for (let d = 34; d >= 0; d--) {
        const dayStart = todayStart - d * DAY;
        const dow = new Date(dayStart).getUTCDay();
        if (dow === 0 || dow === 6) continue;
        const count = Math.max(1, Math.round(tpl.dailyRuns * (0.7 + rnd() * 0.6) * (d === 0 ? 0.55 : 1)));
        const times: number[] = [];
        for (let k = 0; k < count; k++) times.push(workingHourAt(dayStart, rnd));
        times.sort((a, b) => a - b);
        for (const start of times) {
          if (start > now - 60_000) continue;
          if (pausedAt && start > pausedAt) continue;
          const r = rnd();
          let status: RunStatus = r < tpl.autonomy ? "completed" : r < tpl.autonomy + (1 - tpl.autonomy) * 0.85 ? "escalated" : "failed";
          const retries = rnd() < 0.08 ? 1 : 0;
          const durationSec = Math.round(tpl.avgRunSec * (0.6 + rnd() * 0.9)) + retries * 20;
          if (tpl.mode === "supervised" && status === "completed" && d === 0 && rnd() < 0.15) status = "awaiting_approval";
          const run: Run = {
            id: `r${runSeq++}`,
            agentId: tpl.id,
            agentName: tpl.name,
            agentVersion: tpl.version,
            trigger: tpl.triggers[Math.floor(rnd() * tpl.triggers.length)] ?? "—",
            status,
            startedAt: iso(start),
            endedAt: status === "awaiting_approval" ? null : iso(start + durationSec * 1000),
            durationSec,
            retries,
            summary: tpl.caseSummaries[Math.floor(rnd() * tpl.caseSummaries.length)] ?? tpl.name,
          };
          agentRuns.push(run);
        }
      }
      if (tpl.mode === "active" && agentRuns.length) {
        // one live run right now
        const start = now - 40_000;
        agentRuns.push({
          id: `r${runSeq++}`,
          agentId: tpl.id,
          agentName: tpl.name,
          agentVersion: tpl.version,
          trigger: tpl.triggers[0] ?? "—",
          status: "running",
          startedAt: iso(start),
          endedAt: null,
          durationSec: 40,
          retries: 0,
          summary: tpl.caseSummaries[0] ?? tpl.name,
        });
      }
    } else if (tpl.mode === "testing") {
      for (let k = 0; k < 6; k++) {
        const start = now - (k * 0.6 + 0.2) * DAY;
        agentRuns.push({
          id: `r${runSeq++}`,
          agentId: tpl.id,
          agentName: tpl.name,
          agentVersion: tpl.version,
          trigger: "Prueba en sandbox · datos ficticios",
          status: k === 1 ? "failed" : "completed",
          startedAt: iso(start),
          endedAt: iso(start + tpl.avgRunSec * 1000),
          durationSec: tpl.avgRunSec,
          retries: 0,
          summary: tpl.caseSummaries[0] ?? "Prueba",
        });
      }
    }
    runsByAgent[tpl.id] = agentRuns;
    runs.push(...agentRuns);

    agents.push({
      id: tpl.id,
      name: tpl.name,
      area: tpl.area,
      entityId: deptId(tpl.area),
      summary: tpl.summary,
      mode: tpl.mode,
      pausedFrom: tpl.pausedFrom,
      pause: tpl.mode === "paused" ? { reason: tpl.pauseReason ?? "", by: personName(tpl.owner), at: iso(now - 5 * DAY) } : undefined,
      version: tpl.version,
      flow: tpl.flow.map(([label, system], i) => ({ id: `${tpl.id}-s${i}`, label, system })),
      systems: tpl.systems.map(([name, access]) => ({ name, access })),
      permissions: { granted: tpl.granted, denied: tpl.denied },
      schedule: tpl.schedule,
      opportunityId: tpl.opportunityRank ? `${seed.id}-op${tpl.opportunityRank}` : undefined,
      owner: t.owner,
      stats: { runs7d: 0, noInterventionRate: 0, pendingQuestions: 0, lastRunAt: null, hoursSavedMonth: 0, runsMonth: 0 },
      testing:
        tpl.mode === "testing" || tpl.mode === "building"
          ? { scenariosPassed: tpl.mode === "testing" ? 17 : 3, scenariosTotal: tpl.mode === "testing" ? 20 : 12, lastRunAt: agentRuns[0]?.startedAt ?? null }
          : undefined,
    });
  }
  runs.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));

  /* questions + learned rules */
  const questions: Question[] = [];
  const rules: LearnedRule[] = [];
  const fallbacks: QuestionFallback[] = ["wait", "handoff", "skip"];
  let qSeq = 1;
  for (const tpl of profile.agents) {
    const agentRuns = runsByAgent[tpl.id] ?? [];
    if (!agentRuns.length) continue;
    tpl.questions.forEach((qt, i) => {
      const pending = qt.kind === "approval" || i % 2 === 0;
      const run = pending
        ? agentRuns.filter((r) => r.status !== "running").at(-1 - i) ?? agentRuns.at(-1)!
        : agentRuns[Math.floor(agentRuns.length * 0.4)]!;
      if (pending) {
        run.status = qt.kind === "approval" ? "awaiting_approval" : "escalated";
        run.endedAt = null;
      }
      const reviewer = reviewerOf(tpl.area);
      const owner = ownerOf(tpl.area);
      const assignee =
        qt.kind === "approval" || !reviewer
          ? { type: "user" as const, id: owner.id, label: owner.name }
          : i === 2
            ? { type: "role" as const, id: "process_owner", label: `Responsable de ${tpl.area}` }
            : { type: "user" as const, id: reviewer.id, label: reviewer.name };
      const createdAt = new Date(run.startedAt).getTime() + 30_000;
      const qid = `q${String(qSeq++).padStart(3, "0")}-${tpl.id}`;
      run.questionId = qid;
      const q: Question = {
        id: qid,
        kind: qt.kind,
        agentId: tpl.id,
        agentName: tpl.name,
        runId: run.id,
        stepLabel: tpl.flow[qt.stepIndex]?.[0] ?? "—",
        context: qt.context,
        data: qt.data.map(([label, value]) => ({ label, value })),
        text: qt.text,
        options: qt.options,
        allowFreeText: qt.kind !== "approval",
        createdAt: iso(createdAt),
        dueAt: iso(createdAt + (qt.kind === "approval" ? 2 : 4) * HOUR),
        fallback: fallbacks[i % 3]!,
        assignee,
        status: pending ? "pending" : "answered",
      };
      if (!pending && qt.rule) {
        const ruleId = `rule-${tpl.id}-${i}`;
        const by = reviewer?.name ?? owner.name;
        q.answer = { value: qt.options[0]!, by, at: iso(createdAt + 25 * 60_000), applyAlways: true, ruleId };
        rules.push({ id: ruleId, agentId: tpl.id, condition: qt.rule.condition, action: qt.rule.action, sourceQuestionId: qid, active: true, createdAt: iso(createdAt + 25 * 60_000), createdBy: by });
      }
      questions.push(q);
    });
    if (["active", "supervised"].includes(tpl.mode)) {
      rules.push({
        id: `rule-${tpl.id}-manual`,
        agentId: tpl.id,
        condition: tpl.mode === "active" ? "Caso urgente (marcado «URGENTE» en el asunto)" : "Importe superior a 5.000 €",
        action: tpl.mode === "active" ? "Pasar siempre a una persona" : "Pedir aprobación aunque todo cuadre",
        sourceQuestionId: null,
        active: true,
        createdAt: iso(now - 20 * DAY),
        createdBy: ownerOf(tpl.area).name,
      });
    }
  }

  /* agent stats */
  const weekAgo = now - 7 * DAY;
  const monthStart = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1);
  for (const a of agents) {
    const tpl = templates[a.id]!;
    const ar = runsByAgent[a.id] ?? [];
    const last7 = ar.filter((r) => new Date(r.startedAt).getTime() >= weekAgo);
    const month = ar.filter((r) => new Date(r.startedAt).getTime() >= Math.min(monthStart, now - 30 * DAY));
    a.stats.runs7d = last7.length;
    a.stats.noInterventionRate = last7.length ? last7.filter((r) => r.status === "completed").length / last7.length : 0;
    a.stats.pendingQuestions = questions.filter((q) => q.agentId === a.id && q.status === "pending").length;
    a.stats.lastRunAt = ar.length ? ar.reduce((m, r) => (r.startedAt > m ? r.startedAt : m), ar[0]!.startedAt) : null;
    a.stats.runsMonth = month.length;
    const acting = a.mode === "active" || a.mode === "supervised" || (a.mode === "paused" && a.pausedFrom !== "shadow");
    a.stats.hoursSavedMonth = acting ? Math.round((month.filter((r) => r.status === "completed").length * tpl.manualMinutes) / 6) / 10 : 0;
  }

  /* shadow reports */
  const shadow: Record<string, ShadowReport> = {};
  for (const tpl of profile.agents) {
    if (!["shadow", "supervised", "active", "paused"].includes(tpl.mode)) continue;
    const ar = (runsByAgent[tpl.id] ?? []).filter((r) => r.status !== "running");
    const lastDecision = tpl.stepActions.at(-1)?.[1] ?? "—";
    const cases: [string, string, string][] = tpl.shadowCases ?? tpl.caseSummaries.map((c) => [c, lastDecision, lastDecision]);
    if (!cases.length) continue;
    const sampleSize = tpl.mode === "shadow" ? (seed.profile === "healthcare" ? 34 : 31) : 40;
    const targetRate = tpl.mode === "shadow" ? (seed.profile === "healthcare" ? 0.94 : 0.97) : 0.96;
    const mismatches = Math.round(sampleSize * (1 - targetRate));
    const comparisons = ar.slice(-sampleSize).map((r, i) => {
      const c = cases[i % cases.length]!;
      const match = i % Math.max(1, Math.floor(sampleSize / Math.max(1, mismatches))) !== 3 || c[1] === c[2];
      return { runId: r.id, at: r.startedAt, caseLabel: c[0], agentWouldDo: c[1], teamDid: match ? c[1] : c[2] === c[1] ? "Pasado a una persona" : c[2], match };
    });
    const rate = comparisons.length ? comparisons.filter((c) => c.match).length / comparisons.length : 0;
    shadow[tpl.id] = {
      agentId: tpl.id,
      matchRate: rate,
      sampleSize: comparisons.length,
      criterion: { minMatchRate: 0.95, minRuns: 30 },
      ready: rate >= 0.95 && comparisons.length >= 30,
      comparisons: comparisons.reverse(),
      promotedAt: tpl.mode !== "shadow" ? iso(now - 26 * DAY) : undefined,
      promotedBy: tpl.mode !== "shadow" ? personName(tpl.owner) : undefined,
    };
  }

  /* contracts */
  const contracts: Contract[] = [];
  const companies = entities.filter((e) => e.kind === "company");
  companies.forEach((co, i) => {
    const signedBase = now - 45 * DAY;
    const onboardingPhase = seed.phase === "onboarding";
    const signerName = people.find((p) => p.role === "signer")!.name;
    const mk = (type: Contract["type"], title: string, status: Contract["status"], at: number): Contract => ({
      id: `${co.id}-${type}`,
      entityId: co.id,
      entityName: co.legalName ?? co.name,
      type,
      title,
      templateVersion: type === "dpa" ? (seed.profile === "healthcare" ? "GDX-CL-01 v2.0" : "GDX-CL-03 v2.0") : "GDX-PIL v1.3",
      status,
      date: iso(at),
      signer: signerName,
      signedAt: status === "signed" ? iso(at + 2 * DAY) : undefined,
      pdfUrl: `/api/mock/contracts/${co.id}-${type}.pdf`,
    });
    if (i === 0 || seed.phase === "automation") {
      contracts.push(mk("pilot", "Acuerdo de piloto", onboardingPhase ? "pending_signature" : "signed", signedBase));
      contracts.push(mk("dpa", "Contrato de encargo de tratamiento (DPA)", onboardingPhase ? "pending_signature" : "signed", signedBase));
    }
    if (seed.phase === "automation") {
      contracts.push(mk("service", "Contrato de servicio · Agentes", i === 0 ? "signed" : "pending_signature", now - (i === 0 ? 28 : 2) * DAY));
      if (i === 0) contracts.push(mk("expansion", "Ampliación · Diagnóstico Dirección médica", "signed", now - 44 * DAY));
    }
  });
  if (seed.phase === "onboarding") contracts.push({ ...contracts[0]!, id: `${companies[0]!.id}-draft`, type: "service", title: "Contrato de servicio · Agentes (borrador)", status: "draft", date: iso(now), signedAt: undefined });

  /* billing */
  const running = agents.filter((a) => a.mode === "active" || a.mode === "supervised");
  const billing: BillingOverview | null = seed.paying
    ? {
        planName: "Plan Agentes · Piloto ampliado",
        period: { from: iso(monthStart), to: iso(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)) },
        components: [
          { id: "platform", label: "Cuota de plataforma", kind: "platform", amount: 490, unit: "mes" },
          { id: "per-agent", label: "Cuota por agente", kind: "per_agent", amount: 250, unit: "agente/mes", quantity: running.length, includedVolume: 400 },
          { id: "overage", label: "Exceso de ejecuciones", kind: "overage", amount: 0.12, unit: "ejecución" },
        ],
        estimatedTotal: 0,
        usage: running.map((a) => {
          const used = a.stats.runsMonth;
          const dayOfMonth = today.getUTCDate();
          const daysInMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).getUTCDate();
          return { agentId: a.id, agentName: a.name, used, included: 400, forecast: Math.round((used / Math.max(1, dayOfMonth)) * daysInMonth) };
        }),
        invoices: [1, 2, 3].map((m) => {
          const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - m + 1, 1));
          const label = d.toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
          return {
            id: `inv-${m}`,
            number: `GDX-${d.getUTCFullYear()}-${String(140 - m * 7).padStart(4, "0")}`,
            period: label,
            amount: m === 3 ? 740 : 990 + m * 12.4,
            status: m === 1 ? ("open" as const) : ("paid" as const),
            issuedAt: d.toISOString(),
            pdfUrl: `/api/mock/invoices/inv-${m}.pdf`,
          };
        }),
        paymentMethod: { type: "sepa", label: "SEPA · ES•• •••• •••• ••21 4821" },
      }
    : null;
  if (billing) {
    const perAgent = billing.components.find((c) => c.kind === "per_agent")!;
    const overageUnits = billing.usage.reduce((s, u) => s + Math.max(0, u.forecast - u.included), 0);
    billing.estimatedTotal = Math.round((490 + perAgent.amount * (perAgent.quantity ?? 0) + overageUnits * 0.12) * 100) / 100;
  }

  /* notification prefs: spec defaults */
  const defaults: Record<NotificationEvent, ("desktop" | "portal" | "email")[]> = {
    agent_question: ["desktop", "portal", "email"],
    run_approval: ["desktop", "portal"],
    agent_exception: ["portal", "email"],
    shadow_ready: ["portal", "email"],
    diagnostic_ready: ["email", "portal"],
    device_silent: ["email"],
    contract_pending: ["email"],
    invoice_issued: ["email"],
  };
  const notificationPrefs: Record<string, NotificationPrefs> = {};
  for (const u of [...orgUsers, DEMO_STAFF_USER]) notificationPrefs[u.id] = { userId: u.id, matrix: structuredClone(defaults) };

  /* audit trail */
  const audit: AuditEvent[] = [];
  let aSeq = 1;
  const push = (e: Omit<AuditEvent, "id">) => audit.push({ id: `${seed.id}-ev${aSeq++}`, ...e });
  for (const r of runs.slice(0, 80)) {
    const tpl = templates[r.agentId]!;
    const last = tpl.stepActions.at(r.status === "completed" ? -1 : 0);
    if (!last) continue;
    push({
      at: r.endedAt ?? r.startedAt,
      actor: { type: "agent", id: r.agentId, label: r.agentName },
      type: "agent_action",
      action: `${tpl.flow.at(r.status === "completed" ? -1 : 0)?.[1]} · ${last[0]}`,
      object: `${r.summary} (#${r.id.slice(1)})`,
      agentId: r.agentId,
    });
  }
  for (const q of questions.filter((x) => x.answer)) {
    push({ at: q.answer!.at, actor: { type: "user", id: q.assignee.id, label: q.answer!.by }, type: "human_answer", action: `Respondió «${q.answer!.value}»${q.answer!.applyAlways ? " · guardado como regla" : ""}`, object: `${q.agentName} · ${q.text}`, agentId: q.agentId });
  }
  for (const a of agents.filter((x) => x.pause)) {
    push({ at: a.pause!.at, actor: { type: "user", id: "-", label: a.pause!.by }, type: "config_change", action: "Pausó el agente", object: a.name, agentId: a.id, before: a.pausedFrom, after: "paused" });
  }
  for (const [id, s] of Object.entries(shadow)) {
    if (s.promotedAt) push({ at: s.promotedAt, actor: { type: "user", id: "-", label: s.promotedBy ?? "" }, type: "config_change", action: "Aprobó el paso de shadow a supervisado", object: templates[id]!.name, agentId: id, before: "shadow", after: "supervised" });
  }
  push({ at: iso(now - 38 * DAY), actor: { type: "user", id: admin.id, label: admin.name }, type: "config_change", action: "Blocklist: marcó como «Analizar»", object: blockRules.find((b) => b.id === "url-corp")!.label, before: "No analizar", after: "Analizar" });
  push({ at: iso(now - 60 * DAY), actor: { type: "user", id: admin.id, label: admin.name }, type: "config_change", action: "Invitó a un usuario", object: orgUsers[3]?.email ?? "", after: "Revisor" });
  for (const c of contracts.filter((x) => x.signedAt)) {
    push({ at: c.signedAt!, actor: { type: "user", id: "-", label: c.signer }, type: "signature", action: "Firmó", object: `${c.title} · ${c.entityName}` });
  }
  audit.sort((a, b) => (a.at < b.at ? 1 : -1));

  const requests: ServiceRequest[] =
    seed.phase === "automation"
      ? [{ id: `${seed.id}-req1`, kind: "semester_review", note: "Revisión semestral del diagnóstico de Admisiones.", createdAt: iso(now - 9 * DAY), createdBy: admin.name, status: "in_review" }]
      : [];

  return {
    org,
    profile,
    entities,
    flags,
    onboarding,
    devices,
    blockRules,
    agents,
    templates,
    runs,
    shadow,
    rules,
    questions,
    contracts,
    billing,
    userIds: orgUsers.map((u) => u.id),
    notificationPrefs,
    audit,
    requests,
    seq: 1000,
  };
}

export function onboardingFor(orgId: string, phase: Phase, company: OnboardingState["company"]): OnboardingState {
  const doneUntil = phase === "onboarding" ? 2 : ONBOARDING_STEPS.length; // account + company done, contracts current
  const completed = Object.fromEntries(ONBOARDING_STEPS.map((s, i) => [s, i < doneUntil])) as Record<OnboardingStepKey, boolean>;
  return { orgId, completed, current: ONBOARDING_STEPS[Math.min(doneUntil, ONBOARDING_STEPS.length - 1)]!, company, invitedEmails: [] };
}
