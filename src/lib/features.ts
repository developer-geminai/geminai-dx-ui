import type { FeatureKey, Phase, Role } from "@/lib/api/types";
import { PHASES } from "@/lib/api/types";
import type { L10n } from "@/lib/i18n";

/**
 * Single source of truth for what the portal offers, in which phase it unlocks, which release it
 * belongs to (spec "Prioridades"), and which feature flags control it. The Roadmap page renders
 * this catalogue; the shell uses `sectionAccess` to show a section open, locked or hidden.
 */

export type SectionKey = "home" | "questions" | "agents" | "diagnostic" | "devices" | "contracts" | "billing" | "settings" | "roadmap" | "internal";
export type Release = "V1" | "V1.5" | "V2";

export interface SectionDef {
  key: SectionKey;
  /** Path segment under /o/{org}. */
  segment: string;
  /** Phase from which the section is open ("Visible desde"). */
  unlockPhase: Phase;
  /** Any of these flags enabled → section shown. */
  features: FeatureKey[];
  /** Roles that can open it (staff always can). undefined = everyone. */
  roles?: Role[];
  staffOnly?: boolean;
  /** Message key in common.locked for the unlock hint. */
  lockHint: "diagnostic" | "automation" | "billing";
}

export const SECTIONS: SectionDef[] = [
  { key: "home", segment: "", unlockPhase: "onboarding", features: ["home"], lockHint: "diagnostic" },
  { key: "questions", segment: "questions", unlockPhase: "automation", features: ["questions"], roles: ["admin", "process_owner", "reviewer"], lockHint: "automation" },
  { key: "agents", segment: "agents", unlockPhase: "automation", features: ["agents.list"], roles: ["admin", "process_owner", "reviewer"], lockHint: "automation" },
  { key: "diagnostic", segment: "diagnostic", unlockPhase: "diagnostic", features: ["diagnostic.progress", "diagnostic.results", "diagnostic.history"], lockHint: "diagnostic" },
  { key: "devices", segment: "devices", unlockPhase: "onboarding", features: ["devices.list", "devices.blocklist", "devices.transparency"], roles: ["admin", "process_owner"], lockHint: "diagnostic" },
  { key: "contracts", segment: "contracts", unlockPhase: "onboarding", features: ["contracts"], roles: ["admin", "signer", "finance"], lockHint: "diagnostic" },
  { key: "billing", segment: "billing", unlockPhase: "automation", features: ["billing"], roles: ["admin", "finance"], lockHint: "billing" },
  { key: "settings", segment: "settings", unlockPhase: "onboarding", features: ["home"], lockHint: "diagnostic" },
  { key: "roadmap", segment: "roadmap", unlockPhase: "onboarding", features: ["home"], lockHint: "diagnostic" },
  { key: "internal", segment: "internal", unlockPhase: "onboarding", features: ["internal.costs"], staffOnly: true, lockHint: "diagnostic" },
];

export const phaseIndex = (p: Phase) => PHASES.indexOf(p);

export type Access = "open" | "locked" | "hidden" | "forbidden";

export function sectionAccess(
  section: SectionDef,
  ctx: { phase: Phase; flags: Record<FeatureKey, boolean>; role: Role | null; staff: boolean },
): Access {
  if (section.staffOnly && !ctx.staff) return "hidden";
  if (!section.features.some((f) => ctx.flags[f])) return "hidden";
  if (!ctx.staff && section.roles && (!ctx.role || !section.roles.includes(ctx.role))) return "forbidden";
  if (phaseIndex(ctx.phase) < phaseIndex(section.unlockPhase)) return "locked";
  return "open";
}

export const sectionByKey = (k: SectionKey) => SECTIONS.find((s) => s.key === k)!;

/* ───────────── Roadmap catalogue ───────────── */

export interface FeatureDef {
  key: FeatureKey;
  phase: Phase;
  release: Release;
  section: SectionKey;
  /** Path under /o/{org} to see it. */
  href: string;
  title: L10n;
  description: L10n;
  /** Can't be switched off (the portal needs it). */
  core?: boolean;
}

