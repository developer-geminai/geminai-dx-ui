import "server-only";
import { cache } from "react";
import { requireOrganization } from "./session";
import { createConsoleClient, describeError } from "./console-api";

/** Per-request memoised access to one authorized organization's backend. */
export const orgContext = cache(async (orgId: string) => {
  const { session, organization } = await requireOrganization(orgId);
  return { session, organization, client: createConsoleClient(organization) };
});

export const orgAgents = cache(async (orgId: string) => {
  const { client } = await orgContext(orgId);
  return client.agents();
});

export const orgOverview = cache(async (orgId: string, agent: string = "all") => {
  const { client } = await orgContext(orgId);
  return client.overview(agent);
});

export type Loaded<T> = { ok: true; data: T } | { ok: false; error: ReturnType<typeof describeError> };

export async function attempt<T>(fn: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    // Let Next.js control-flow errors (redirect/notFound) propagate.
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest: unknown }).digest === "string" && /NEXT_(REDIRECT|HTTP_ERROR|NOT_FOUND)/.test((err as { digest: string }).digest)) throw err;
    return { ok: false, error: describeError(err) };
  }
}

/** Validate an ?agent= value against the organization's agents (unknown → "all"). */
export function resolveAgentFilter(value: string | undefined, agents: { id: string }[]): string {
  return value && agents.some((a) => a.id === value) ? value : "all";
}
