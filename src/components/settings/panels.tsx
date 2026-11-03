"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useLang } from "@/lib/i18n/client";
import { common } from "@/lib/i18n/common";
import { fmt } from "@/lib/format";
import { ROLES, type NotificationChannel, type NotificationEvent, type NotificationPrefs, type OrgEntity, type Organization, type Role, type User } from "@/lib/api/types";
import { setLangAction } from "@/app/actions";
import { inviteUserAction, updateMembershipAction, updateNotificationPrefsAction, updateSettingsAction } from "@/app/o/[org]/settings/actions";
import { settingsMsg } from "./messages";

function SavedHint({ show }: { show: boolean }) {
  const c = common[useLang()];
  return show ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-ink" role="status">
      <Check className="size-3.5" aria-hidden />
      {c.actions.saved}
    </span>
  ) : null;
}

/* ───── Profile: language ───── */

export function LanguagePicker() {
  const lang = useLang();
  const m = settingsMsg[lang];
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="lang">{m.language}</Label>
      <Select
        id="lang"
        className="max-w-xs"
        value={lang}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await setLangAction(e.target.value);
            router.refresh();
          })
        }
      >
        <option value="es">Español</option>
        <option value="en">English</option>
      </Select>
      <p className="text-xs text-muted">{m.languageHint}</p>
    </div>
  );
}

/* ───── Users & roles ───── */

function scopeOptions(entities: OrgEntity[]) {
  return entities.filter((e) => e.kind !== "company");
}

