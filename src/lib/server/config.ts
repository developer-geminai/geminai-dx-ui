import "server-only";

/**
 * DEMO BUILD configuration (server-side only).
 *
 * Two fictional organizations served from the bundled snapshot, and one demo operator who can
 * read both. Sign-in accepts any access key (see app/actions.ts).
 */

export interface OrganizationConfig {
  id: string;
  label: string;
}

export interface OperatorConfig {
  id: string;
  displayName: string;
  /** Organization IDs this operator may read. "*" grants every configured organization. */
  organizations: string[];
}

export interface ControlCenterConfig {
  organizations: OrganizationConfig[];
  operators: OperatorConfig[];
  sessionTtlMinutes: number;
}

export class ConfigurationError extends Error {
  override name = "ConfigurationError";
}

export const DEMO_OPERATOR_ID = "demo-operator";

const DEMO_CONFIG: ControlCenterConfig = {
  organizations: [
    { id: "DEMO-WORKSPACE", label: "Demo workspace" },
    { id: "DEMO-SECOND-ORG", label: "Second demo organization" },
  ],
  operators: [{ id: DEMO_OPERATOR_ID, displayName: "Demo operator", organizations: ["*"] }],
  sessionTtlMinutes: 480,
};

export function loadConfig(): ControlCenterConfig {
  return DEMO_CONFIG;
}

export function organizationsForOperator(cfg: ControlCenterConfig, operator: OperatorConfig): OrganizationConfig[] {
  if (operator.organizations.includes("*")) return cfg.organizations;
  const allowed = new Set(operator.organizations);
  return cfg.organizations.filter((o) => allowed.has(o.id));
}
