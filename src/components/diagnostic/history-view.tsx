import type { Diagnostic } from "@/lib/api/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/switch";
import { DiagnosticStatusBadge } from "@/components/status-badges";
import type { Lang } from "@/lib/i18n";
import { common } from "@/lib/i18n/common";
import { fmt } from "@/lib/format";
import { diagMsg } from "./messages";

export function HistoryView({ lang, diagnostics }: { lang: Lang; diagnostics: Diagnostic[] }) {
  const m = diagMsg[lang].history;
  const c = common[lang];
  const f = fmt(lang);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.title}</CardTitle>
        <CardDescription>{m.hint}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto px-2">
        <table className="data-table">
          <thead>
            <tr>
              <th>{m.type}</th>
              <th>{m.scope}</th>
              <th>{m.dates}</th>
              <th>{m.status}</th>
              <th className="min-w-[140px]">{m.progress}</th>
            </tr>
          </thead>
          <tbody>
            {diagnostics.map((d) => (
              <tr key={d.id}>
                <td className="font-medium">{c.diagnosticType[d.type]}</td>
                <td className="text-ink-2">{d.scope}</td>
                <td className="tabular whitespace-nowrap text-muted">
                  {f.date(d.startedAt)} – {f.date(d.endsAt)}
                </td>
                <td>
                  <DiagnosticStatusBadge status={d.status} />
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Progress value={d.day} max={d.totalDays} className="w-24" label={`${d.day}/${d.totalDays}`} />
                    <span className="tabular text-xs text-muted">
                      {d.day}/{d.totalDays}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
