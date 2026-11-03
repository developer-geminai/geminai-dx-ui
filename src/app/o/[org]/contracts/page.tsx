import Link from "next/link";
import { AlertTriangle, Building2, FilePlus2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { sectionGate } from "@/components/locked-section";
import { ContractRow } from "@/components/contracts/contract-row";
import { contractsMsg } from "@/components/contracts/messages";
import { api } from "@/lib/api";
import { requireOrg } from "@/lib/server/session";
import { can } from "@/lib/permissions";
import { orgPath } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContractsPage({ params }: { params: Promise<{ org: string }> }) {
  const ctx = await requireOrg(decodeURIComponent((await params).org));
  const gate = sectionGate(ctx, "contracts");
  if (gate) return gate;
  const m = contractsMsg[ctx.lang];
  const [contracts, entities] = await Promise.all([api().listContracts(ctx.org.id), api().listEntities(ctx.org.id)]);
  const companies = entities.filter((e) => e.kind === "company");
  const pending = contracts.filter((c) => c.status === "pending_signature").length;
  const canSign = can(ctx.role, ctx.staff, "contracts.sign");

  return (
    <div>
      <PageHeader eyebrow={m.eyebrow} title={m.title} description={m.description} />
      {pending ? (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-signal-line bg-signal-soft px-4 py-3 text-sm font-medium text-signal-ink">
          <AlertTriangle className="size-4" aria-hidden />
          {m.pendingBanner(pending)}
        </div>
      ) : null}

      <div className="flex flex-col gap-6">
        {companies.map((co) => {
          const docs = contracts.filter((c) => c.entityId === co.id);
          return (
            <Card key={co.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-muted" aria-hidden />
                  <CardTitle>{co.legalName ?? co.name}</CardTitle>
                </div>
                <CardDescription>
                  {m.nif} <span className="font-mono">{co.nif ?? "—"}</span> · {co.address ?? "—"}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {docs.length ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{m.colDoc}</th>
                        <th>{m.colType}</th>
                        <th>{m.colTemplate}</th>
                        <th>{m.colStatus}</th>
                        <th>{m.colDate}</th>
                        <th>{m.colSigner}</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map((c) => (
                        <ContractRow key={c.id} orgId={ctx.org.id} contract={c} canSign={canSign} />
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState title={m.empty} />
                )}
              </CardContent>
            </Card>
          );
        })}

        <Card className="border-dashed">
          <CardContent className="flex flex-wrap items-center gap-4 pt-5">
            <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
              <FilePlus2 className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-medium">{m.newTitle}</p>
              <p className="text-sm text-muted">{m.newBody}</p>
            </div>
            {ctx.flags.expand ? (
              <div className="flex gap-2">
                <Button asChild variant="line" size="sm">
                  <Link href={`${orgPath(ctx.org.id, "expand")}?kind=automate_opportunity`}>{m.newService}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={`${orgPath(ctx.org.id, "expand")}?kind=new_department`}>{m.newExpansion}</Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
