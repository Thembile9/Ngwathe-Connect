# Ngwathe Connect

Service delivery platform for **Ngwathe Local Municipality** — a community reporting app (installable PWA) plus a municipal switchboard, job-card dispatch and audit system.

- **Community app** — `/app`: report faults (water, electricity, roads, waste), track each report, follow the assigned job card, SLA progress and resolution notes.
- **Public site** — `/`, `/notices`, `/track/<reference>`
- **Municipal system** — `/admin`: switchboard dispatch, job cards, complaints, personnel, GIS map, analytics, audit logs, access control.
- **Staff sign in** — `/auth`

## Stack

TanStack Start (React 19 + Vite 8) · Tailwind CSS v4 · TanStack Query/Router · Supabase (Postgres, Auth, RLS) · Leaflet · Recharts · AI triage via the Lovable AI Gateway.

## Local development (VSCode)

```bash
bun install          # or: npm install
cp .env.example .env # fill in your project values
bun run dev          # http://localhost:8080
```

Scripts: `dev`, `build`, `build:dev`, `preview`, `lint`, `format`.

## Environment variables

`VITE_*` values are exposed to the browser; the rest are server-only and must be set as
deployment secrets (never committed). See `.env.example`.

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | client | database + auth access under RLS |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | server | SSR and public server functions |
| `SUPABASE_SERVICE_ROLE_KEY` | server | reference-scoped resident lookups, role administration |
| `LOVABLE_API_KEY` | server | AI categorisation and priority scoring |

## First run — creating the administrator

1. Open `/auth` and register the first staff account (confirm the email).
2. Sign in — the first account automatically receives the **administrator** role.
3. Go to **Access control** to grant roles to further staff and link them to personnel records.

## Roles and permissions

Enforced in the database with Row Level Security, not just in the UI.

| Role | Sees |
| --- | --- |
| `admin` | everything + role assignment |
| `switchboard` | all complaints, job cards, audit logs, notices, personnel |
| `supervisor` | complaints and job cards for **their own department** only |
| `technician` | **only job cards assigned to them** and the linked complaints |
| resident (no account) | can log a complaint; can read only reports whose reference number they hold |

Newly registered accounts have **no access** until an administrator assigns a role.

## Audit trail

Database triggers write an entry to `audit_logs` for every complaint and job card
creation and change (actor, ward, department, status, priority, field-level diff).
`/admin/audit` filters by date range, record type, ward, department and status, and
exports the filtered set as **CSV** or a **branded PDF report**.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Licence

MIT — see [LICENSE](./LICENSE).
