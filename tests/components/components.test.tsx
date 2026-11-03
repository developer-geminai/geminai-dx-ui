import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Agent, CaseDetail, Question } from "@/lib/types";
import { buildJourneySummary } from "@/lib/journey";
import { JourneySummary } from "@/components/journey/journey-summary";
import { Timeline } from "@/components/journey/timeline";
import { AgentsExplorer } from "@/components/agents/agents-explorer";
import { AnswerComposer } from "@/components/inbox/answer-composer";
import { StatusBadge, EffectBadge } from "@/components/status";
import { InputPanel } from "@/components/journey/input-panel";
import agents from "../fixtures/agents.json";
import genericCase from "../fixtures/genericCase.json";
import legacyCase from "../fixtures/legacyCase.json";
import questionsFixture from "../fixtures/questions.json";
import legacyCtx from "../fixtures/legacyQuestionContext.json";
import genericCtx from "../fixtures/genericQuestionContext.json";

const nav = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  usePathname: () => "/o/DEMO-WORKSPACE/inbox",
  useSearchParams: () => nav.params,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  nav.params = new URLSearchParams();
});

describe("journey rendering", () => {
  it("renders the eight questions for two different business domains with the same component", () => {
    for (const fixture of [genericCase, legacyCase]) {
      const { sections, unclassifiedSteps } = buildJourneySummary(fixture as unknown as CaseDetail);
      const { unmount } = render(<JourneySummary sections={sections} unclassifiedSteps={unclassifiedSteps} />);
      expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(8);
      expect(screen.getByRole("heading", { name: /What the agent received/ })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /What remains unresolved/ })).toBeInTheDocument();
      unmount();
    }
    render(<JourneySummary {...buildJourneySummary(genericCase as unknown as CaseDetail)} />);
    // Appears under "checked" and, because it was flagged for attention, under "problems".
    expect(screen.getAllByText("I compared it with the purchase order").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the timeline in recorded order with technical details collapsed", async () => {
    const c = genericCase as unknown as CaseDetail;
    render(<Timeline steps={c.steps} runs={c.runs} />);
    const titles = screen.getAllByText(/^I /).map((n) => n.textContent);
    expect(titles).toEqual(c.steps.map((s) => s.title));
    expect(screen.queryByText("Evidence ref")).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: /Technical details/ })[0]!);
    expect(screen.getByText("Evidence ref")).toBeInTheDocument();
    expect(screen.getByText("EV-0")).toBeInTheDocument();
  });

  it("groups steps by recorded run and never invents runs", () => {
    const steps = [
      { id: "1", title: "First attempt started", run_id: "r1", tone: "done" },
      { id: "2", title: "First attempt failed", run_id: "r1", tone: "error", event_state: "failed" },
      { id: "3", title: "Retry succeeded", run_id: "r2", tone: "done", parent_event_id: "2" },
    ];
    render(<Timeline steps={steps} runs={[{ id: "r1", label: "Attempt 1", state: "failed" }, { id: "r2", label: "Attempt 2", state: "completed" }]} />);
    expect(screen.getByRole("region", { name: "Run Attempt 1" })).toHaveTextContent("First attempt failed");
    expect(screen.getByRole("region", { name: "Run Attempt 2" })).toHaveTextContent("Retry succeeded");
    cleanup();
    render(<Timeline steps={steps.map(({ run_id: _r, ...s }) => s)} />);
    expect(screen.queryByText(/Attempt/)).not.toBeInTheDocument();
  });

  it("renders original input as plain text, never as HTML", () => {
    render(<InputPanel request={{ channel: "email", subject: "Hi", body: "<img src=x onerror=alert(1)><b>bold</b>" }} />);
    expect(screen.getByText("<img src=x onerror=alert(1)><b>bold</b>")).toBeInTheDocument();
    expect(document.querySelector("img[src=x]")).toBeNull();
  });

  it("status and effect are conveyed with text, not colour alone", () => {
    render(
      <>
        <StatusBadge tone="attention" label="Waiting for an answer" />
        <EffectBadge status="unknown" />
      </>,
    );
    expect(screen.getByText("Waiting for an answer")).toBeInTheDocument();
    expect(screen.getByText("Effect not verified")).toBeInTheDocument();
  });
});

