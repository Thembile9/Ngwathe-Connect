# Refactor notes

- Restored the source layout expected by TypeScript, Vite and the generated TanStack route tree. Preserved the existing routes and business logic.
- Removed byte-identical duplicate files; consolidated the README and retained route guidance and original plan.
- Restored missing GIS route using the existing Leaflet component, control-room access check and Supabase RLS. Map loads only in the browser and excludes invalid coordinates.
- Replaced missing asset imports with existing icon and gradient fallback.
- Restored dotfiles and CI location. Removed the supplied environment file and Git metadata from the distributable archive; configure your own `.env`. Review the original repository history for exposed secrets and rotate any exposed server credentials.
- WhatsApp POST now rejects requests if its signature secret is absent; environment documentation now matches Meta Cloud API rather than Twilio.
- Updated Node guidance for Vite 8. Kept original dependency versions and Bun lockfile.

## Verification

Run `node scripts/check-structure.mjs` (no dependencies required). This checks local imports, PWA icons, unique migration versions and absence of bundled `.env`. Dependency installation was blocked by DNS/network access to the npm registry in the editing environment. Full typecheck, lint, build, browser tests and Supabase integration tests have not been run. Do not deploy to production until these pass.

## Manual QA on a test Supabase project

1. Configure `.env` from `.env.example`; verify migrations against a fresh test database, never blindly against production.
2. Start the app and open `/`, `/chat`, `/app/report`, `/track` and `/auth`.
3. Submit a complaint and verify its reference and tracking status.
4. Sign in with test staff accounts; verify admin, switchboard, supervisor and technician permissions, including direct URL and database access.
5. Dispatch a job, update its status, inspect audit logs and export CSV/PDF.
6. Open `/admin/map` with and without permission; verify map markers and complaint links.
7. Test signed and unsigned WhatsApp requests, PWA installation and mobile layout.
8. Review first-admin bootstrap and public report access policies before exposing a real municipal database.
