import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getLang } from "@/lib/i18n/server";

const t = {
  es: { title: "No encontrado", body: "Esta página no existe o no tienes acceso a ella.", back: "Volver al portal" },
  en: { title: "Not found", body: "This page does not exist or you do not have access to it.", back: "Back to the portal" },
};

export default async function NotFound() {
  const m = t[await getLang()];
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-4 text-center">
      <Logo />
      <h1 className="mt-6 font-display text-3xl font-medium">{m.title}</h1>
      <p className="max-w-md text-muted">{m.body}</p>
      <Button asChild variant="line">
        <Link href="/">{m.back}</Link>
      </Button>
    </div>
  );
}