export function UsersPanel({ orgId, users, entities, canManage }: { orgId: string; users: User[]; entities: OrgEntity[]; canManage: boolean }) {
  const lang = useLang();
  const m = settingsMsg[lang];
  const c = common[lang];
  const f = fmt(lang);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", role: "reviewer" as Role, scope: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const scopes = scopeOptions(entities);
  const entityName = (id: string | null) => (id ? (entities.find((e) => e.id === id)?.name ?? "—") : m.wholeOrg);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{m.usersHint}</p>
        {canManage ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <UserPlus aria-hidden />
            {m.invite}
          </Button>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>{m.name}</th>
              <th>{m.role}</th>
              <th>{m.scope}</th>
              <th>{m.status}</th>
              <th>{m.lastSeen}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const mem = u.memberships.find((x) => x.orgId === orgId);
              return (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-paper-alt text-xs font-semibold text-ink-2">{u.initials}</span>
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">{u.name}</span>
                        <span className="block truncate text-xs text-muted">{u.email}</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    {canManage && mem ? (
                      <Select
                        aria-label={`${m.role} · ${u.name}`}
                        className="h-8 min-w-[11rem] text-xs"
                        defaultValue={mem.role}
                        onChange={(e) => start(async () => void (await updateMembershipAction(orgId, u.id, e.target.value as Role, mem.scopeEntityId)))}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {c.role[r]}
                          </option>
                        ))}
                      </Select>
                    ) : mem ? (
                      c.role[mem.role]
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {canManage && mem ? (
                      <Select
                        aria-label={`${m.scope} · ${u.name}`}
                        className="h-8 min-w-[11rem] text-xs"
                        defaultValue={mem.scopeEntityId ?? ""}
                        onChange={(e) => start(async () => void (await updateMembershipAction(orgId, u.id, mem.role, e.target.value || null)))}
                      >
                        <option value="">{m.wholeOrg}</option>
                        {scopes.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <span className="text-muted">{entityName(mem?.scopeEntityId ?? null)}</span>
                    )}
                  </td>
                  <td>{u.status === "active" ? <Badge tone="done">{m.statusActive}</Badge> : <Badge tone="outline">{m.statusInvited}</Badge>}</td>
                  <td className="tabular whitespace-nowrap text-muted">{u.lastSeenAt ? f.relative(u.lastSeenAt) : m.never}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={m.inviteTitle}
        description={m.inviteBody}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {c.actions.cancel}
            </Button>
            <Button
              disabled={pending || !form.email}
              onClick={() =>
                start(async () => {
                  const r = await inviteUserAction(orgId, { email: form.email.trim(), name: form.name.trim(), role: form.role, scopeEntityId: form.scope || null });
                  if (r.ok) {
                    setOpen(false);
                    setError(null);
                    setForm({ email: "", name: "", role: "reviewer", scope: "" });
                  } else setError(m.invalidEmail);
                })
              }
            >
              {m.send}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="inv-email">{m.email}</Label>
            <Input id="inv-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={Boolean(error)} />
            {error ? <p className="text-xs text-danger">{error}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="inv-name">{m.name}</Label>
            <Input id="inv-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-role">{m.role}</Label>
            <Select id="inv-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {c.role[r]}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-scope">{m.scope}</Label>
            <Select id="inv-scope" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
              <option value="">{m.wholeOrg}</option>
              {scopes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

/* ───── Notifications ───── */

const CHANNELS: NotificationChannel[] = ["desktop", "portal", "email"];

export function NotificationsPanel({ orgId, prefs, desktopEnabled }: { orgId: string; prefs: NotificationPrefs; desktopEnabled: boolean }) {
  const m = settingsMsg[useLang()];
  const [state, setState] = useState(prefs);
  const [saved, setSaved] = useState(false);
  const [, start] = useTransition();
  const events = Object.keys(state.matrix) as NotificationEvent[];
  const channels = desktopEnabled ? CHANNELS : CHANNELS.filter((ch) => ch !== "desktop");

  const toggle = (ev: NotificationEvent, ch: NotificationChannel, on: boolean) => {
    const cur = state.matrix[ev];
    const next: NotificationPrefs = { ...state, matrix: { ...state.matrix, [ev]: on ? [...new Set([...cur, ch])] : cur.filter((x) => x !== ch) } };
    setState(next);
    setSaved(false);
    start(async () => {
      const r = await updateNotificationPrefsAction(orgId, next);
      setSaved(r.ok);
    });
  };

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <SavedHint show={saved} />
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th />
              {channels.map((ch) => (
                <th key={ch} className="text-center">
                  {m.channel[ch]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev}>
                <td className="text-ink">{m.event[ev]}</td>
                {channels.map((ch) => (
                  <td key={ch} className="text-center">
                    <Switch checked={state.matrix[ev].includes(ch)} onCheckedChange={(v) => toggle(ev, ch, v)} label={`${m.event[ev]} · ${m.channel[ch]}`} className="mx-auto" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───── Data & rate ───── */

export function DataPanel({ org, canEdit }: { org: Organization; canEdit: boolean }) {
  const lang = useLang();
  const m = settingsMsg[lang];
  const c = common[lang];
  const [name, setName] = useState(org.name);
  const [retention, setRetention] = useState(org.retention);
  const [rate, setRate] = useState(org.hourlyRate === null ? "" : String(org.hourlyRate));
  const [start1, setStart1] = useState(org.workingHours.start);
  const [end1, setEnd1] = useState(org.workingHours.end);
  const [days, setDays] = useState(org.workingHours.days);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const disabled = !canEdit || pending;

  return (
    <form
      className="flex max-w-2xl flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        const hourlyRate = rate.trim() === "" ? null : Number(rate.replace(",", "."));
        start(async () => {
          const r = await updateSettingsAction(org.id, { name: name.trim() || org.name, retention, hourlyRate, workingHours: { start: start1, end: end1, days } });
          setSaved(r.ok);
          setError(!r.ok);
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="org-name">{m.orgName}</Label>
        <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} />
      </div>

      <fieldset className="flex flex-col gap-2" disabled={disabled}>
        <legend className="mb-1 text-xs font-medium text-muted">{m.retention}</legend>
        {(["18m", "90d"] as const).map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm">
            <input type="radio" name="retention" value={r} checked={retention === r} onChange={() => setRetention(r)} className="accent-[rgb(var(--brand))]" />
            {r === "18m" ? m.ret18 : m.ret90}
          </label>
        ))}
        <p className="text-xs text-muted">{m.retentionHint}</p>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rate">{m.rate}</Label>
        <div className="flex max-w-[12rem] items-center gap-2">
          <Input id="rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} disabled={disabled} placeholder="—" />
          <span className="text-sm text-muted">€/h</span>
        </div>
        <p className="text-xs text-muted">{m.rateHint}</p>
      </div>

      <fieldset className="flex flex-col gap-2" disabled={disabled}>
        <legend className="mb-1 text-xs font-medium text-muted">{m.workingHours}</legend>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            {m.from}
            <Input type="time" value={start1} onChange={(e) => setStart1(e.target.value)} className="w-28" />
          </label>
          <label className="flex items-center gap-2">
            {m.to}
            <Input type="time" value={end1} onChange={(e) => setEnd1(e.target.value)} className="w-28" />
          </label>
        </div>
        <div className="flex gap-1" role="group" aria-label={m.days}>
          {m.weekdays.map((d, i) => {
            const day = i + 1;
            const on = days.includes(day);
            return (
              <button key={i} type="button" aria-pressed={on} onClick={() => setDays(on ? days.filter((x) => x !== day) : [...days, day].sort())} className={`size-8 rounded-sm border text-xs font-semibold ${on ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-muted"}`}>
                {d}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={disabled}>
          {c.actions.save}
        </Button>
        <SavedHint show={saved} />
        {error ? <span className="text-xs text-danger">{m.forbidden}</span> : null}
        {!canEdit ? <span className="text-xs text-muted">{m.forbidden}</span> : null}
      </div>
    </form>
  );
}
