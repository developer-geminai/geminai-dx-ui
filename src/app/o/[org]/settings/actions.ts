"use server";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import type { NotificationPrefs, OrgSettingsInput, Role } from "@/lib/api/types";
import { ROLES } from "@/lib/api/types";
import { requireOrg } from "@/lib/server/session";
import { can } from "@/lib/permissions";

type Result = { ok: boolean; error?: string };

export async function inviteUserAction(orgId: string, input: { email: string; name: string; role: Role; scopeEntityId: string | null }): Promise<Result> {
  const ctx = await requireOrg(orgId);
  if (!can(ctx.role, ctx.staff, "users.manage")) return { ok: false, error: "forbidden" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email) || !ROLES.includes(input.role)) return { ok: false, error: "invalid" };
  await api().inviteUser(orgId, ctx.actor, input);
  revalidatePath(`/o/${orgId}/settings`);
  return { ok: true };
}

export async function updateMembershipAction(orgId: string, userId: string, role: Role, scopeEntityId: string | null): Promise<Result> {
  const ctx = await requireOrg(orgId);
  if (!can(ctx.role, ctx.staff, "users.manage") || !ROLES.includes(role)) return { ok: false, error: "forbidden" };
  await api().updateMembership(orgId, ctx.actor, userId, role, scopeEntityId);
  revalidatePath(`/o/${orgId}/settings`);
  return { ok: true };
}

export async function updateNotificationPrefsAction(orgId: string, prefs: NotificationPrefs): Promise<Result> {
  const ctx = await requireOrg(orgId);
  // Each user edits only their own preferences.
  if (prefs.userId !== ctx.actor) return { ok: false, error: "forbidden" };
  await api().updateNotificationPrefs(orgId, ctx.actor, prefs);
  revalidatePath(`/o/${orgId}/settings`);
  return { ok: true };
}

export async function updateSettingsAction(orgId: string, input: OrgSettingsInput): Promise<Result> {
  const ctx = await requireOrg(orgId);
  if (!can(ctx.role, ctx.staff, "settings.edit")) return { ok: false, error: "forbidden" };
  if (input.hourlyRate !== undefined && input.hourlyRate !== null && (!Number.isFinite(input.hourlyRate) || input.hourlyRate < 0 || input.hourlyRate > 1000)) return { ok: false, error: "invalid" };
  await api().updateSettings(orgId, ctx.actor, input);
  revalidatePath(`/o/${orgId}`, "layout");
  return { ok: true };
}
