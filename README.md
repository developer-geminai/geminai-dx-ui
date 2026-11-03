# GeminAI Dx — Portal del cliente (UI, mock API)

The client's single door to GeminAI Dx, from the invitation to managing agents in production. It implements the **UI spec v0.1** (Oct 30, 2026) with **Next.js 15 (App Router), React 19, TypeScript strict and Tailwind**, using the brand of the CRM and the contract portal (ink `#010D13`, green `#139279`, forest `#001C17`, amber only for "requires attention"; Newsreader + IBM Plex Sans/Mono; ES/EN).

> **Demo build.** Login accepts any email + password. All data is fictional and served by an in-memory **mock API** that resets on server restart. Swap it for the real backend with `GDX_API_MODE=http GDX_API_URL=…` — see [docs/API.md](docs/API.md).

## Run

```powershell
npm install
npm run dev          # http://localhost:3100
```

Sign in with the pre-filled `demo@geminai-dx.com` (GeminAI staff: client selector, Roadmap, internal view) or pick a client account on the login page:

| Account | Organization | Phase |
| --- | --- | --- |
| `lucia.ferrer@helios.demo` (Admin), `javier.ortega@helios.demo` (Reviewer) | Grupo Médico Helios — 2 companies, 3 centers | 2 · Automation (+ one department in diagnostic) |
| `raul.medina@brisa.demo` | Logística Brisa | 1 · Diagnostic (day 12 of 21) |
| `ines.calvo@aurora.demo` | Clínica Aurora | 0 · Onboarding (contracts pending) |

## Phases and the Roadmap

| Phase | Spec phases | Opens |
| --- | --- | --- |
| 0 · Onboarding | Onboarding | Home checklist, onboarding wizard, Devices & privacy, Contracts, Settings |
| 1 · Diagnostic | Diagnóstico | + Diagnostic (capture progress, results dashboard, history) |
| 2 · Automation | Construcción, Shadow y supervisado, Activo | + Agents, Questions, Billing, Audit |

Sections of later phases are shown **locked with what unlocks them**, never empty. **`/o/{org}/roadmap`** (staff and client admins) lists every feature by phase and release (V1 / V1.5 / V2), with a switch per client (all on by default) and a phase switcher to preview the portal as the client will see it.

## Routes

| Route | Screen |
| --- | --- |
| `/login` | Fake login (password, Google, Microsoft) |
| `/o/{org}` | Inicio — checklist (phase 0/1) or KPIs, urgent strip, recent runs, next opportunity (phase 2) |
| `/o/{org}/onboarding` | 6-step wizard (account, company, contracts, privacy, devices, done) |
| `/o/{org}/questions` | Questions inbox: questions, exceptions, approvals, "Aplicar siempre" |
| `/o/{org}/agents`, `/o/{org}/agents/{id}` | Agent list; agent page with Summary, Runs (step timeline), Shadow, Learned, Performance; Pause always visible |
| `/o/{org}/diagnostic` | Capture progress, results (ported analytics dashboard), history |
| `/o/{org}/devices` | Computers with tracker, blocklist, transparency |
| `/o/{org}/contracts` | Pilot, DPA and service contracts per company |
| `/o/{org}/billing` | Plan by components, usage vs included, invoices, payment method |
| `/o/{org}/settings`, `/o/{org}/settings/audit` | Profile, users & roles, companies & centers, notifications, data, security; audit log with CSV/PDF |
| `/o/{org}/expand` | "Ampliar servicio" catalogue → CRM request |
| `/o/{org}/roadmap` | Feature toggles + phase preview |
| `/o/{org}/internal` | GeminAI-only cost and health view |
| `/transparency/{org}` | Public page for monitored employees (no login) |

## Where things live

| Path | Role |
| --- | --- |
| `src/lib/api/types.ts` · `contract.ts` | Domain model + `PortalApi` interface (the backend contract) |
| `src/lib/api/mock/` | Fictional seed (`profiles.ts`, `seed.ts`) and in-memory implementation |
| `src/lib/api/http.ts` | REST client with the same interface |
| `src/lib/features.ts` | Sections, unlock phase, roles, feature catalogue for the Roadmap |
| `src/lib/permissions.ts` | Role → permission matrix (spec "Roles y permisos") |
| `src/lib/i18n/` | ES (default) / EN; shared vocabulary in `common.ts`, module copy next to each module |
| `src/lib/server/session.ts` | Signed session cookie, `requireOrg()` page context |

## Commands

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```
