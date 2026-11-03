import type { Role } from "@/lib/api/types";

/** What each role can do (spec "Roles y permisos"). GeminAI staff can do everything. */
export type Permission =
  | "agents.pause"
  | "agents.promote"
  | "questions.answer"
  | "questions.reassign"
  | "rules.edit"
  | "billing.view"
  | "users.manage"
  | "privacy.edit"
  | "contracts.sign"
  | "audit.view"
  | "settings.edit"
  | "expand.request";

const MATRIX: Record<Role, Permission[]> = {
  admin: ["agents.pause", "agents.promote", "questions.answer", "questions.reassign", "rules.edit", "billing.view", "users.manage", "privacy.edit", "contracts.sign", "audit.view", "settings.edit", "expand.request"],
  process_owner: ["agents.pause", "agents.promote", "questions.answer", "questions.reassign", "rules.edit", "audit.view", "expand.request"],
  reviewer: ["questions.answer"],
  finance: ["billing.view"],
  signer: ["contracts.sign"],
};

export function can(role: Role | null, staff: boolean, p: Permission): boolean {
  if (staff) return true;
  return role ? MATRIX[role].includes(p) : false;
}
