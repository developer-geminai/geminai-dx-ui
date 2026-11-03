"use client";
import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useLang } from "@/lib/i18n/client";
import { defineMessages } from "@/lib/i18n";

const msg = defineMessages({
  es: {
    download: "Descargar PDF",
    title: "PDF de demostración",
    body: "En la demo no hay ficheros reales. Con el backend conectado, este botón descargará el PDF desde:",
    close: "Cerrar",
  },
  en: {
    download: "Download PDF",
    title: "Demo PDF",
    body: "There are no real files in the demo. With the backend connected, this button downloads the PDF from:",
    close: "Close",
  },
});

/** Mock PDF download: opens a preview dialog instead of a broken link. */
export function PdfButton({ title, subtitle, url, lines = [] }: { title: string; subtitle?: string; url: string; lines?: [string, string][] }) {
  const m = msg[useLang()];
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="line" size="sm" onClick={() => setOpen(true)}>
        <Download aria-hidden />
        {m.download}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={m.title} description={m.body} footer={<Button variant="line" onClick={() => setOpen(false)}>{m.close}</Button>}>
        <p className="mb-4 break-all rounded-sm bg-paper-alt px-2 py-1 font-mono text-xs text-muted">{url}</p>
        <div className="mx-auto aspect-[1/1.3] max-w-xs rounded-md border border-line bg-surface p-5 shadow-card">
          <div className="flex items-center gap-2 text-brand-ink">
            <FileText className="size-4" aria-hidden />
            <span className="font-mono text-[0.6rem] uppercase tracking-eyebrow">GeminAI Dx</span>
          </div>
          <p className="mt-4 font-display text-lg leading-tight">{title}</p>
          {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
          <dl className="mt-4 space-y-1.5 text-[0.7rem]">
            {lines.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-line pb-1">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 space-y-1.5" aria-hidden>
            {[90, 75, 85, 60, 80].map((w, i) => (
              <div key={i} className="h-1.5 rounded-full bg-paper-alt" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </Dialog>
    </>
  );
}
