"use client";
import { useOptimistic, useTransition } from "react";
import { Apple, Monitor } from "lucide-react";
import type { Device } from "@/lib/api/types";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { DeviceStatusBadge } from "@/components/status-badges";
import { useLang } from "@/lib/i18n/client";
import { fmt } from "@/lib/format";
import { setDeviceCaptureAction } from "@/app/o/[org]/devices/actions";
import { devMsg } from "./messages";

function CaptureSwitch({ orgId, device, editable }: { orgId: string; device: Device; editable: boolean }) {
  const m = devMsg[useLang()].table;
  const [optimistic, setOptimistic] = useOptimistic(device.captureEnabled);
  const [pending, start] = useTransition();
  return (
    <Switch
      checked={optimistic}
      disabled={!editable || pending || device.status === "pending"}
      label={m.captureLabel(device.alias)}
      onCheckedChange={(v) =>
        start(async () => {
          setOptimistic(v);
          await setDeviceCaptureAction(orgId, device.id, v);
        })
      }
    />
  );
}

export function DevicesTable({ orgId, devices, editable, latestVersion }: { orgId: string; devices: Device[]; editable: boolean; latestVersion?: string }) {
  const lang = useLang();
  const m = devMsg[lang].table;
  const f = fmt(lang);
  if (!devices.length) return <EmptyState title={m.empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>{m.alias}</th>
            <th>{m.department}</th>
            <th>{m.status}</th>
            <th>{m.version}</th>
            <th>{m.lastActivity}</th>
            <th className="text-right">{m.eventsToday}</th>
            <th>{m.capture}</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((d) => (
            <tr key={d.id}>
              <td>
                <span className="inline-flex items-center gap-2 font-mono text-sm font-medium">
                  {d.os === "macos" ? <Apple className="size-3.5 text-muted" aria-label="macOS" /> : <Monitor className="size-3.5 text-muted" aria-label="Windows" />}
                  {d.alias}
                </span>
              </td>
              <td className="text-ink-2">{d.department}</td>
              <td>
                <DeviceStatusBadge status={d.status} />
              </td>
              <td className="whitespace-nowrap font-mono text-xs text-muted">
                {d.installedAt ? d.trackerVersion : "—"}
                {d.installedAt && latestVersion && d.trackerVersion !== latestVersion ? (
                  <Badge tone="neutral" className="ml-2">
                    {m.outdated}
                  </Badge>
                ) : null}
              </td>
              <td className="whitespace-nowrap text-muted">{f.relative(d.lastEventAt)}</td>
              <td className="tabular text-right">{d.installedAt ? f.number(d.eventsToday) : "—"}</td>
              <td>
                <CaptureSwitch orgId={orgId} device={d} editable={editable} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
