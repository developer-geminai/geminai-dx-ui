import { AlertTriangle, Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/states";
import { LockedSection, sectionGate } from "@/components/locked-section";
import { PdfButton } from "@/components/contracts/pdf-preview";
import { PaymentMethodCard } from "@/components/billing/payment-method";
import { billingMsg } from "@/components/billing/messages";
import { api } from "@/lib/api";
import { requireOrg } from "@/lib/server/session";
import { can } from "@/lib/permissions";
import { fmt } from "@/lib/format";
import { common } from "@/lib/i18n/common";

export const dynamic = "force-dynamic";

export default async function BillingPage({ params }: { params: Promise<{ org: string }> }) {
  const ctx = await requireOrg(decodeURIComponent((await params).org));
  const gate = sectionGate(ctx, "billing");
  if (gate) return gate;
  if (!can(ctx.role, ctx.staff, "billing.view")) return <LockedSection ctx={ctx} section="billing" reason="forbidden" />;
  const m = billingMsg[ctx.lang];
  const f = fmt(ctx.lang);
  const billing = await api().getBilling(ctx.org.id);
  if (!billing) return <LockedSection ctx={ctx} section="billing" reason="locked" />;
  const estimate = !ctx.org.paying;

  return (
    <div>
      <PageHeader eyebrow={m.eyebrow} title={m.title} description={m.description} />
      {estimate ? (
        <div className="mb-6 flex items-start gap-2 rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink-2">
          <Info className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden />
          {m.estimateNotice}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>
              {m.plan} · {billing.planName}
            </CardTitle>
            <CardDescription>{m.period(f.date(billing.period.from), f.date(billing.period.to))}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line">
              {billing.components.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{c.label}</p>
                    <p className="text-xs text-muted">
                      <Badge tone="outline" className="mr-2">
                        {m.kind[c.kind]}
                      </Badge>
                      {c.includedVolume ? m.included(f.number(c.includedVolume)) : null}
                    </p>
                  </div>
                  <div className="tabular text-right">
                    <p className="text-ink">
                      {c.amount < 1 ? f.eur2(c.amount) : f.eur(c.amount)} <span className="text-muted">{m.perUnit(c.unit)}</span> {c.quantity !== undefined ? <span className="text-muted">{m.times(c.quantity)}</span> : null}
                    </p>
                    <p className="text-sm font-semibold">{c.quantity !== undefined ? f.eur(c.amount * c.quantity) : c.kind === "overage" ? <span className="font-normal text-muted">{m.variable}</span> : f.eur(c.amount)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-end justify-between gap-4 rounded-md bg-paper px-4 py-3">
              <div>
                <p className="label-mono">{m.total}</p>
                <p className="text-xs text-muted">{m.totalHint}</p>
              </div>
              <p className="tabular font-display text-3xl font-medium">{f.eur2(billing.estimatedTotal)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{m.payment}</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentMethodCard method={billing.paymentMethod} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{m.usage}</CardTitle>
          <CardDescription>{m.usageHint}</CardDescription>
        </CardHeader>
        <CardContent>
          {billing.usage.length ? (
            <ul className="flex flex-col gap-4">
              {billing.usage.map((u) => {
                const over = u.forecast > u.included;
                const near = u.used / Math.max(1, u.included) >= 0.8;
                const attention = over || near;
                return (
                  <li key={u.agentId}>
                    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium text-ink">{u.agentName}</span>
                      <span className="tabular text-muted">
                        <span className="text-ink">{f.number(u.used)}</span> / {f.number(u.included)} · {m.forecast(f.number(u.forecast))}
                        {attention ? (
                          <Badge tone="attention" className="ml-2">
                            <AlertTriangle aria-hidden />
                            {over ? m.over : m.near}
                          </Badge>
                        ) : null}
                      </span>
                    </div>
                    <div className="relative">
                      <Progress value={u.used} max={Math.max(u.included, u.forecast)} tone={attention ? "signal" : "brand"} label={u.agentName} />
                      <span aria-hidden className="absolute top-[-3px] h-3 w-px bg-ink/40" style={{ left: `${(u.included / Math.max(u.included, u.forecast)) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title={common[ctx.lang].empty} />
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{m.invoices}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {billing.invoices.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{m.colNumber}</th>
                  <th>{m.colPeriod}</th>
                  <th>{m.colIssued}</th>
                  <th className="text-right">{m.colAmount}</th>
                  <th>{m.colStatus}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {billing.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-mono text-xs">{inv.number}</td>
                    <td className="capitalize">{inv.period}</td>
                    <td className="tabular text-muted">{f.date(inv.issuedAt)}</td>
                    <td className="tabular text-right font-medium">{f.eur2(inv.amount)}</td>
                    <td>
                      <Badge tone={inv.status === "paid" ? "done" : "attention"}>{m.status[inv.status]}</Badge>
                    </td>
                    <td className="text-right">
                      <PdfButton title={`${m.colNumber} ${inv.number}`} subtitle={ctx.org.name} url={inv.pdfUrl} lines={[[m.colPeriod, inv.period], [m.colAmount, f.eur2(inv.amount)], [m.colStatus, m.status[inv.status]]]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title={m.noInvoices} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
