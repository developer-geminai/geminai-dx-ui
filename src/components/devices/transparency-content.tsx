import { CheckCircle2, Clock, Globe, Mail, ShieldAlert, ShieldCheck, XCircle, AppWindow } from "lucide-react";
import type { TransparencyInfo } from "@/lib/api/types";
import type { Lang } from "@/lib/i18n";
import { transMsg } from "./messages";

/** Body of the employee transparency page; shared by the public page and the in-portal preview. */
export function TransparencyContent({ lang, info }: { lang: Lang; info: TransparencyInfo }) {
  const m = transMsg[lang];
  const kindIcon = { category: ShieldAlert, app: AppWindow, url: Globe } as const;
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-[2rem] font-medium leading-tight tracking-[-0.015em]">{m.title(info.orgName)}</h1>
        <p className="mt-3 max-w-2xl text-ink-2">{m.lead}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-medium">
            <CheckCircle2 className="size-5 text-brand" aria-hidden />
            {m.captured}
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-2">
            {info.captured.map((c) => (
              <li key={c} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                {c}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-medium">
            <XCircle className="size-5 text-ink" aria-hidden />
            {m.notCaptured}
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-2">
            {info.notCaptured.map((c) => (
              <li key={c} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-ink" />
                {c}
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-medium">
          <ShieldCheck className="size-5 text-brand" aria-hidden />
          {m.blocked}
        </h2>
        <p className="text-sm text-muted">{m.blockedHint}</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {info.blocked.map((b) => {
            const Icon = kindIcon[b.kind];
            return (
              <li key={b.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-ink-2" title={m.kinds[b.kind]}>
                <Icon className="size-3.5 text-muted" aria-hidden />
                {b.label}
              </li>
            );
          })}
        </ul>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-medium">
            <Clock className="size-5 text-muted" aria-hidden />
            {m.retention}
          </h2>
          <p className="mt-2 text-sm text-ink-2">{info.retention === "18m" ? m.retention18m : m.retention90d}</p>
          <p className="mt-2 text-sm text-muted">{m.pause}</p>
        </section>
        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-medium">
            <Mail className="size-5 text-muted" aria-hidden />
            {m.ask}
          </h2>
          <p className="mt-2 text-sm">
            <span className="font-medium text-ink">{info.contact.name}</span>
            <br />
            <a className="text-brand-ink hover:underline" href={`mailto:${info.contact.email}`}>
              {info.contact.email}
            </a>
          </p>
          <p className="mt-3 text-sm text-muted">
            {m.dpo}:{" "}
            <a className="text-brand-ink hover:underline" href={`mailto:${info.dpoEmail}`}>
              {info.dpoEmail}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
