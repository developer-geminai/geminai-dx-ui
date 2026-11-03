"use server";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import type { BlockRuleKind } from "@/lib/api/types";
import { requireOrg } from "@/lib/server/session";
import { can } from "@/lib/permissions";

async function editor(orgId: string) {
  const ctx = await requireOrg(orgId);
  return can(ctx.role, ctx.staff, "privacy.edit") ? ctx : null;
}

export async function setDeviceCaptureAction(orgId: string, deviceId: string, enabled: boolean): Promise<{ ok: boolean }> {
  const ctx = await editor(orgId);
  if (!ctx) return { ok: false };
  await api().setDeviceCapture(orgId, ctx.actor, deviceId, enabled);
  revalidatePath(`/o/${orgId}`, "layout");
  return { ok: true };
}

export async function setBlockRuleAnalyzeAction(orgId: string, ruleId: string, analyze: boolean): Promise<{ ok: boolean }> {
  const ctx = await editor(orgId);
  if (!ctx) return { ok: false };
  const rule = (await api().listBlockRules(orgId)).find((r) => r.id === ruleId);
  if (!rule) return { ok: false };
  const { id, kind, value, label, description, icon, sensitive } = rule;
  await api().upsertBlockRule(orgId, ctx.actor, { id, kind, value, label, description, icon, sensitive, analyze });
  revalidatePath(`/o/${orgId}`, "layout");
  return { ok: true };
}

export async function addBlockRuleAction(orgId: string, kind: Exclude<BlockRuleKind, "category">, value: string): Promise<{ ok: boolean }> {
  const ctx = await editor(orgId);
  const v = value.trim();
  if (!ctx || !v || v.length > 200) return { ok: false };
  const clean = kind === "url" ? v.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase() : v;
  await api().upsertBlockRule(orgId, ctx.actor, { kind, value: clean, label: clean, analyze: false });
  revalidatePath(`/o/${orgId}`, "layout");
  return { ok: true };
}

export async function deleteBlockRuleAction(orgId: string, ruleId: string): Promise<{ ok: boolean }> {
  const ctx = await editor(orgId);
  if (!ctx) return { ok: false };
  await api().deleteBlockRule(orgId, ctx.actor, ruleId);
  revalidatePath(`/o/${orgId}`, "layout");
  return { ok: true };
}
