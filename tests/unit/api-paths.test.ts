import { describe, expect, it } from "vitest";
import { buildBackendPath, isSafeId } from "@/lib/api-paths";

describe("buildBackendPath allow-list", () => {
  it("accepts the read endpoints of the Python console", () => {
    expect(buildBackendPath(["agents"])).toBe("/api/agents");
    expect(buildBackendPath(["overview"], { agent: "invoice-reviewer" })).toBe("/api/overview?agent=invoice-reviewer");
    expect(buildBackendPath(["cases"], { agent: "a", q: "INV", status: "waiting" })).toBe("/api/cases?agent=a&q=INV&status=waiting");
    expect(buildBackendPath(["cases", "a", "C-1"])).toBe("/api/cases/a/C-1");
    expect(buildBackendPath(["cases", "a", "C-1", "audit"])).toBe("/api/cases/a/C-1/audit");
    expect(buildBackendPath(["cases", "a", "C-1", "runs"])).toBe("/api/cases/a/C-1/runs");
    expect(buildBackendPath(["cases", "a", "C-1", "questions", "Q 1"])).toBe("/api/cases/a/C-1/questions/Q%201");
  });

  it("refuses anything else", () => {
    expect(buildBackendPath([])).toBeNull();
    expect(buildBackendPath(["admin"])).toBeNull();
    expect(buildBackendPath(["cases", "a"])).toBeNull();
    expect(buildBackendPath(["cases", "a", "C", "delete"])).toBeNull();
    expect(buildBackendPath(["cases", "a", "C", "questions"])).toBeNull();
    expect(buildBackendPath(["cases", "a", "C", "questions", "Q", "answer"])).toBeNull();
    expect(buildBackendPath(["cases", "../etc", "C"])).toBeNull();
    expect(buildBackendPath(["cases", "a\\b", "C"])).toBeNull();
    expect(buildBackendPath(["cases", "a", "x".repeat(181)])).toBeNull();
  });

  it("encodes identifiers and drops invalid query values", () => {
    expect(buildBackendPath(["cases", "a b", "C#1"])).toBe("/api/cases/a%20b/C%231");
    expect(buildBackendPath(["cases"], { q: "x".repeat(101) })).toBe("/api/cases");
    expect(buildBackendPath(["cases"], { q: "a\u0000b" })).toBe("/api/cases");
    expect(buildBackendPath(["agents"], { agent: "a" })).toBe("/api/agents");
  });

  it("validates ids", () => {
    expect(isSafeId("CASE-1")).toBe(true);
    expect(isSafeId("")).toBe(false);
    expect(isSafeId("a/b")).toBe(false);
    expect(isSafeId(undefined)).toBe(false);
  });
});
