"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, FileText, KeyRound, Mail, Plus, Radio, Trash2 } from "lucide-react";
import type { BlockRule, CompanyDetails, Contract, Device, EntityKind, OrgEntity, Organization } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { ContractStatusBadge, DeviceStatusBadge } from "@/components/status-badges";
import { AnalyzeToggle } from "@/components/devices/blocklist-editor";
import { DownloadCard, type TrackerDownload } from "@/components/devices/download-card";
import { useLang } from "@/lib/i18n/client";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { savePrivacyAction, saveCompanyAction } from "@/app/o/[org]/onboarding/actions";
import { obMsg } from "./messages";

function Footer({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-5">
      {note ? <p className="mr-auto text-xs text-muted">{note}</p> : null}
      {children}
    </div>
  );
}

function Field({ id, label, children, hint, className }: { id: string; label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

/* ───────────── 1 · Account ───────────── */

export function AccountStep({ user, done, canEdit, pending, onContinue }: { user: { name: string; email: string }; done: boolean; canEdit: boolean; pending: boolean; onContinue: () => void }) {
  const m = obMsg[useLang()];
  return (
    <div>
      <p className="font-medium text-ink">{m.account.title}</p>
      <p className="mt-1 max-w-xl text-sm text-muted">{m.account.body}</p>
      <dl className="mt-5 grid max-w-lg gap-3 rounded-md border border-line bg-paper p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">{user.name}</dt>
          <dd className="font-mono text-xs text-ink">{user.email}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="inline-flex items-center gap-1.5 text-muted">
            <KeyRound className="size-3.5" aria-hidden />
            {m.account.password}
          </dt>
          <dd>
            <Badge tone="done">{m.account.passwordSet}</Badge>
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Google</dt>
          <dd>
            <Badge tone="done">{m.account.linked}</Badge>
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Microsoft</dt>
          <dd>
            <Badge tone="neutral">{m.account.notLinked}</Badge>
          </dd>
        </div>
      </dl>
      <Footer note={!canEdit && !done ? m.readOnly : undefined}>
        <Button onClick={onContinue} disabled={pending || (!done && !canEdit)}>
          {m.continue}
        </Button>
      </Footer>
    </div>
  );
}

/* ───────────── 2 · Company ───────────── */

export function CompanyStep({ orgId, company, entities, canEdit, onSaved, done, onNext }: { orgId: string; company: CompanyDetails; entities: OrgEntity[]; canEdit: boolean; onSaved: () => void; done: boolean; onNext: () => void }) {
  const m = obMsg[useLang()].company;
  const mm = obMsg[useLang()];
  const [c, setC] = useState<CompanyDetails>(company);
  const [extra, setExtra] = useState<{ name: string; kind: EntityKind }[]>([]);
  const [draft, setDraft] = useState<{ name: string; kind: EntityKind }>({ name: "", kind: "center" });
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof CompanyDetails>(k: K, v: CompanyDetails[K]) => setC((p) => ({ ...p, [k]: v }));
  const ro = !canEdit;
  const listed = entities.filter((e) => e.kind !== "department");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!c.legalName.trim() || !c.nif.trim()) return setError(true);
        setError(false);
        start(async () => {
          const r = await saveCompanyAction(orgId, c);
          if (r.ok) onSaved();
        });
      }}
    >
      <fieldset disabled={ro} className="grid gap-4 md:grid-cols-2">
        <Field id="legal" label={m.legal}>
          <Input id="legal" value={c.legalName} onChange={(e) => set("legalName", e.target.value)} required />
        </Field>
        <Field id="nif" label={m.nif}>
          <Input id="nif" value={c.nif} onChange={(e) => set("nif", e.target.value.toUpperCase())} required className="font-mono" />
        </Field>
        <Field id="address" label={m.address}>
          <Input id="address" value={c.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field id="city" label={m.city}>
          <Input id="city" value={c.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field id="model" label={m.model} className="md:col-span-2">
          <Select id="model" value={c.contractModel} onChange={(e) => set("contractModel", e.target.value as CompanyDetails["contractModel"])}>
            <option value="clinic">{m.modelClinic}</option>
            <option value="company">{m.modelCompany}</option>
          </Select>
        </Field>
      </fieldset>

      <section className="mt-6">
        <h3 className="font-display text-lg font-medium">{m.entities}</h3>
        <p className="text-sm text-muted">{m.entitiesHint}</p>
        <ul className="mt-3 divide-y divide-line rounded-md border border-line">
          {listed.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                <span className="font-medium text-ink">{e.legalName ?? e.name}</span>
                {e.nif ? <span className="ml-2 font-mono text-xs text-muted">{e.nif}</span> : null}
              </span>
              <Badge tone="outline">{m.kinds[e.kind]}</Badge>
            </li>
          ))}
          {extra.map((e, i) => (
            <li key={`x${i}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="font-medium text-ink">{e.name}</span>
              <span className="flex items-center gap-2">
                <Badge tone="outline">{m.kinds[e.kind]}</Badge>
                <Button type="button" variant="ghost" size="icon" aria-label={`× ${e.name}`} onClick={() => setExtra((x) => x.filter((_, j) => j !== i))}>
                  <Trash2 aria-hidden />
                </Button>
              </span>
            </li>
          ))}
        </ul>
        {!ro ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <label htmlFor="ent-name" className="sr-only">
              {m.entityName}
            </label>
            <Input id="ent-name" placeholder={m.entityName} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="max-w-xs" />
            <label htmlFor="ent-kind" className="sr-only">
              {m.entityKind}
            </label>
            <Select id="ent-kind" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as EntityKind })} className="w-40">
              <option value="company">{m.kinds.company}</option>
              <option value="center">{m.kinds.center}</option>
              <option value="department">{m.kinds.department}</option>
            </Select>
            <Button
              type="button"
              variant="line"
              disabled={!draft.name.trim()}
              onClick={() => {
                setExtra((x) => [...x, { name: draft.name.trim(), kind: draft.kind }]);
                setDraft({ name: "", kind: draft.kind });
              }}
            >
              <Plus aria-hidden />
              {m.addEntity}
            </Button>
          </div>
        ) : null}
      </section>

      <fieldset disabled={ro} className="mt-6 grid gap-4 md:grid-cols-3">
        <legend className="mb-2 font-display text-lg font-medium">{m.signer}</legend>
        <Field id="s-name" label={m.signerName}>
          <Input id="s-name" value={c.signer.name} onChange={(e) => set("signer", { ...c.signer, name: e.target.value })} />
        </Field>
        <Field id="s-role" label={m.signerRole}>
          <Input id="s-role" value={c.signer.role} onChange={(e) => set("signer", { ...c.signer, role: e.target.value })} />
        </Field>
        <Field id="s-email" label={m.signerEmail}>
          <Input id="s-email" type="email" value={c.signer.email} onChange={(e) => set("signer", { ...c.signer, email: e.target.value })} />
        </Field>
      </fieldset>

      <fieldset disabled={ro} className="mt-6 grid gap-4 md:grid-cols-3">
        <legend className="mb-2 font-display text-lg font-medium">{m.contact}</legend>
        <Field id="c-name" label={m.signerName}>
          <Input id="c-name" value={c.incidentContact.name} onChange={(e) => set("incidentContact", { ...c.incidentContact, name: e.target.value })} />
        </Field>
        <Field id="c-email" label={m.signerEmail}>
          <Input id="c-email" type="email" value={c.incidentContact.email} onChange={(e) => set("incidentContact", { ...c.incidentContact, email: e.target.value })} />
        </Field>
        <Field id="c-phone" label={m.phone}>
          <Input id="c-phone" type="tel" value={c.incidentContact.phone} onChange={(e) => set("incidentContact", { ...c.incidentContact, phone: e.target.value })} />
        </Field>
      </fieldset>

      <fieldset disabled={ro} className="mt-6 grid gap-4 md:grid-cols-3">
        <legend className="mb-2 font-display text-lg font-medium">{m.pilot}</legend>
        <Field id="p-start" label={m.start}>
          <Input id="p-start" type="date" value={c.pilotStart} onChange={(e) => set("pilotStart", e.target.value)} />
        </Field>
        <Field id="p-end" label={m.end}>
          <Input id="p-end" type="date" value={c.pilotEnd} onChange={(e) => set("pilotEnd", e.target.value)} />
        </Field>
        <Field id="p-pos" label={m.positions} hint={m.positionsHint} className="md:col-span-3">
          <Input id="p-pos" value={c.positions} onChange={(e) => set("positions", e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm md:col-span-3">
          <input type="checkbox" className="size-4 accent-[rgb(var(--brand))]" checked={c.workersRepresentation} onChange={(e) => set("workersRepresentation", e.target.checked)} />
          {m.rlt}
        </label>
        {c.workersRepresentation ? (
          <p className="flex items-start gap-2 rounded-md border border-signal-line bg-signal-soft px-3 py-2 text-sm text-signal-ink md:col-span-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {m.rltNote}
          </p>
        ) : null}
      </fieldset>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {m.required}
        </p>
      ) : null}
      <Footer note={ro ? mm.readOnly : undefined}>
        {done ? (
          <Button type="button" variant="line" onClick={onNext}>
            {mm.continue}
          </Button>
        ) : null}
        <Button type="submit" disabled={pending || ro}>
          {mm.saveContinue}
        </Button>
      </Footer>
    </form>
  );
}

/* ───────────── 3 · Contracts ───────────── */

export function ContractsStep({ company, contracts, done, canSign, pending, onSign, onNext }: { company: CompanyDetails; contracts: Contract[]; done: boolean; canSign: boolean; pending: boolean; onSign: () => void; onNext: () => void }) {
  const lang = useLang();
  const m = obMsg[lang].contracts;
  const mm = obMsg[lang];
  const f = fmt(lang);
  const [accepted, setAccepted] = useState(false);
  const template = company.contractModel === "clinic" ? "GDX-CL-01 v2.0" : "GDX-CL-03 v2.0";
  const docs = [
    { type: "pilot" as const, title: lang === "es" ? "Acuerdo de piloto" : "Pilot agreement", template: "GDX-PIL v1.3", clauses: m.pilotClauses },
    { type: "dpa" as const, title: lang === "es" ? "Contrato de encargo de tratamiento (DPA)" : "Data processing agreement (DPA)", template, clauses: m.dpaClauses },
  ];
  const filled: [string, string][] = [
    [obMsg[lang].company.legal, company.legalName],
    [obMsg[lang].company.nif, company.nif],
    [obMsg[lang].company.address, [company.address, company.city].filter(Boolean).join(", ")],
    [obMsg[lang].company.signer, `${company.signer.name} · ${company.signer.role}`],
    [obMsg[lang].company.pilot, `${f.date(company.pilotStart)} – ${f.date(company.pilotEnd)}`],
  ];

  return (
    <div>
      <p className="max-w-2xl text-sm text-ink-2">{m.intro}</p>
      {company.workersRepresentation ? (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-signal-line bg-signal-soft px-3 py-2 text-sm text-signal-ink">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {m.review}
        </p>
      ) : null}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {docs.map((d) => {
          const contract = contracts.find((c) => c.type === d.type);
          return (
            <article key={d.type} className="flex flex-col rounded-md border border-line bg-paper">
              <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 size-4 text-muted" aria-hidden />
                  <div>
                    <p className="font-medium text-ink">{d.title}</p>
                    <p className="font-mono text-[0.7rem] text-muted">
                      {m.template} {contract?.templateVersion ?? d.template}
                    </p>
                  </div>
                </div>
                {contract ? <ContractStatusBadge status={contract.status} /> : null}
              </header>
              <div className="grid gap-4 px-4 py-3 text-sm">
                <div>
                  <p className="label-mono mb-1.5">{m.filled}</p>
                  <dl className="grid gap-1">
                    {filled.map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[8rem_minmax(0,1fr)] gap-2">
                        <dt className="text-muted">{k}</dt>
                        <dd className="truncate rounded-[3px] bg-signal-soft/0 text-ink">{v || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div>
                  <p className="label-mono mb-1.5">{m.clauses}</p>
                  <ol className="list-decimal space-y-0.5 pl-5 text-ink-2">
                    {d.clauses.map((cl) => (
                      <li key={cl}>{cl}</li>
                    ))}
                  </ol>
                </div>
              </div>
              {contract ? (
                <div className="mt-auto border-t border-line px-4 py-2">
                  <a href={contract.pdfUrl} className="text-xs font-medium text-brand-ink hover:underline">
                    {m.download}
                  </a>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {done ? (
        <Footer>
          <span className="mr-auto inline-flex items-center gap-1.5 text-sm font-medium text-brand-ink">
            <Check className="size-4" aria-hidden />
            {m.signed}
          </span>
          <Button onClick={onNext}>{mm.continue}</Button>
        </Footer>
      ) : (
        <Footer note={!canSign ? mm.readOnly : m.signNote}>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-[rgb(var(--brand))]" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} disabled={!canSign} />
            {m.accept}
          </label>
          <Button onClick={onSign} disabled={!accepted || pending || !canSign}>
            {m.sign}
          </Button>
        </Footer>
      )}
    </div>
  );
}

/* ───────────── 4 · Privacy ───────────── */

export function PrivacyStep({ orgId, rules, retention, done, canEdit, onSaved, onNext }: { orgId: string; rules: BlockRule[]; retention: Organization["retention"]; done: boolean; canEdit: boolean; onSaved: () => void; onNext: () => void }) {
  const m = obMsg[useLang()].privacy;
  const mm = obMsg[useLang()];
  const [values, setValues] = useState<Record<string, boolean>>(() => Object.fromEntries(rules.map((r) => [r.id, r.analyze])));
  const [ret, setRet] = useState(retention);
  const [pending, start] = useTransition();
  const groups = [
    { title: m.categories, items: rules.filter((r) => r.kind === "category") },
    { title: m.common, items: rules.filter((r) => r.kind !== "category" && !r.analyze) },
  ];
  return (
    <div>
      <p className="max-w-2xl text-sm text-ink-2">{m.intro}</p>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        {groups.map((g) => (
          <section key={g.title}>
            <h3 className="font-display text-lg font-medium">{g.title}</h3>
            <ul className="mt-2 divide-y divide-line rounded-md border border-line">
              {g.items.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm text-ink", r.kind === "url" && "font-mono")}>{r.label}</span>
                    {r.description ? <span className="block text-xs text-muted">{r.description}</span> : null}
                  </span>
                  <AnalyzeToggle label={r.label} value={values[r.id] ?? r.analyze} disabled={!canEdit} onChange={(v) => setValues((x) => ({ ...x, [r.id]: v }))} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-6">
        <h3 className="font-display text-lg font-medium">{m.retention}</h3>
        <div role="radiogroup" aria-label={m.retention} className="mt-2 grid gap-3 sm:grid-cols-2">
          {(
            [
              { v: "18m", title: m.r18, hint: m.r18hint, rec: true },
              { v: "90d", title: m.r90, hint: m.r90hint, rec: false },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              type="button"
              role="radio"
              aria-checked={ret === o.v}
              disabled={!canEdit}
              onClick={() => setRet(o.v)}
              className={cn("rounded-md border p-4 text-left transition-colors", ret === o.v ? "border-brand bg-brand-soft/60" : "border-line hover:border-muted")}
            >
              <span className="flex items-center gap-2 font-medium text-ink">
                {o.title}
                {o.rec ? <Badge tone="done">{m.recommended}</Badge> : null}
              </span>
              <span className="mt-1 block text-sm text-muted">{o.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <Footer note={!canEdit ? mm.readOnly : m.more}>
        {done ? (
          <Button type="button" variant="line" onClick={onNext}>
            {mm.continue}
          </Button>
        ) : null}
        <Button
          disabled={pending || !canEdit}
          onClick={() =>
            start(async () => {
              const r = await savePrivacyAction(
                orgId,
                ret,
                Object.entries(values).map(([id, analyze]) => ({ id, analyze })),
              );
              if (r.ok) onSaved();
            })
          }
        >
          {mm.saveContinue}
        </Button>
      </Footer>
    </div>
  );
}

/* ───────────── 5 · Devices ───────────── */

export function DevicesStep({ devices, download, done, canEdit, pending, onContinue }: { devices: Device[]; download: TrackerDownload; done: boolean; canEdit: boolean; pending: boolean; onContinue: () => void }) {
  const lang = useLang();
  const m = obMsg[lang].devices;
  const mm = obMsg[lang];
  const f = fmt(lang);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [invited, setInvited] = useState<string[]>([]);

  // Watch computers connect live while this step is open.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [router]);

  const connected = devices.filter((d) => d.installedAt);
  const pendingDevices = devices.filter((d) => !d.installedAt);

  return (
    <div>
      <p className="max-w-2xl text-sm text-ink-2">{m.intro}</p>
      <div className="mt-5 grid gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-6">
          <DownloadCard lang={lang} download={download} compact />
          <section>
            <h3 className="font-display text-lg font-medium">{m.invite}</h3>
            <p className="text-sm text-muted">{m.inviteHint}</p>
            {/* UI-only in the demo: the API has no "invite pilot user" endpoint yet. */}
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const v = email.trim().toLowerCase();
                if (!/^\S+@\S+\.\S+$/.test(v) || invited.includes(v)) return;
                setInvited((x) => [...x, v]);
                setEmail("");
              }}
            >
              <label htmlFor="invite" className="sr-only">
                {m.invite}
              </label>
              <Input id="invite" type="email" placeholder={m.invitePlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} disabled={!canEdit} />
              <Button type="submit" variant="line" disabled={!canEdit || !email.trim()}>
                <Mail aria-hidden />
                {m.send}
              </Button>
            </form>
            {invited.length ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {invited.map((i) => (
                  <li key={i}>
                    <Badge tone="done">
                      <Check aria-hidden />
                      {i}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>
        <section className="rounded-md border border-line">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h3 className="flex items-center gap-2 font-medium">
                <Radio className="size-4 animate-pulse text-brand" aria-hidden />
                {m.live}
                <span className="tabular text-muted">
                  {connected.length}/{devices.length}
                </span>
              </h3>
              <p className="text-xs text-muted">{m.liveHint}</p>
            </div>
          </header>
          <ul className="divide-y divide-line" aria-live="polite">
            {connected.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span>
                  <span className="block font-mono text-sm">{d.alias}</span>
                  <span className="block text-xs text-muted">
                    {d.department} · {f.relative(d.lastEventAt)}
                  </span>
                </span>
                <DeviceStatusBadge status={d.status} />
              </li>
            ))}
            {pendingDevices.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2.5 opacity-70">
                <span>
                  <span className="block font-mono text-sm">{d.alias}</span>
                  <span className="block text-xs text-muted">{d.department}</span>
                </span>
                <DeviceStatusBadge status={d.status} />
              </li>
            ))}
            {!devices.length ? <li className="px-4 py-6 text-center text-sm text-muted">{m.waiting}</li> : null}
          </ul>
        </section>
      </div>
      <Footer note={!connected.length ? m.continueAny : !canEdit && !done ? mm.readOnly : undefined}>
        <Button onClick={onContinue} disabled={pending || !connected.length || (!done && !canEdit)}>
          {mm.continue}
        </Button>
      </Footer>
    </div>
  );
}
