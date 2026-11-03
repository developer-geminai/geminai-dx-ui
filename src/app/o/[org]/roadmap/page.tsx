import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/server/session";
import { PageHeader } from "@/components/page-header";
import { RoadmapBoard } from "@/components/roadmap/roadmap-board";
import { defineMessages } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const msg = defineMessages({
  es: {
    eyebrow: "Configuración del cliente",
    title: "Roadmap",
    lead: "Todo lo que ofrece el portal, ordenado por fase y lanzamiento. Por ahora todo está activado; desactiva lo que no aplique a este cliente y desaparecerá de su portal.",
  },
  en: {
    eyebrow: "Client configuration",
    title: "Roadmap",
    lead: "Everything the portal offers, by phase and release. Everything is enabled for now; switch off what doesn't apply to this client and it disappears from their portal.",
  },
});

export default async function RoadmapPage({ params }: { params: Promise<{ org: string }> }) {
  const ctx = await requireOrg(decodeURIComponent((await params).org));
  if (!ctx.staff && ctx.role !== "admin") notFound();
  const m = msg[ctx.lang];
  return (
    <>
      <PageHeader eyebrow={`${m.eyebrow} · ${ctx.org.name}`} title={m.title} description={m.lead} />
      <RoadmapBoard orgId={ctx.org.id} phase={ctx.org.phase} flags={ctx.flags} />
    </>
  );
}
