import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { InboxView } from "@/components/inbox/inbox-view";
import { ErrorState } from "@/components/ui/states";
import { attempt, orgAgents, orgContext, resolveAgentFilter } from "@/lib/server/org-data";
import { first } from "@/lib/utils";

export const metadata: Metadata = { title: "Human Inbox" };

export default async function InboxPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const org = decodeURIComponent((await params).org);
  const sp = await searchParams;
  const { organization, client } = await orgContext(org);
  const agents = await attempt(() => orgAgents(org));
  const agent = resolveAgentFilter(first(sp.agent), agents.ok ? agents.data.items : []);
  const questions = await attempt(() => client.questions(agent));
  const open = questions.ok ? questions.data.items.filter((q) => q.status === "open").length : 0;

  return (
    <>
      <PageHeader
        eyebrow={organization.label}
        title="Human Inbox"
        description={
          questions.ok
            ? `${open} open question${open === 1 ? "" : "s"} across ${agent === "all" ? "all agents" : "this agent"}. Each one shows the original input and exactly what the agent needs.`
            : "Unresolved questions from every agent."
        }
      />
      {questions.ok ? (
        <Suspense>
          <InboxView org={organization.id} questions={questions.data.items} />
        </Suspense>
      ) : (
        <ErrorState title={questions.error.title} detail={questions.error.detail} />
      )}
    </>
  );
}
