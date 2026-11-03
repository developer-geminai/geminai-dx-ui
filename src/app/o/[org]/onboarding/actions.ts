"use server";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import type { CompanyDetails, OnboardingStepKey, Organization } from "@/lib/api/types";
import { requireOrg } from "@/lib/server/session";
import { can } from "@/lib/permissions";

type Result = { ok: boolean };

export async function completeStepAction(orgId: string, step: OnboardingStepKey): Promise<Result> {
  const ctx = await requireOrg(orgId);
  const allowed = step === "contracts" ? can(ctx.role, ctx.staff, "contracts.sign") : can(ctx.role, ctx.staff, "settings.edit");
  if (!allowed) return { ok: false };
  await api().completeOnboardingStep(orgId, ctx.actor, step);
  revalidatePath(`/o/${orgId}`, "layout");
  return { ok: true };
}

export async function saveCompanyAction(orgId: string, company: CompanyDetails): Promise<Result> {
  const ctx = await requireOrg(orgId);
  if (!can(ctx.role, ctx.staff, "settings.edit")) return { ok: false };
  if (!company.legalName.trim() || !company.nif.trim()) return { ok: false };
  await api().saveCompany(orgId, ctx.actor, company);
  await api().completeOnboardingStep(orgId, ctx.actor, "company");
  revalidatePath(`/o/${orgId}`, "layout");
  return { ok: true };
}

export async function savePrivacyAction(orgId: string, retention: Organization["retention"], changes: { id: string; analyze: boolean }[]): Promise<Result> {
  const ctx = await requireOrg(orgId);
  if (!can(ctx.role, ctx.staff, "privacy.edit")) return { ok: false };
  const rules = await api().listBlockRules(orgId);
  for (const c of changes) {
    const r = rules.find((x) => x.id === c.id);
    if (!r || r.analyze === c.analyze) continue;
    const { id, kind, value, label, description, icon, sensitive } = r;
    await api().upsertBlockRule(orgId, ctx.actor, { id, kind, value, label, description, icon, sensitive, analyze: c.analyze });
  }
  await api().updateSettings(orgId, ctx.actor, { retention });
  await api().completeOnboardingStep(orgId, ctx.actor, "privacy");
  revalidatePath(`/o/${orgId}`, "layout");
  return { ok: true };
}
