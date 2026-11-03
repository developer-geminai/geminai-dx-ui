import type { Metadata } from "next";
import { api } from "@/lib/api";
import { requireOrg } from "@/lib/server/session";
import { LockedSection } from "@/components/locked-section";
import { PageHeader } from "@/components/page-header";
import { PhaseBadge } from "@/components/status-badges";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { obMsg } from "@/components/onboarding/messages";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Onboarding" };

export default async function OnboardingPage({ params }: { params: Promise<{ org: string }> }) {
  const ctx = await requireOrg(decodeURIComponent((await params).org));
  if (!ctx.flags["onboarding.wizard"]) return <LockedSection ctx={ctx} section="home" reason="hidden" />;
  const m = obMsg[ctx.lang];
  const orgId = ctx.org.id;
  const [state, entities, contracts, rules, devices, download] = await Promise.all([
    api().getOnboarding(orgId),
    api().listEntities(orgId),
    api().listContracts(orgId),
    api().listBlockRules(orgId),
    api().listDevices(orgId),
    api().getTrackerDownload(orgId),
  ]);

  return (
    <div>
      <PageHeader eyebrow={m.eyebrow} title={m.title} description={m.description} actions={<PhaseBadge phase={ctx.org.phase} />} />
      <OnboardingWizard
        orgId={orgId}
        phase={ctx.org.phase}
        retention={ctx.org.retention}
        state={state}
        entities={entities}
        contracts={contracts.filter((c) => c.type === "pilot" || c.type === "dpa")}
        rules={rules}
        devices={devices}
        download={download}
        user={{ name: ctx.viewer.user.name, email: ctx.viewer.user.email }}
        canEdit={can(ctx.role, ctx.staff, "settings.edit")}
        canSign={can(ctx.role, ctx.staff, "contracts.sign")}
        canPrivacy={can(ctx.role, ctx.staff, "privacy.edit")}
      />
    </div>
  );
}
