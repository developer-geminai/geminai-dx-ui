import { beforeEach, describe, expect, it } from "vitest";
import { mockApi, resetMockDb } from "@/lib/api/mock";
import { sectionAccess, sectionByKey, FEATURES } from "@/lib/features";
import { signSession, verifySession } from "@/lib/server/session";
import type { FeatureKey } from "@/lib/api/types";

const ORG = "grupo-helios";
const ACTOR = "u-geminai";

beforeEach(() => resetMockDb());

describe("mock API", () => {
  it("any credentials sign in; seeded client emails resolve to that user", async () => {
    expect((await mockApi.authenticate("whoever@example.com", "x"))?.geminaiStaff).toBe(true);
    const admin = await mockApi.authenticate("lucia.ferrer@helios.demo", "x");
    expect(admin?.memberships[0]?.role).toBe("admin");
    const viewer = await mockApi.getViewer(admin!.id);
    expect(viewer?.organizations.map((o) => o.id)).toEqual([ORG]);
  });

  it("seeds one organization per phase", async () => {
    const staff = await mockApi.getViewer(ACTOR);
    expect(staff?.organizations.map((o) => o.phase).sort()).toEqual(["automation", "diagnostic", "onboarding"]);
  });

  it("answering with 'apply always' creates a learned rule linked to the question and writes audit", async () => {
    const [q] = await mockApi.listQuestions(ORG, { status: "pending" }).then((qs) => qs.filter((x) => x.kind !== "approval"));
    expect(q).toBeDefined();
    const answered = await mockApi.answerQuestion(ORG, ACTOR, q!.id, { value: q!.options[0]!, applyAlways: true });
    expect(answered.status).toBe("answered");
    const rules = await mockApi.listRules(ORG, q!.agentId);
    expect(rules.find((r) => r.id === answered.answer?.ruleId)?.sourceQuestionId).toBe(q!.id);
    const audit = await mockApi.listAudit(ORG, { type: "human_answer" });
    expect(audit[0]?.object).toContain(q!.text);
  });

  it("pause asks for nothing more than a reason and resumes to the previous mode", async () => {
    const agent = (await mockApi.listAgents(ORG, { mode: "active" }))[0]!;
    const paused = await mockApi.pauseAgent(ORG, ACTOR, agent.id, "Prueba");
    expect(paused.mode).toBe("paused");
    expect(paused.pause?.reason).toBe("Prueba");
    expect((await mockApi.resumeAgent(ORG, ACTOR, agent.id)).mode).toBe("active");
  });

  it("shadow → supervised promotion", async () => {
    const shadow = (await mockApi.listAgents(ORG, { mode: "shadow" }))[0]!;
    const report = await mockApi.getShadowReport(ORG, shadow.id);
    expect(report?.criterion).toEqual({ minMatchRate: 0.95, minRuns: 30 });
    expect((await mockApi.promoteAgent(ORG, ACTOR, shadow.id)).mode).toBe("supervised");
  });

  it("run detail has a step timeline without tokens or costs", async () => {
    const run = (await mockApi.listRuns(ORG, { status: "completed", limit: 1 }))[0]!;
    const detail = await mockApi.getRun(ORG, run.id);
    expect(detail?.steps.length).toBeGreaterThan(0);
    expect(JSON.stringify(detail)).not.toMatch(/token|cost/i);
  });

  it("€ value only when the client sets a rate", async () => {
    expect((await mockApi.getHome(ORG)).kpis.valueSavedMonth).not.toBeNull();
    await mockApi.updateSettings(ORG, ACTOR, { hourlyRate: null });
    expect((await mockApi.getHome(ORG)).kpis.valueSavedMonth).toBeNull();
  });

  it("diagnostic results are preliminary during capture and absent in onboarding", async () => {
    expect((await mockApi.getDiagnosticResults("logistica-brisa"))?.preliminary).toBe(true);
    expect(await mockApi.getDiagnosticResults("clinica-aurora")).toBeNull();
    expect((await mockApi.getDiagnosticProgress("logistica-brisa"))?.diagnostic.day).toBe(12);
  });

  it("completing onboarding moves the org to diagnostic", async () => {
    for (const s of ["contracts", "privacy", "devices", "done"] as const) await mockApi.completeOnboardingStep("clinica-aurora", ACTOR, s);
    expect((await mockApi.getOrganization("clinica-aurora"))?.phase).toBe("diagnostic");
    expect((await mockApi.listContracts("clinica-aurora")).filter((c) => c.type !== "service").every((c) => c.status === "signed")).toBe(true);
  });
});

describe("phase gating", () => {
  const allOn = Object.fromEntries(FEATURES.map((f) => [f.key, true])) as Record<FeatureKey, boolean>;
  it("future-phase sections are locked, never hidden", () => {
    expect(sectionAccess(sectionByKey("agents"), { phase: "onboarding", flags: allOn, role: "admin", staff: false })).toBe("locked");
    expect(sectionAccess(sectionByKey("diagnostic"), { phase: "diagnostic", flags: allOn, role: "admin", staff: false })).toBe("open");
  });
  it("disabled feature flags hide the section; roles are enforced", () => {
    expect(sectionAccess(sectionByKey("questions"), { phase: "automation", flags: { ...allOn, questions: false }, role: "admin", staff: false })).toBe("hidden");
    expect(sectionAccess(sectionByKey("billing"), { phase: "automation", flags: allOn, role: "reviewer", staff: false })).toBe("forbidden");
    expect(sectionAccess(sectionByKey("internal"), { phase: "automation", flags: allOn, role: "admin", staff: false })).toBe("hidden");
  });
});

describe("session cookie", () => {
  it("round-trips and rejects tampering/expiry", () => {
    const key = Buffer.from("k".repeat(32));
    const token = signSession({ uid: "u1", exp: 2_000_000_000 }, key);
    expect(verifySession(token, key, 1)?.uid).toBe("u1");
    expect(verifySession(token.replace(/.$/, "x"), key, 1)).toBeNull();
    expect(verifySession(token, key, 2_000_000_001)).toBeNull();
  });
});
