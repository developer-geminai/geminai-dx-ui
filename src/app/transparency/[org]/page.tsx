import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { getLang } from "@/lib/i18n/server";
import { Logo } from "@/components/brand/logo";
import { TransparencyContent } from "@/components/devices/transparency-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Transparencia" };

/**
 * PUBLIC page for monitored employees (no account, no session). Opened from the tracker app.
 * Shows only organization-level information, never anything about a person.
 */
export default async function TransparencyPage({ params }: { params: Promise<{ org: string }> }) {
  const orgId = decodeURIComponent((await params).org);
  const lang = await getLang();
  const info = await api()
    .getTransparency(orgId)
    .catch(() => null);
  if (!info) notFound();
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 md:px-6">
          <Logo product={lang === "es" ? "Transparencia" : "Transparency"} />
          <span className="text-sm text-muted">{info.orgName}</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <TransparencyContent lang={lang} info={info} />
      </main>
    </div>
  );
}
