"use server";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import type { LearnedRule } from "@/lib/api/types";
import { requireOrg } from "@/lib/server/session";
import { can } from "@/lib/permissions";

/** Shadow → Supervised. Process owner or admin only. */
export async function promoteAgentAction(orgId: string, agentId: string): Promise<{ ok: boolean }> {
  const ctx = await requireOrg(orgId);
  if (!can(ctx.role, ctx.staff, "agents.promote")) return { ok: false };
  await api().promoteAgent(orgId, ctx.actor, agentId);
  revalidatePath(`/o/${orgId}`, "layout");
  return { ok: true };
}

export async function updateRuleAction(orgId: string, ruleId: string, patch: Partial<Pick<LearnedRule, "condition" | "action" | "active">>): Promise<{ ok: boolean }> {
  const ctx = await requireOrg(orgId);
  if (!can(ctx.role, ctx.staff, "rules.edit")) return { ok: false };
  const clean: typeof patch = {};
  if (typeof patch.condition === "string" && patch.condition.trim()) clean.condition = patch.condition.trim();
  if (typeof patch.action === "string" && patch.action.trim()) clean.action = patch.action.trim();
  if (typeof patch.active === "boolean") clean.active = patch.active;
  await api().updateRule(orgId, ctx.actor, ruleId, clean);
  revalidatePath(`/o/${orgId}`, "layout");
  return { ok: true };
}

export async function deleteRuleAction(orgId: string, ruleId: string): Promise<{ ok: boolean }> {
  const ctx = await requireOrg(orgId);
  if (!can(ctx.role, ctx.staff, "rules.edit")) return { ok: false };
  await api().deleteRule(orgId, ctx.actor, ruleId);
  revalidatePath(`/o/${orgId}`, "layout");
  return { ok: true };
}