export const FEATURES: FeatureDef[] = [
  /* Phase 0 — Onboarding */
  { key: "home", phase: "onboarding", release: "V1", section: "home", href: "", core: true, title: { es: "Inicio contextual", en: "Contextual home" }, description: { es: "Checklist en onboarding y diagnóstico; resumen con cifras y actividad en automatización.", en: "Checklist in onboarding and diagnostic; KPIs and activity in automation." } },
  { key: "onboarding.wizard", phase: "onboarding", release: "V1.5", section: "home", href: "onboarding", title: { es: "Asistente de onboarding (6 pasos)", en: "Onboarding wizard (6 steps)" }, description: { es: "Cuenta, datos de la empresa, contratos (/contract), privacidad, equipos y listo.", en: "Account, company details, contracts (/contract), privacy, devices and done." } },
  { key: "contracts", phase: "onboarding", release: "V1.5", section: "contracts", href: "contracts", title: { es: "Contratos", en: "Contracts" }, description: { es: "Acuerdo piloto, DPA y contratos de servicio por sociedad: estado, firma y PDF.", en: "Pilot agreement, DPA and service contracts per company: status, signature and PDF." } },
  { key: "devices.list", phase: "onboarding", release: "V1.5", section: "devices", href: "devices", title: { es: "Ordenadores con tracker", en: "Computers with tracker" }, description: { es: "Descarga vinculada a la organización, estado de conexión y pausa por equipo.", en: "Org-linked download, connection status and per-device pause." } },
  { key: "devices.blocklist", phase: "onboarding", release: "V1.5", section: "devices", href: "devices?tab=blocklist", title: { es: "Blocklist de apps, URLs y categorías", en: "App, URL and category blocklist" }, description: { es: "«No analizar» / «Analizar», igual que en el contrato.", en: "“Do not analyze” / “Analyze”, same as in the contract." } },
  { key: "devices.transparency", phase: "onboarding", release: "V1.5", section: "devices", href: "devices?tab=transparency", title: { es: "Página de transparencia", en: "Transparency page" }, description: { es: "Para los empleados monitorizados: qué se captura, qué está bloqueado y a quién preguntar.", en: "For monitored employees: what is captured, what is blocked and who to ask." } },
  /* Phase 1 — Diagnostic */
  { key: "diagnostic.progress", phase: "diagnostic", release: "V1.5", section: "diagnostic", href: "diagnostic", title: { es: "Progreso de la captura", en: "Capture progress" }, description: { es: "Día X de 21, ordenadores activos, actividad diaria por equipo y aviso a las 48 h sin datos.", en: "Day X of 21, active computers, daily activity per team and 48 h silence alert." } },
  { key: "diagnostic.results", phase: "diagnostic", release: "V1.5", section: "diagnostic", href: "diagnostic?tab=results", title: { es: "Resultados (dashboard de analytics)", en: "Results (analytics dashboard)" }, description: { es: "Resumen ejecutivo, departamentos, oportunidades con confianza y «Quiero automatizar esto».", en: "Executive summary, departments, opportunities with confidence and “I want to automate this”." } },
  { key: "diagnostic.history", phase: "diagnostic", release: "V1.5", section: "diagnostic", href: "diagnostic?tab=history", title: { es: "Historial de diagnósticos", en: "Diagnostic history" }, description: { es: "Inicial, expansión a otros departamentos y revisiones semestrales.", en: "Initial, expansion to other departments and semester reviews." } },
  /* Phase 2 — Automation */
  { key: "agents.list", phase: "automation", release: "V1", section: "agents", href: "agents", title: { es: "Lista de agentes", en: "Agent list" }, description: { es: "Modo, ejecuciones 7 días, % sin intervención, preguntas, horas ahorradas. Filtros por modo y área.", en: "Mode, 7-day runs, % without intervention, questions, hours saved. Filter by mode and area." } },
  { key: "agents.summary", phase: "automation", release: "V1", section: "agents", href: "agents", title: { es: "Ficha · Resumen", en: "Agent · Summary" }, description: { es: "Qué hace, flujo con sistemas, permisos y horario.", en: "What it does, flow with systems, permissions and schedule." } },
  { key: "agents.runs", phase: "automation", release: "V1", section: "agents", href: "agents", title: { es: "Ficha · Ejecuciones", en: "Agent · Runs" }, description: { es: "Línea de tiempo de pasos con decisión, motivo y datos enmascarados. Sin tokens ni costes.", en: "Step timeline with decision, reason and masked data. No tokens or costs." } },
  { key: "agents.shadow", phase: "automation", release: "V1", section: "agents", href: "agents", title: { es: "Ficha · Shadow", en: "Agent · Shadow" }, description: { es: "Agente frente a equipo, % de coincidencia y botón para pasar a supervisado.", en: "Agent vs team, match rate and button to move to supervised." } },
  { key: "agents.pause", phase: "automation", release: "V1", section: "agents", href: "agents", title: { es: "Botón Pausar", en: "Pause button" }, description: { es: "Siempre visible; pide motivo y confirma.", en: "Always visible; asks for a reason and confirms." } },
  { key: "questions", phase: "automation", release: "V1", section: "questions", href: "questions", title: { es: "Bandeja de preguntas", en: "Questions inbox" }, description: { es: "Preguntas, excepciones y aprobaciones con «Aplicar siempre que pase esto».", en: "Questions, exceptions and approvals with “Always apply when this happens”." } },
  { key: "audit", phase: "automation", release: "V1", section: "settings", href: "settings/audit", title: { es: "Auditoría", en: "Audit log" }, description: { es: "Registro inmutable filtrable; exportar CSV y PDF.", en: "Immutable, filterable log; export CSV and PDF." } },
  { key: "agents.learned", phase: "automation", release: "V1.5", section: "agents", href: "agents", title: { es: "Ficha · Lo que ha aprendido", en: "Agent · What it learned" }, description: { es: "Reglas guardadas desde las preguntas; editar o borrar.", en: "Rules saved from questions; edit or delete." } },
  { key: "agents.performance", phase: "automation", release: "V1.5", section: "agents", href: "agents", title: { es: "Ficha · Rendimiento", en: "Agent · Performance" }, description: { es: "Ejecuciones por semana, % sin intervención, horas y tiempo medio.", en: "Weekly runs, % without intervention, hours and average time." } },
  { key: "notifications.desktop", phase: "automation", release: "V1.5", section: "settings", href: "settings?tab=notifications", title: { es: "Notificaciones de escritorio", en: "Desktop notifications" }, description: { es: "Vía la app del tracker; email a los 30 min; escalado al Responsable.", en: "Via the tracker app; email after 30 min; escalation to the owner." } },
  { key: "billing", phase: "automation", release: "V2", section: "billing", href: "billing", title: { es: "Facturación (Stripe)", en: "Billing (Stripe)" }, description: { es: "Plan por componentes, consumo vs. incluido, facturas y método de pago.", en: "Plan by components, usage vs included, invoices and payment method." } },
  { key: "expand", phase: "automation", release: "V2", section: "home", href: "expand", title: { es: "Ampliar servicio", en: "Expand service" }, description: { es: "Solicitud que entra como oportunidad en el CRM.", en: "Request that lands as an opportunity in the CRM." } },
  { key: "internal.costs", phase: "automation", release: "V2", section: "internal", href: "internal", title: { es: "Vista interna de costes", en: "Internal cost view" }, description: { es: "Solo GeminAI: tokens, coste por ejecución, márgenes y salud de agentes.", en: "GeminAI only: tokens, cost per run, margins and agent health." } },
  { key: "sso", phase: "automation", release: "V2", section: "settings", href: "settings?tab=security", title: { es: "SSO enterprise, Slack y Teams", en: "Enterprise SSO, Slack and Teams" }, description: { es: "Reservado para clientes enterprise.", en: "Reserved for enterprise clients." } },
];
