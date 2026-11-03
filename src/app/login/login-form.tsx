"use client";
import { useActionState, useState } from "react";
import { LogIn } from "lucide-react";
import { loginAction, ssoLoginAction, type LoginState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { useLang } from "@/lib/i18n/client";
import { defineMessages } from "@/lib/i18n";

const msg = defineMessages({
  es: {
    email: "Email",
    password: "Contraseña",
    submit: "Entrar",
    pending: "Entrando…",
    or: "o continúa con",
    google: "Google",
    microsoft: "Microsoft",
    forgot: "¿Has olvidado la contraseña?",
    demoTitle: "Demo: cualquier credencial funciona.",
    demoBody: "Elige una cuenta de ejemplo para ver el portal con otro rol:",
    missing: "Escribe un email y una contraseña (cualquiera vale en la demo).",
    invalid: "Email o contraseña incorrectos.",
  },
  en: {
    email: "Email",
    password: "Password",
    submit: "Sign in",
    pending: "Signing in…",
    or: "or continue with",
    google: "Google",
    microsoft: "Microsoft",
    forgot: "Forgot your password?",
    demoTitle: "Demo: any credentials work.",
    demoBody: "Pick a sample account to see the portal with another role:",
    missing: "Enter an email and a password (anything works in the demo).",
    invalid: "Wrong email or password.",
  },
});

const DEMO_ACCOUNTS = [
  { email: "demo@geminai-dx.com", label: { es: "Equipo GeminAI · todos los clientes", en: "GeminAI team · all clients" } },
  { email: "lucia.ferrer@helios.demo", label: { es: "Admin · Grupo Médico Helios", en: "Admin · Grupo Médico Helios" } },
  { email: "javier.ortega@helios.demo", label: { es: "Revisor · Helios Admisiones", en: "Reviewer · Helios Admissions" } },
  { email: "raul.medina@brisa.demo", label: { es: "Admin · Logística Brisa (diagnóstico)", en: "Admin · Logística Brisa (diagnostic)" } },
  { email: "ines.calvo@aurora.demo", label: { es: "Admin · Clínica Aurora (onboarding)", en: "Admin · Clínica Aurora (onboarding)" } },
];

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}
function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#F25022" d="M1 1h10.5v10.5H1z" />
      <path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" />
      <path fill="#00A4EF" d="M1 12.5h10.5V23H1z" />
      <path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" />
    </svg>
  );
}

export function LoginForm() {
  const lang = useLang();
  const m = msg[lang];
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0]!.email);
  const [password, setPassword] = useState("demo1234");
  const error = state.error === "missing" ? m.missing : state.error ? m.invalid : null;

  return (
    <>
      <form action={action} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{m.email}</Label>
          <Input id="email" name="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{m.password}</Label>
            <button type="button" className="text-xs text-brand-ink hover:underline">
              {m.forgot}
            </button>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required aria-invalid={Boolean(error)} aria-describedby={error ? "login-error" : undefined} />
        </div>
        {error ? (
          <p id="login-error" role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={pending}>
          <LogIn aria-hidden />
          {pending ? m.pending : m.submit}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        {m.or}
        <span className="h-px flex-1 bg-line" />
      </div>
      <form action={ssoLoginAction} className="grid grid-cols-2 gap-2">
        <Button type="submit" name="provider" value="google" variant="line">
          <GoogleIcon />
          {m.google}
        </Button>
        <Button type="submit" name="provider" value="microsoft" variant="line">
          <MicrosoftIcon />
          {m.microsoft}
        </Button>
      </form>

      <div className="mt-8 rounded-md border border-brand-line bg-brand-soft px-3 py-3 text-sm">
        <p className="font-semibold text-ink">{m.demoTitle}</p>
        <p className="mt-0.5 text-muted">{m.demoBody}</p>
        <ul className="mt-2 flex flex-col gap-1">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.email}>
              <button type="button" onClick={() => setEmail(a.email)} className={`w-full rounded-sm px-2 py-1 text-left text-xs transition-colors ${email === a.email ? "bg-surface font-semibold text-ink" : "text-ink-2 hover:bg-surface/70"}`}>
                {a.label[lang]}
                <span className="block font-mono text-[0.65rem] text-muted">{a.email}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