describe("agents explorer", () => {
  it("searches and filters agents and their comparison table", async () => {
    render(<AgentsExplorer org="DEMO-WORKSPACE" agents={(agents as { items: Agent[] }).items} />);
    expect(screen.getByText("Showing 3 of 3 agents")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Search agents"), "invoice");
    expect(screen.getByText("Showing 1 of 3 agents")).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByText("Invoice reviewer")).toBeInTheDocument();
    expect(within(table).queryByText("Transport coordinator")).not.toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Search agents"));
    await userEvent.selectOptions(screen.getByLabelText("Category"), "Operations");
    expect(screen.getByText("Showing 1 of 3 agents")).toBeInTheDocument();
  });
});

describe("answer composer", () => {
  it("keeps submission disabled when the backend does not enable it and isolates drafts per question", async () => {
    const opts = [
      { id: "1", label: "Approve line" },
      { id: "2", label: "Request a corrected invoice" },
    ];
    const { rerender } = render(<AnswerComposer org="o" agentId="a" caseId="c1" questionId="q" options={opts} submissionEnabled={false} isOpen />);
    expect(screen.getByRole("button", { name: /Submit answer/ })).toBeDisabled();
    expect(screen.getByText(/Answer submission is not enabled/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Your answer"), "draft for c1");
    await userEvent.click(screen.getByLabelText("Approve line"));

    // Same question id on a different case must not see the draft.
    rerender(<AnswerComposer org="o" agentId="a" caseId="c2" questionId="q" options={opts} submissionEnabled={false} isOpen />);
    await waitFor(() => expect(screen.getByLabelText("Your answer")).toHaveValue(""));
    expect(screen.getByLabelText("Approve line")).not.toBeChecked();

    rerender(<AnswerComposer org="o" agentId="a" caseId="c1" questionId="q" options={opts} submissionEnabled={false} isOpen />);
    await waitFor(() => expect(screen.getByLabelText("Your answer")).toHaveValue("draft for c1"));
    expect(screen.getByLabelText("Approve line")).toBeChecked();
  });
});

describe("human inbox", () => {
  const items = (questionsFixture as { items: Question[] }).items;

  it("loads the selected question's context through the same-origin proxy and ignores late responses", async () => {
    const { InboxView } = await import("@/components/inbox/inbox-view");
    const resolvers: Record<string, (r: Response) => void> = {};
    const fetchMock = vi.fn((url: string) => new Promise<Response>((resolve) => (resolvers[url] = resolve)));
    vi.stubGlobal("fetch", fetchMock);

    const first = items.find((q) => q.agent_id === "transport-operations")!;
    const second = items.find((q) => q.agent_id === "invoice-reviewer")!;
    nav.params = new URLSearchParams({ question: `${first.agent_id}::${first.case_id}::${first.id}` });
    const { rerender } = render(<InboxView org="DEMO-WORKSPACE" questions={items} />);
    const firstUrl = `/api/orgs/DEMO-WORKSPACE/cases/${first.agent_id}/${first.case_id}/questions/${first.id}`;
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(firstUrl, expect.anything()));

    // User switches to another question before the first response arrives.
    nav.params = new URLSearchParams({ question: `${second.agent_id}::${second.case_id}::${second.id}` });
    rerender(<InboxView org="DEMO-WORKSPACE" questions={items} />);
    const secondUrl = `/api/orgs/DEMO-WORKSPACE/cases/${second.agent_id}/${second.case_id}/questions/${second.id}`;
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(secondUrl, expect.anything()));

    await act(async () => resolvers[secondUrl]!(new Response(JSON.stringify(genericCtx))));
    await act(async () => resolvers[firstUrl]!(new Response(JSON.stringify(legacyCtx))));

    expect(await screen.findByRole("heading", { level: 2, name: "Can we accept the additional 45 EUR on the invoice?" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: /Which of the two bookings/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit answer/ })).toBeDisabled();
    expect(screen.getByText(/not saved with an exact link/)).toBeInTheDocument();
  });

  it("filters to open questions by default and updates the URL on selection", async () => {
    const { InboxView } = await import("@/components/inbox/inbox-view");
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<InboxView org="DEMO-WORKSPACE" questions={items} />);
    const options = within(screen.getByRole("listbox", { name: "Questions" })).getAllByRole("option");
    expect(options).toHaveLength(items.filter((q) => q.status === "open").length);
    await userEvent.click(within(options[0]!).getByRole("button"));
    expect(nav.replace).toHaveBeenCalledWith(expect.stringContaining("question="), { scroll: false });
  });
});
