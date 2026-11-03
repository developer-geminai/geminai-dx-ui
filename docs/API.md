# Portal API contract (v0 — mock)

The UI talks to the backend through one interface, `PortalApi` ([src/lib/api/contract.ts](../src/lib/api/contract.ts)).
Types live in [src/lib/api/types.ts](../src/lib/api/types.ts) and follow the entity table of the UI spec v0.1.

| Mode | How | Implementation |
| --- | --- | --- |
| `mock` (default) | nothing to configure | [src/lib/api/mock](../src/lib/api/mock) — in-memory, fictional data, resets on server restart |
| `http` | `GDX_API_MODE=http`, `GDX_API_URL=https://…` | [src/lib/api/http.ts](../src/lib/api/http.ts) — the REST paths below |

To plug in the real backend: implement these endpoints with the JSON shapes from `types.ts`, set the two env vars, done. No component changes.

## Conventions

- Base: `{GDX_API_URL}/v1`. JSON in and out. ISO-8601 timestamps. Money in euros (number).
- Multi-tenant: everything is under `/orgs/{orgId}`; enforce `org_id` with row-level policies.
- Writes carry `X-GDX-Actor: {userId}` in the mock client. **The real server must take the actor from the session token**, not from the header, and write every change to the audit log (append-only).
- `GET` returning 404 is read as `null` (e.g. no diagnostic results yet).
- Personal data reaches the UI already masked (`MaskedField`). Tokens, cost, retries per call and model are only served by `/internal/**`.

## Endpoints

| Method | Path | Returns | Notes |
| --- | --- | --- | --- |
| POST | `/auth/login` `{email,password}` | `User` | Demo: any credentials |
| POST | `/auth/sso/{google\|microsoft}` | `User` | |
| GET | `/users/{userId}/viewer` | `Viewer` | Orgs the user can open (all for GeminAI staff) |
| GET | `/orgs/{org}` | `Organization` | phase, €/h rate, retention, paying… |
| GET | `/orgs/{org}/entities` | `OrgEntity[]` | Org → companies (NIF) → centers/departments, phase per area |
| PATCH | `/orgs/{org}/settings` | `Organization` | `OrgSettingsInput` |
| PUT | `/orgs/{org}/phase` `{phase}` | `Organization` | Internal/demo only |
| GET | `/orgs/{org}/features` | `FeatureFlags` | Roadmap toggles |
| PUT | `/orgs/{org}/features/{key}` `{enabled}` | `FeatureFlags` | |
| GET | `/orgs/{org}/home` | `HomeSummary` | attention counts, KPIs, last 10 runs, next opportunity |
| GET | `/orgs/{org}/onboarding` | `OnboardingState` | |
| PUT | `/orgs/{org}/onboarding/company` | `OnboardingState` | `CompanyDetails` (same fields as /contract) |
| POST | `/orgs/{org}/onboarding/steps/{step}/complete` | `OnboardingState` | `contracts` signs pilot + DPA; `done` starts the diagnostic |
| GET | `/orgs/{org}/devices` | `Device[]` | No employee personal data |
| PUT | `/orgs/{org}/devices/{id}/capture` `{enabled}` | `Device` | |
| GET | `/orgs/{org}/tracker/download` | `{windowsUrl, macUrl, enrollmentCode, version}` | Installer pre-linked to the org |
| GET/POST | `/orgs/{org}/block-rules` | `BlockRule[]` / `BlockRule` | app, URL or category; `analyze` true/false |
| PUT/DELETE | `/orgs/{org}/block-rules/{id}` | `BlockRule` / 204 | |
| GET | `/orgs/{org}/transparency` | `TransparencyInfo` | Public page for monitored employees |
| GET | `/orgs/{org}/diagnostics` | `Diagnostic[]` | initial / expansion / review |
| GET | `/orgs/{org}/diagnostics/current/progress` | `DiagnosticProgress \| 404` | Day X of 21, daily activity **by team**, silent devices |
| GET | `/orgs/{org}/diagnostics/{id\|latest}/results` | `DiagnosticResults \| 404` | `preliminary` while capturing |
| GET | `/orgs/{org}/opportunities` | `Opportunity[]` | |
| GET | `/orgs/{org}/agents?mode=&area=` | `Agent[]` | |
| GET | `/orgs/{org}/agents/{id}` | `Agent` | |
| POST | `/orgs/{org}/agents/{id}/pause` `{reason}` | `Agent` | |
| POST | `/orgs/{org}/agents/{id}/resume` | `Agent` | Back to the mode before the pause |
| POST | `/orgs/{org}/agents/{id}/promote` | `Agent` | Shadow → Supervised, recorded approval |
| GET | `/orgs/{org}/agents/{id}/shadow` | `ShadowReport` | criterion 95 % over 30 (provisional) |
| GET | `/orgs/{org}/agents/{id}/performance` | `AgentPerformance` | weekly buckets |
| GET | `/orgs/{org}/runs?agentId=&status=&limit=` | `Run[]` | |
| GET | `/orgs/{org}/runs/{id}` | `RunDetail` | steps: system, action, decision, reason, retries, masked data |
| GET | `/orgs/{org}/rules?agentId=` | `LearnedRule[]` | Knowledge layer per client |
| PATCH/DELETE | `/orgs/{org}/rules/{id}` | `LearnedRule` / 204 | |
| GET | `/orgs/{org}/questions?status=&agentId=&assignedTo=` | `Question[]` | questions, exceptions, approvals |
| GET | `/orgs/{org}/questions/{id}` | `Question` | |
| POST | `/orgs/{org}/questions/{id}/answer` `{value, applyAlways}` | `Question` | `applyAlways` creates a `LearnedRule` |
| PUT | `/orgs/{org}/questions/{id}/assignee` | `Question` | `Assignee` (user or role) |
| GET | `/orgs/{org}/contracts` | `Contract[]` | per company |
| POST | `/orgs/{org}/contracts/{id}/sign` | `Contract` | e-signature tool TBD |
| GET | `/orgs/{org}/billing` | `BillingOverview \| 404` | Plan components come from data, never hard-coded |
| GET/POST | `/orgs/{org}/users` | `User[]` / `User` | invite `{email,name,role,scopeEntityId}` |
| PUT | `/orgs/{org}/users/{id}/membership` | `User` | role + scope per center/department |
| GET/PUT | `/orgs/{org}/users/{id}/notifications` | `NotificationPrefs` | event × channel matrix |
| GET | `/orgs/{org}/audit?type=&agentId=&actorId=&from=&to=&q=` | `AuditEvent[]` | insert-only |
| GET/POST | `/orgs/{org}/service-requests` | `ServiceRequest[]` / `ServiceRequest` | "Ampliar servicio" → CRM opportunity |
| GET | `/internal/orgs/{org}/costs` | `InternalCosts` | GeminAI staff only |

## Still open (from the spec)

Auth provider (own / Supabase / Clerk), analytics dashboard as component vs embed, e-signature tool, URL blocking in the contract, question channel without tracker, shadow exit criterion (95 %/30 provisional).
