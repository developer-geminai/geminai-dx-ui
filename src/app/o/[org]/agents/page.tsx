import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { AgentsExplorer } from "@/components/agents/agents-explorer";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { attempt, orgAgents, orgContext } from "@/lib/server/org-data";

export const metadata: Metadata = { title: "Agents" };

export default async function AgentsPage({ params }: { params: Promise<{ org: string }> }) {
  const org = decodeURIComponent((await params).org);
  const { organization } = await orgContext(org);
  const agents = await attempt(() => orgAgents(org));
  return (
    <>
      <PageHeader
        eyebrow={organization.label}
        title="Agents"
        description="Every agent registered for this organization — what it is for, where its data comes from, and how much of its work needs a person."
      />
      {!agents.ok ? (
        <ErrorState title={agents.error.title} detail={agents.error.detail} />
      ) : agents.data.items.length ? (
        <AgentsExplorer org={organization.id} agents={agents.data.items} />
      ) : (
        <EmptyState title="No agents registered">Agents appear here as soon as an approved source registers them for this organization. No frontend change is needed.</EmptyState>
      )}
    </>
  );
}
