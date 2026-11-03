"use server";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import type { Assignee } from "@/lib/api/types";
import { requireOrg } from "@/lib/server/session";
import { can } from "@/lib/permissions";

export async function answerQuestionAction(orgId: string, questionId: string, input: { value: string; applyAlways: boolean }): Promise<{ ok: boolean; ruleId?: string }> {
  const ctx = await requireOrg(orgId);
  const value = input.value.trim();
  if (!can(ctx.role, ctx.staff, "questions.answer") || !value) return { ok: false };
  const q = await api().answerQuestion(orgId, ctx.actor, questionId, { value: value.slice(0, 2000), applyAlways: Boolean(input.applyAlways) });
  revalidatePath(`/o/${orgId}`, "layout");
  return { ok: true, ruleId: q.answer?.ruleId };
}

export async function reassignQuestionAction(orgId: string, questionId: string, assignee: Assignee): Promise<{ ok: boolean }> {
  const ctx = await requireOrg(orgId);
  if (!can(ctx.role, ctx.staff, "questions.reassign")) return { ok: false };
  if (assignee.type !== "user" && assignee.type !== "role") return { ok: false };
  await api().reassignQuestion(orgId, ctx.actor, questionId, { type: assignee.type, id: String(assignee.id), label: String(assignee.label) });
  revalidatePath(`/o/${orgId}`, "layout");
  return { ok: true };
}
