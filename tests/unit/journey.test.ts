import { describe, expect, it } from "vitest";
import { buildJourneySummary, stepPhase } from "@/lib/journey";
import type { CaseDetail } from "@/lib/types";
import legacyCase from "../fixtures/legacyCase.json";
import genericCase from "../fixtures/genericCase.json";
import legacyObsCase from "../fixtures/legacyObsCase.json";

const legacy = legacyCase as unknown as CaseDetail;
const generic = genericCase as unknown as CaseDetail;
const legacyObs = legacyObsCase as unknown as CaseDetail;

/** Every string anywhere in the recorded case. */
function recordedStrings(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === "string") out.add(value);
  else if (Array.isArray(value)) value.forEach((v) => recordedStrings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => recordedStrings(v, out));
  return out;
}

// Titles the builder composes from recorded data (counts, option lists, key/value renderings).
const COMPOSED = [/^\d+ open question\(s\)$/, /^\d+ check\(s\) still need follow-up$/, /^Candidate choices: /, /^\d+ attachment\(s\)$/, /^Business effect not verified$/, /^Recorded human response$/, /: /];

function assertNoFabrication(c: CaseDetail) {
  const recorded = recordedStrings(c);
  const { sections } = buildJourneySummary(c);
  for (const s of sections) {
    for (const item of s.items) {
      const ok = recorded.has(item.title) || COMPOSED.some((r) => r.test(item.title));
      expect(ok, `"${item.title}" in section ${s.key} must come from recorded data`).toBe(true);
    }
  }
}

describe("buildJourneySummary", () => {
  it("answers all eight business questions in a fixed order", () => {
    const { sections } = buildJourneySummary(generic);
    expect(sections.map((s) => s.key)).toEqual(["received", "understood", "checked", "decided", "alternatives", "human", "achieved", "unresolved"]);
  });

  it("uses only recorded content for a generic (finance) agent", () => {
    assertNoFabrication(generic);
    const { sections } = buildJourneySummary(generic);
    const by = Object.fromEntries(sections.map((s) => [s.key, s]));
    expect(by.received!.items.map((i) => i.title)).toEqual(expect.arrayContaining(["Invoice INV-742", "Document", "Order", "I received the supplier invoice"]));
    expect(by.checked!.items.map((i) => i.title)).toEqual(expect.arrayContaining(["I compared it with the purchase order", "Purchase order and invoice differ"]));
    expect(by.decided!.items.map((i) => i.title)).toContain("I paused before approving");
    expect(by.human!.items[0]!.title).toBe("Can we accept the additional 45 EUR on the invoice?");
    expect(by.achieved!.items[0]!.title).toBe("Approval needs clarification");
    expect(by.unresolved!.items.map((i) => i.title)).toEqual(expect.arrayContaining(["1 open question(s)", "1 check(s) still need follow-up"]));
  });

  it("uses only recorded content for the legacy (transport) adapter", () => {
    assertNoFabrication(legacy);
    assertNoFabrication(legacyObs);
    const { sections } = buildJourneySummary(legacy);
    const by = Object.fromEntries(sections.map((s) => [s.key, s]));
    expect(by.checked!.items.map((i) => i.title)).toContain("More than one shipment may match");
    expect(by.alternatives!.items.some((i) => i.title.startsWith("Candidate choices: Booking BK-DEMO-311"))).toBe(true);
    expect(by.achieved!.items.map((i) => i.title)).toEqual(expect.arrayContaining(["Waiting for an answer", "No change was made to ShipControl"]));
  });

  it("the same builder serves two unrelated business domains without domain knowledge", () => {
    // No section question mentions a domain; domain words only arrive through data.
    for (const c of [legacy, generic]) {
      for (const s of buildJourneySummary(c).sections) expect(s.question).not.toMatch(/shipment|invoice|booking|order|ticket/i);
    }
  });

  it("states explicitly when nothing was recorded instead of inventing steps", () => {
    const empty: CaseDetail = {
      id: "X",
      title: "Untitled",
      status: "received",
      status_label: "Received",
      tone: "neutral",
      steps: [],
      questions: [],
      observations: [],
      outcome: { label: "Received", effects_status: "not_executed" },
      agent_id: "a",
      agent_name: "A",
    };
    const { sections } = buildJourneySummary(empty);
    for (const s of sections.filter((x) => x.key !== "achieved")) expect(s.items).toHaveLength(0);
    expect(sections.find((s) => s.key === "decided")!.emptyText).toMatch(/No decision step is recorded/);
  });

  it("never classifies unknown event types; they are counted as unclassified", () => {
    const c: CaseDetail = { ...generic, steps: [...generic.steps, { id: "z", title: "Custom milestone", event_type: "warehouse_slot_reserved", tone: "done" }] };
    const { sections, unclassifiedSteps } = buildJourneySummary(c);
    expect(unclassifiedSteps).toBe(1);
    expect(sections.flatMap((s) => s.items).some((i) => i.title === "Custom milestone")).toBe(false);
  });

  it("flags an unverified business effect as unresolved", () => {
    const c: CaseDetail = { ...generic, outcome: { ...generic.outcome, effects_status: "unknown" } };
    const unresolved = buildJourneySummary(c).sections.find((s) => s.key === "unresolved")!;
    expect(unresolved.items.map((i) => i.title)).toContain("Business effect not verified");
  });

  it("maps legacy step ids and generic event types to phases", () => {
    expect(stepPhase({ id: "arrived", title: "" })).toBe("input");
    expect(stepPhase({ id: "question:Q1", title: "" })).toBe("question");
    expect(stepPhase({ id: "s", title: "", event_type: "outcome_verified" })).toBe("outcome");
    expect(stepPhase({ id: "s", title: "", category: "source_checked" })).toBe("check");
    expect(stepPhase({ id: "s", title: "" })).toBeNull();
  });
});
