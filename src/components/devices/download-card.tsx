import { Apple, Download, Link2, MonitorDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lang } from "@/lib/i18n";
import { devMsg } from "./messages";
import { CopyButton } from "./copy-button";

export interface TrackerDownload {
  windowsUrl: string;
  macUrl: string;
  enrollmentCode: string;
  version: string;
}

export function DownloadCard({ lang, download, compact = false }: { lang: Lang; download: TrackerDownload; compact?: boolean }) {
  const m = devMsg[lang].download;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorDown className="size-5 text-brand-ink" aria-hidden />
          {m.title}
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5">
          <Link2 className="size-3.5 text-brand" aria-hidden />
          {m.linked}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Mock links: the real API returns signed, org-bound installer URLs. */}
          <Button asChild>
            <a href={download.windowsUrl} download>
              <Download aria-hidden />
              {m.windows}
            </a>
          </Button>
          <Button asChild variant="line">
            <a href={download.macUrl} download>
              <Apple aria-hidden />
              {m.mac}
            </a>
          </Button>
          <span className="font-mono text-xs text-muted">{m.version(download.version)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-paper px-3 py-2">
          <span className="label-mono">{m.code}</span>
          <code className="font-mono text-sm font-semibold tracking-wider text-ink">{download.enrollmentCode}</code>
          <span className="ml-auto">
            <CopyButton value={download.enrollmentCode} />
          </span>
        </div>
        {!compact ? <p className="text-sm text-muted">{m.invite}</p> : null}
      </CardContent>
    </Card>
  );
}
