"use server";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import { requireOrg } from "@/lib/server/session";
import { can } from "@/lib/permissions";

export async function signContractAction(orgId: string, contractId: string): Promise<{ ok: boolean }> {
  const ctx = await requireOrg(orgId);
  if (!can(ctx.role, ctx.staff, "contracts.sign")) return { ok: false };
  await api().signContract(orgId, ctx.actor, contractId);
  revalidatePath(`/o/${orgId}`, "layout");
  return { ok: true };
}
