import { api } from "@/lib/api";
import type { ServiceRequestKind } from "@/lib/api/types";
import { requireOrg } from "@/lib/server/session";
import { LockedSection } from "@/components/locked-section";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExpandForm } from "@/components/expand/expand-form";
import { expandMessages } from "@/components/expand/messages";
import { can } from "@/lib/permissions";
import { fmt } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ExpandPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ kind?: string; opportunity?: string }> }) {
  const ctx = await requireOrg(decodeURIComponent((await params).org));
  if (!ctx.flags.expand) return <LockedSection ctx={ctx} section="home" reason="hidden" />;
  const sp = await searchParams;
  const m = expandMessages[ctx.lang];
  const f = fmt(ctx.lang);
  const [opportunities, requests] = await Promise.all([api().listOpportunities(ctx.org.id), api().listServiceRequests(ctx.org.id)]);
  const open = opportunities.filter((o) => o.status === "detected" || o.status === "requested");
  const kind = (["new_department", "automate_opportunity", "semester_review"] as const).find((k) => k === sp.kind) as ServiceRequestKind | undefined;

  return (
    <>
      <PageHeader eyebrow={m.eyebrow} title={m.title} description={m.lead} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardContent className="pt-5">
            <ExpandForm orgId={ctx.org.id} opportunities={open} canRequest={can(ctx.role, ctx.staff, "expand.request")} initialKind={kind} initialOpportunity={sp.opportunity} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle as="h2">{m.history}</CardTitle>
          </CardHeader>
          <CardContent>
            {requests.length ? (
              <ul className="flex flex-col divide-y divide-line">
                {requests.map((r) => (
                  <li key={r.id} className="py-3 first:pt-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink">{m.options[r.kind]!.title}</p>
                      <Badge tone={r.status === "accepted" ? "done" : "neutral"}>{m.status[r.status]}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{r.note}</p>
                    <p className="mt-1 text-xs text-faint">
                      {r.createdBy} · {f.dateLong(r.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{m.none}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
