import { AppShell } from "@/components/layout/app-shell";
import { attempt, orgAgents, orgContext, orgOverview } from "@/lib/server/org-data";
import { logoutAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function OrganizationLayout({ children, params }: { children: React.ReactNode; params: Promise<{ org: string }> }) {
  const { org: rawOrg } = await params;
  const org = decodeURIComponent(rawOrg);
  const { session, organization } = await orgContext(org);
  const [agents, overview] = await Promise.all([attempt(() => orgAgents(org)), attempt(() => orgOverview(org))]);

  return (
    <AppShell
      org={organization.id}
      organizations={session.organizations.map((o) => ({ id: o.id, label: o.label }))}
      agents={agents.ok ? agents.data.items.map((a) => ({ id: a.id, name: a.name })) : []}
      openQuestions={overview.ok ? overview.data.counts.questions_open : 0}
      operatorName={session.operator.displayName}
      demo={overview.ok ? overview.data.demo : false}
      contentVisible={overview.ok ? overview.data.content_visible : true}
      logoutAction={logoutAction}
    >
      {children}
    </AppShell>
  );
}
