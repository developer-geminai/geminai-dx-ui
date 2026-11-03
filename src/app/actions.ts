"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import type { FeatureKey, Phase, ServiceRequestKind } from "@/lib/api/types";
import { LANG_COOKIE, isLang } from "@/lib/i18n";
import { SESSION_COOKIE, issueSession, requireOrg } from "@/lib/server/session";
import { can } from "@/lib/permissions";

export interface LoginState {
  error?: string;
}

async function startSession(uid: string) {
  const { value, maxAge } = issueSession(uid);
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.VERCEL === "1",
    path: "/",
    maxAge,
  });
}

/** DEMO: any email + password signs in. Seeded client emails sign in as that client user. */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "missing" };
  const user = await api().authenticate(email, password);
  if (!user) return { error: "invalid" };
  await startSession(user.id);
  redirect("/");
}

export async function ssoLoginAction(formData: FormData): Promise<void> {
  const provider = formData.get("provider") === "microsoft" ? "microsoft" : "google";
  const user = await api().authenticateSso(provider);
  if (!user) redirect("/login?error=sso");
  await startSession(user.id);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function setLangAction(lang: string): Promise<void> {
  if (!isLang(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", sameSite: "lax", maxAge: 365 * 86400 });
  revalidatePath("/", "layout");
}

/* ───── Roadmap / demo controls ───── */

export async function setPhaseAction(orgId: string, phase: Phase): Promise<void> {
  const ctx = await requireOrg(orgId);
  if (!ctx.staff && ctx.role !== "admin") return;
  await api().setPhase(orgId, ctx.actor, phase);
  revalidatePath(`/o/${orgId}`, "layout");
}

export async function setFeatureFlagAction(orgId: string, key: FeatureKey, enabled: boolean): Promise<void> {
  const ctx = await requireOrg(orgId);
  if (!ctx.staff && ctx.role !== "admin") return;
  await api().setFeatureFlag(orgId, ctx.actor, key, enabled);
  revalidatePath(`/o/${orgId}`, "layout");
}

/* ───── Agents: pause is reachable from several screens ───── */

export async function pauseAgentAction(orgId: string, agentId: string, reason: string): Promise<{ ok: boolean }> {
  const ctx = await requireOrg(orgId);
  if (!can(ctx.role, ctx.staff, "agents.pause") || !reason.trim()) return { ok: false };
  await api().pauseAgent(orgId, ctx.actor, agentId, reason.trim());
  revalidatePath(`/o/${orgId}`, "layout");
  return { ok: true };
}

export async function resumeAgentAction(orgId: string, agentId: string): Promise<{ ok: boolean }> {
  const ctx = await requireOrg(orgId);
  if (!can(ctx.role, ctx.staff, "agents.pause")) return { ok: false };
  await api().resumeAgent(orgId, ctx.actor, agentId);
  revalidatePath(`/o/${orgId}`, "layout");
  return { ok: true };
}

/* ───── Expand service → CRM ───── */

export async function createServiceRequestAction(orgId: string, input: { kind: ServiceRequestKind; note: string; opportunityId?: string; department?: string }): Promise<{ ok: boolean; id?: string }> {
  const ctx = await requireOrg(orgId);
  if (!can(ctx.role, ctx.staff, "expand.request")) return { ok: false };
  const req = await api().createServiceRequest(orgId, ctx.actor, input);
  revalidatePath(`/o/${orgId}`, "layout");
  return { ok: true, id: req.id };
}
