# Deploying Ngwathe Connect

## Recommended host: Lovable (Cloudflare Workers)

The app is a TanStack Start SSR application already configured to build for the
Cloudflare Workers edge runtime. The simplest reliable path is to publish from
Lovable — backend (database, auth, server functions) deploys automatically and the
frontend goes live when you publish. No build configuration is required.

Published URLs:

- Public + community app: `https://ngw-connect-ai.lovable.app`
- Admin system: `https://ngw-connect-ai.lovable.app/admin`

## Self-hosting from GitHub

Any host that can run a Node/edge SSR build works. Cloudflare Workers/Pages is the
tested target.

```
Install command:  bun install     (or npm ci)
Build command:    bun run build   (or npm run build)
Output:           .output/        (Nitro server build)
Node version:     20 (see .nvmrc)
```

### Steps

1. Push the repository to GitHub (Lovable's GitHub sync does this in one click).
2. Create a project on your host and point it at the repo.
3. Set the build/install commands above.
4. Add the environment variables below as **project secrets**.
5. Deploy. CI (`.github/workflows/ci.yml`) lints, typechecks and builds every push and PR.

### Environment variables

Browser-visible:

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```

Server-only secrets (never commit, never prefix with `VITE_`):

```
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_PROJECT_ID
LOVABLE_API_KEY
```

Optional WhatsApp channel: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`.

## Database

Schema, RLS policies, audit triggers and seed reference data (19 wards, 10 towns,
service categories) live in `supabase/migrations/` and are applied in order. When
self-hosting against your own Supabase project, run them with the Supabase CLI:

```bash
supabase link --project-ref <ref>
supabase db push
```

## Post-deployment checklist

1. Visit `/auth`, register the first staff account, confirm the email, sign in — it
   becomes the administrator.
2. In **Access control**, create roles for switchboard operators, supervisors and
   technicians, and link technicians to their personnel records.
3. Confirm a technician account sees only their own job cards.
4. Log a test fault from `/app/report` and dispatch it from `/admin/switchboard`.
5. Check `/admin/audit` shows the create/update entries and that the CSV and PDF
   exports download.
6. Install the PWA on a phone from the community app to verify the manifest and icons.

## Custom domain

Publish first, then attach the municipality's domain (for example
`connect.ngwathe.gov.za`) in your host's domain settings and update DNS as instructed.
