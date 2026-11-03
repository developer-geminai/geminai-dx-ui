import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ExternalLink, Laptop, PauseCircle, Radio } from "lucide-react";
import { api } from "@/lib/api";
import { requireOrg } from "@/lib/server/session";
import { sectionGate } from "@/components/locked-section";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Kpi } from "@/components/kpi";
import { TabLinks } from "@/components/diagnostic/tab-links";
import { DownloadCard } from "@/components/devices/download-card";
import { DevicesTable } from "@/components/devices/devices-table";
import { BlocklistEditor } from "@/components/devices/blocklist-editor";
import { TransparencyContent } from "@/components/devices/transparency-content";
import { CopyButton } from "@/components/devices/copy-button";
import { devMsg } from "@/components/devices/messages";
import { can } from "@/lib/permissions";
import { orgPath, withParams } from "@/lib/utils";

export const metadata: Metadata = { title: "Equipos y privacidad" };

type Tab = "equipos" | "blocklist" | "transparencia";
const DAY = 86_400_000;

export default async function DevicesPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ tab?: string }> }) {
  const ctx = await requireOrg(decodeURIComponent((await params).org));
  const gate = sectionGate(ctx, "devices");
  if (gate) return gate;
  const m = devMsg[ctx.lang];
  const orgId = ctx.org.id;

  const tabs = (
    [
      { key: "equipos", flag: ctx.flags["devices.list"], label: m.tabs.devices },
      { key: "blocklist", flag: ctx.flags["devices.blocklist"], label: m.tabs.blocklist },
      { key: "transparencia", flag: ctx.flags["devices.transparency"], label: m.tabs.transparency },
    ] as const
  ).filter((t) => t.flag);
  const requested = (await searchParams).tab;
  const current: Tab = tabs.find((t) => t.key === requested)?.key ?? tabs[0]?.key ?? "equipos";
  const base = orgPath(orgId, "devices");
  const editable = can(ctx.role, ctx.staff, "privacy.edit");

  let body: React.ReactNode;
  if (current === "equipos") {
    const [devices, download] = await Promise.all([api().listDevices(orgId), api().getTrackerDownload(orgId)]);
    const now = Date.now();
    const silent = devices.filter((d) => d.lastEventAt && now - new Date(d.lastEventAt).getTime() > 2 * DAY).length;
    body = (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi label={m.summary.total} value={devices.length} icon={<Laptop aria-hidden />} />
          <Kpi label={m.summary.online} value={devices.filter((d) => d.status === "online").length} icon={<Radio aria-hidden />} />
          <Kpi label={m.summary.attention} value={silent} tone={silent ? "attention" : "default"} icon={<AlertTriangle aria-hidden />} />
          <Kpi label={m.summary.paused} value={devices.filter((d) => !d.captureEnabled).length} icon={<PauseCircle aria-hidden />} />
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="order-2 xl:order-1">
            <CardHeader>
              <CardTitle>{m.table.title}</CardTitle>
              <CardDescription>{m.table.hint}</CardDescription>
            </CardHeader>
            <CardContent className="px-2">
              <DevicesTable orgId={orgId} devices={devices} editable={editable} latestVersion={download.version} />
            </CardContent>
          </Card>
          <div className="order-1 xl:order-2">
            <DownloadCard lang={ctx.lang} download={download} />
          </div>
        </div>
      </div>
    );
  } else if (current === "blocklist") {
    body = <BlocklistEditor orgId={orgId} rules={await api().listBlockRules(orgId)} editable={editable} />;
  } else {
    const info = await api().getTransparency(orgId);
    const link = `/transparency/${encodeURIComponent(orgId)}`;
    body = (
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{m.transparency.title}</CardTitle>
            <CardDescription>{m.transparency.hint}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <span className="label-mono">{m.transparency.link}</span>
            <code className="rounded-sm bg-paper-alt px-2 py-1 font-mono text-sm">{link}</code>
            <CopyButton value={link} absolute />
            <Button asChild variant="soft" size="sm">
              <Link href={link} target="_blank" rel="noopener">
                <ExternalLink aria-hidden />
                {m.transparency.open}
              </Link>
            </Button>
          </CardContent>
        </Card>
        <section aria-label={m.transparency.preview} className="rounded-lg border border-dashed border-line bg-paper p-5 md:p-8">
          <p className="label-mono mb-4">{m.transparency.preview}</p>
          <TransparencyContent lang={ctx.lang} info={info} />
        </section>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow={m.eyebrow} title={m.title} description={m.description} />
      {tabs.length > 1 ? <TabLinks label={m.title} current={current} tabs={tabs.map((t) => ({ key: t.key, label: t.label, href: withParams(base, { tab: t.key }) }))} /> : null}
      {body}
    </div>
  );
}
