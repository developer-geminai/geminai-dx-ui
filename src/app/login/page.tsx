import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between bg-band p-10 text-band-fg lg:flex">
        <Logo onDark />
        <div className="max-w-md">
          <p className="eyebrow mb-4 !text-band-brand">Agent Control Center</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-[-0.015em]">
            See what every agent received, checked, decided — <span className="text-band-brand">and what still needs you.</span>
          </h1>
          <p className="mt-4 text-band-muted">
            Business-first execution journeys built only from recorded events and evidence. Read-only: this console never performs business actions.
          </p>
        </div>
        <p className="font-mono text-xs uppercase tracking-eyebrow text-band-muted">GeminAI Dx</p>
      </section>
      <section className="flex items-center justify-center bg-paper px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-semibold">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Use the operator access key issued by your administrator.</p>
          <p className="mt-3 rounded-md border border-line bg-brand-soft px-3 py-2 text-sm text-ink">
            <strong>Demo:</strong> any access key works. All agents, cases and questions shown are fictional.
          </p>
          <LoginForm />
        </div>
      </section>
    </div>
  );
}
