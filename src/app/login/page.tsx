import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/brand/logo";
import { getLang } from "@/lib/i18n/server";
import { defineMessages } from "@/lib/i18n";

export const metadata: Metadata = { title: "Acceso" };

const msg = defineMessages({
  es: {
    eyebrow: "Portal del cliente",
    headline: "Desde la firma hasta tus agentes en producción,",
    accent: "en un solo sitio.",
    lead: "Instala el tracker, mira qué está consumiendo el tiempo de tu equipo y revisa lo que hacen tus agentes. Tú tienes siempre el control.",
    steps: ["Onboarding", "Diagnóstico", "Automatización"],
    title: "Accede a tu portal",
    subtitle: "Usa la cuenta con la que te invitamos.",
  },
  en: {
    eyebrow: "Client portal",
    headline: "From signing to your agents in production,",
    accent: "in one place.",
    lead: "Install the tracker, see what is eating your team's time and review what your agents do. You are always in control.",
    steps: ["Onboarding", "Diagnostic", "Automation"],
    title: "Sign in to your portal",
    subtitle: "Use the account you were invited with.",
  },
});

export default async function LoginPage() {
  const lang = await getLang();
  const m = msg[lang];
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(420px,520px)]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-band p-12 text-band-fg lg:flex">
        <p className="eyebrow !text-band-brand">{m.eyebrow}</p>
        <div className="max-w-xl">
          <h1 className="font-display text-[2.8rem] font-normal leading-[1.08] tracking-[-0.02em]">
            {m.headline} <span className="italic text-band-brand">{m.accent}</span>
          </h1>
          <p className="mt-5 max-w-md text-band-muted">{m.lead}</p>
          <ol className="mt-10 flex flex-wrap items-center gap-3 font-mono text-[0.7rem] uppercase tracking-eyebrow text-band-muted">
            {m.steps.map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                <span className="rounded-full border border-band-line px-2.5 py-1 text-band-fg">
                  {i} · {s}
                </span>
                {i < m.steps.length - 1 ? <span aria-hidden>→</span> : null}
              </li>
            ))}
          </ol>
        </div>
        <p className="font-mono text-xs uppercase tracking-eyebrow text-band-muted">GeminAI Dx · geminai-dx.com</p>
      </section>
      <section className="flex items-center justify-center bg-surface px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <Logo product={m.eyebrow} />
          </div>
          <h2 className="font-display text-[1.9rem] font-medium leading-tight">{m.title}</h2>
          <p className="mt-1 text-sm text-muted">{m.subtitle}</p>
          <LoginForm />
        </div>
      </section>
    </div>
  );
}
