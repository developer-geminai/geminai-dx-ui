import { AlertTriangle, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Kpi } from "@/components/kpi";
import { EmptyState } from "@/components/ui/states";
import { sectionGate } from "@/components/locked-section";
import { api } from "@/lib/api";
import { requireOrg } from "@/lib/server/session";
import { defineMessages } from "@/lib/i18n";
import { fmt } from "@/lib/format";

export const dynamic = "force-dynamic";

const msg = defineMessages({
  es: {
    band: "Vista interna · no visible para el cliente",
    title: "Costes y salud de agentes",
    period: (a: string, b: string) => `Últimos 30 días · ${a} – ${b}`,
    runs: "Ejecuciones",
    tokens: "Tokens entrada / salida",
    llm: "Coste LLM",
    revenue: "Ingreso del mes",
    margin: "Margen",
    revenueHint: "Estimación de facturación del plan",
    byAgent: "Coste por agente",
    byAgentHint: "Modelo, tokens, llamadas y reintentos. Nada de esto se muestra al cliente.",
    colAgent: "Agente",
    colModel: "Modelo",
    colRuns: "Ejec.",
    colIn: "Tokens in",
    colOut: "Tokens out",
    colCalls: "Llamadas",
    colRetries: "Reintentos",
    colCost: "Coste",
    colPerRun: "€/ejec.",
    health: "Salud de agentes",
    colError: "Tasa de error",
    colP95: "p95 duración",
    colLast: "Último error",
    none: "—",
    empty: "Sin ejecuciones en el periodo.",
    mock: "Cifras simuladas por la API mock.",
  },
  en: {
    band: "Internal view · not visible to the client",
    title: "Agent costs and health",
    period: (a: string, b: string) => `Last 30 days · ${a} – ${b}`,
    runs: "Runs",
    tokens: "Tokens in / out",
    llm: "LLM cost",
    revenue: "Month revenue",
    margin: "Margin",
    revenueHint: "Plan billing estimate",
    byAgent: "Cost per agent",
    byAgentHint: "Model, tokens, calls and retries. None of this is shown to the client.",
    colAgent: "Agent",
    colModel: "Model",
    colRuns: "Runs",
    colIn: "Tokens in",
    colOut: "Tokens out",
    colCalls: "Calls",
    colRetries: "Retries",
    colCost: "Cost",
    colPerRun: "€/run",
    health: "Agent health",
    colError: "Error rate",
    colP95: "p95 duration",
    colLast: "Last error",
    none: "—",
    empty: "No runs in the period.",
    mock: "Figures simulated by the mock API.",
  },
});

export default async function InternalPage({ params }: { params: Promise<{ org: string }> }) {
  const ctx = await requireOrg(decodeURIComponent((await params).org));
  const gate = sectionGate(ctx, "internal");
  if (gate) return gate;
  const m = msg[ctx.lang];
  const f = fmt(ctx.lang);
  const data = await api().getInternalCosts(ctx.org.id);
  const t = data.totals;
  const compact = (n: number) => (n >= 1e6 ? `${f.decimal(n / 1e6)} M` : n >= 1e3 ? `${f.decimal(n / 1e3)} k` : f.number(n));

  return (
    <div>
      <div className="-mx-4 -mt-6 mb-6 bg-band px-4 py-6 text-band-fg md:-mx-8 md:-mt-8 md:px-8">
        <p className="inline-flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-eyebrow text-band-signal">
          <EyeOff className="size-3.5" aria-hidden />
          {m.band}
        </p>
        <h1 className="mt-2 font-display text-[2rem] font-medium leading-tight">
          {m.title} · {ctx.org.name}
        </h1>
        <p className="mt-1 text-sm text-band-muted">
          {m.period(f.date(data.period.from), f.date(data.period.to))} · {m.mock}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label={m.runs} value={f.number(t.runs)} />
        <Kpi label={m.tokens} value={`${compact(t.tokensIn)} / ${compact(t.tokensOut)}`} />
        <Kpi label={m.llm} value={f.eur2(t.llmCost)} />
        <Kpi label={m.revenue} value={f.eur(t.revenue)} hint={m.revenueHint} />
        <Kpi label={m.margin} value={t.revenue ? f.percent(t.margin) : m.none} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{m.byAgent}</CardTitle>
          <CardDescription>{m.byAgentHint}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {data.byAgent.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{m.colAgent}</th>
                  <th>{m.colModel}</th>
                  <th className="text-right">{m.colRuns}</th>
                  <th className="text-right">{m.colIn}</th>
                  <th className="text-right">{m.colOut}</th>
                  <th className="text-right">{m.colCalls}</th>
                  <th className="text-right">{m.colRetries}</th>
                  <th className="text-right">{m.colCost}</th>
                  <th className="text-right">{m.colPerRun}</th>
                </tr>
              </thead>
              <tbody>
                {data.byAgent.map((a) => (
                  <tr key={a.agentId}>
                    <td className="font-medium">{a.agentName}</td>
                    <td className="font-mono text-xs text-muted">{a.model}</td>
                    <td className="tabular text-right">{f.number(a.runs)}</td>
                    <td className="tabular text-right">{compact(a.tokensIn)}</td>
                    <td className="tabular text-right">{compact(a.tokensOut)}</td>
                    <td className="tabular text-right">{f.number(a.calls)}</td>
                    <td className="tabular text-right">{f.number(a.retries)}</td>
                    <td className="tabular text-right">{f.eur2(a.cost)}</td>
                    <td className="tabular text-right text-muted">{a.costPerRun.toFixed(3)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title={m.empty} />
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{m.health}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {data.health.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{m.colAgent}</th>
                  <th className="text-right">{m.colError}</th>
                  <th className="text-right">{m.colP95}</th>
                  <th>{m.colLast}</th>
                </tr>
              </thead>
              <tbody>
                {data.health.map((h) => (
                  <tr key={h.agentId}>
                    <td className="font-medium">{h.agentName}</td>
                    <td className="tabular text-right">
                      {h.errorRate > 0.05 ? (
                        <Badge tone="attention">
                          <AlertTriangle aria-hidden />
                          {f.percent(h.errorRate)}
                        </Badge>
                      ) : (
                        f.percent(h.errorRate)
                      )}
                    </td>
                    <td className="tabular text-right">{f.duration(h.p95DurationSec)}</td>
                    <td className="font-mono text-xs text-muted">{h.lastError ?? m.none}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title={m.empty} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
