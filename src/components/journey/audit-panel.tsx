"use client";
import { useRef, useState } from "react";
import { Download, FileSearch, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { JsonBlock } from "./json-block";
import { formatDateTime } from "@/lib/format";

interface AuditSummary {
  exported_at?: string;
  complete_within_recorded_tables?: boolean;
  coverage?: Record<string, { included_rows?: number; truncated?: boolean; available?: boolean }>;
  limitations?: string[];
  integrity?: { export_sha256?: string };
}

/**
 * Loads the backend's sealed case-audit export on demand. The downloaded file is the backend's
 * original JSON bytes (so its SHA-256 digest still verifies); it is pinned until "Reload".
 */
export function AuditPanel({ org, agentId, caseId }: { org: string; agentId: string; caseId: string }) {
  const [state, setState] = useState<{ status: "idle" | "loading" | "ready" | "error"; raw?: string; parsed?: AuditSummary; error?: string }>({ status: "idle" });
  const seq = useRef(0);

  async function load() {
    const id = ++seq.current;
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/orgs/${encodeURIComponent(org)}/cases/${encodeURIComponent(agentId)}/${encodeURIComponent(caseId)}/audit`, { cache: "no-store" });
      const raw = await res.text();
      if (id !== seq.current) return;
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          msg = (JSON.parse(raw) as { error?: string }).error ?? msg;
        } catch {
          /* ignore */
        }
        setState({ status: "error", error: msg });
        return;
      }
      setState({ status: "ready", raw, parsed: JSON.parse(raw) as AuditSummary });
    } catch {
      if (id === seq.current) setState({ status: "error", error: "The audit could not be loaded." });
    }
  }

  function download() {
    if (!state.raw) return;
    const url = URL.createObjectURL(new Blob([state.raw], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `case-audit-${agentId}-${caseId}.json`.replace(/[^A-Za-z0-9._-]/g, "_");
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button variant="line" size="sm" onClick={load} disabled={state.status === "loading"}>
          {state.status === "ready" ? <RefreshCw aria-hidden /> : <FileSearch aria-hidden />}
          {state.status === "loading" ? "Loading audit…" : state.status === "ready" ? "Reload audit" : "Load case audit"}
        </Button>
        {state.status === "ready" ? (
          <Button variant="soft" size="sm" onClick={download}>
            <Download aria-hidden /> Download audit JSON
          </Button>
        ) : null}
      </div>
      {state.status === "error" ? <ErrorState className="mt-3" title="Audit unavailable" detail={state.error} /> : null}
      {state.status === "ready" && state.parsed ? (
        <div className="mt-3 flex flex-col gap-3 text-sm" aria-live="polite">
          <p className="text-muted">
            Exported {formatDateTime(state.parsed.exported_at)} ·{" "}
            {state.parsed.complete_within_recorded_tables ? "complete within recorded tables" : "some tables were truncated"}
            {state.parsed.integrity?.export_sha256 ? (
              <>
                {" "}
                · SHA-256 <span className="break-all font-mono text-xs">{state.parsed.integrity.export_sha256}</span>
              </>
            ) : null}
          </p>
          {state.parsed.limitations?.length ? (
            <ul className="list-disc pl-5 text-xs text-muted">
              {state.parsed.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          ) : null}
          <details>
            <summary className="cursor-pointer text-xs font-medium text-brand">Raw audit JSON</summary>
            <JsonBlock value={state.parsed} className="mt-2" />
          </details>
        </div>
      ) : null}
    </div>
  );
}
