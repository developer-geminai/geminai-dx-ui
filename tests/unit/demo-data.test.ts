import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { demoRead } from "@/lib/server/demo/data";
import { BackendError, createConsoleClient } from "@/lib/server/console-api";
import { signSession, verifySession } from "@/lib/server/session";
import type { Session } from "@/lib/server/session";

const ORG = { id: "DEMO-WORKSPACE", label: "Demo workspace" };
const parse = (r: { body: string }) => JSON.parse(r.body) as Record<string, unknown>;

describe("demo data source", () => {
  it("serves every root read for both demo organizations", () => {
    for (const org of ["DEMO-WORKSPACE", "DEMO-SECOND-ORG"]) {
      for (const read of ["agents", "overview", "cases", "questions", "insights"]) {
        expect(demoRead(org, [read]).status).toBe(200);
      }
    }
  });

  it("returns 404 for unknown organizations and cases, 400 for unknown agents", () => {
    expect(demoRead("OTHER-ORG", ["agents"]).status).toBe(404);
    expect(demoRead(ORG.id, ["cases", "customer-support", "NOPE"]).status).toBe(404);
    expect(demoRead(ORG.id, ["overview"], { agent: "nope" }).status).toBe(400);
  });

  it("filters cases by agent, status and search term", async () => {
    const client = createConsoleClient(ORG);
    const all = await client.cases();
    expect(all.items.length).toBeGreaterThan(0);
    const agent = all.items[0]!.agent_id!;
    const byAgent = await client.cases({ agent });
    expect(byAgent.items.every((c) => c.agent_id === agent)).toBe(true);
    const status = all.items[0]!.status;
    const byStatus = await client.cases({ status });
    expect(byStatus.items.every((c) => c.status === status)).toBe(true);
    const id = all.items[0]!.id;
    expect((await client.cases({ q: id.toLowerCase() })).items.map((c) => c.id)).toContain(id);
    expect((await client.cases({ q: "zzz-no-match-zzz" })).items).toHaveLength(0);
  });

  it("has a detail, runs, audit and question context for every listed case/question", async () => {
    const client = createConsoleClient(ORG);
    for (const c of (await client.cases()).items) {
      await expect(client.caseDetail(c.agent_id!, c.id)).resolves.toBeTruthy();
      await expect(client.runs(c.agent_id!, c.id)).resolves.toBeTruthy();
      expect(demoRead(ORG.id, ["cases", c.agent_id!, c.id, "audit"]).status).toBe(200);
    }
    for (const q of (await client.questions()).items) {
      await expect(client.questionContext(q.agent_id!, q.case_id, q.id)).resolves.toBeTruthy();
    }
  });

  it("keeps the newest demo event recent (timestamps are shifted)", () => {
    const cases = parse(demoRead(ORG.id, ["cases"])).items as { updated_at?: string }[];
    const newest = Math.max(...cases.map((c) => Date.parse(c.updated_at ?? "") || 0));
    expect(Date.now() - newest).toBeLessThan(2 * 86_400_000);
  });

  it("refuses non-allow-listed reads", async () => {
    const client = createConsoleClient(ORG);
    await expect(client.caseDetail("a/b", "c")).rejects.toBeInstanceOf(BackendError);
  });
});

describe("demo session cookie", () => {
  const secret = Buffer.from("x".repeat(40));
  it("verifies its own signature and rejects tampering or expiry", () => {
    const token = signSession({ op: "demo-operator", exp: Date.now() / 1000 + 60 }, secret);
    expect(verifySession(token, secret)?.op).toBe("demo-operator");
    expect(verifySession(token + "x", secret)).toBeNull();
    expect(verifySession(signSession({ op: "demo-operator", exp: 1 }, secret), secret)).toBeNull();
  });
});

const state: { session: Session | null } = { session: null };
vi.mock("@/lib/server/session", async (orig) => ({
  ...(await orig<typeof import("@/lib/server/session")>()),
  getSession: async () => state.session,
}));

describe("read route", () => {
  afterEach(() => {
    state.session = null;
  });
  const call = async (path: string[], org = ORG.id) => {
    const { GET } = await import("@/app/api/orgs/[org]/[...path]/route");
    return GET(new NextRequest(`http://localhost/api/orgs/${org}/${path.join("/")}`), { params: Promise.resolve({ org, path }) });
  };

  it("requires a session and a known organization", async () => {
    expect((await call(["agents"])).status).toBe(401);
    state.session = { operator: { id: "demo-operator", displayName: "Demo", organizations: ["*"] }, organizations: [ORG], expiresAt: 9e9 };
    expect((await call(["agents"])).status).toBe(200);
    expect((await call(["agents"], "OTHER-ORG")).status).toBe(404);
    expect((await call(["secrets"])).status).toBe(400);
  });

  it("refuses mutations", async () => {
    const { POST } = await import("@/app/api/orgs/[org]/[...path]/route");
    expect(POST().status).toBe(405);
  });
});
