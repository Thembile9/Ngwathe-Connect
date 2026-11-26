# Ngwathe Municipality AI Service Delivery Platform

This is a large system. I'll build it in 4 phases so each phase is usable on its own. You approve, and I ship Phase 1 in this turn. Later phases run when you're ready.

## Architecture

- **Frontend**: TanStack Start (React 19) + Tailwind v4, mobile-first
- **Backend**: Lovable Cloud (Postgres + storage + server functions)
- **AI**: Lovable AI Gateway (Gemini 3 Flash) for classification, priority scoring, summaries, translation, duplicate detection
- **WhatsApp**: Meta WhatsApp Cloud API via a public webhook (`/api/public/whatsapp`)
- **Maps**: Leaflet + OpenStreetMap (free)
- **Auth**: none in v1 (demo mode) — dashboard is open. I'll structure roles in the DB so we can enable auth later without a rewrite.

## Phase 1 — Foundation, dashboard, resident web chat (this turn)

Deliverables:
1. **Design system** in municipal blue/white with generated Ngwathe-style crest (swap-in later).
2. **Database schema**: `wards`, `towns`, `categories`, `subcategories`, `complaints`, `complaint_events`, `attachments`, `notifications`, `subscriptions`, `officials`, `roles` (structure only, no auth yet).
3. **Public landing** at `/` — municipal home with "Report an issue" CTA, contact info, service categories, latest notices.
4. **Resident chat** at `/chat` — WhatsApp-style guided flow: welcome menu → category → subcategory → details → location → photo upload → confirmation with reference number (`NGW-2026-000145` format).
5. **Admin dashboard** at `/admin`:
   - Overview: total/open/closed/critical, avg resolution time, charts (by dept, by ward, monthly trend)
   - Complaints table with filters (ward, dept, priority, status, date, search)
   - Complaint detail: timeline, notes, status changes, attachments, assign/reassign
   - GIS map with colour-coded pins per department
   - Analytics page with exportable reports (PDF/CSV)
   - Notices management (create/publish notices to residents)
6. **AI on submission**: server function runs Gemini on the complaint text to auto-categorise, set priority (Critical/High/Medium/Low), and generate a short summary.
7. **Reference numbers** + **track complaint** page (`/track/:ref`).
8. **Seed data**: real Ngwathe wards/towns (Parys, Vredefort, Heilbron, Koppies, Edenville, Tumahole, Schonkenville, Mokwallo), sample complaints for demo.

## Phase 2 — Meta WhatsApp integration

- Webhook route `/api/public/whatsapp` (verify token + signature).
- Interactive list/button messages mirroring the full menu tree.
- Media handling (photo/voice/location) → uploaded to Lovable Cloud storage.
- Push notifications: send templated messages to opted-in residents by ward/town.
- Requires from you: Meta App ID, Phone Number ID, System User token, Verify token, App Secret (I'll request them securely at Phase 2 start).

## Phase 3 — Advanced AI & ops

- Duplicate complaint detection (embeddings on new complaints vs open ones nearby).
- Hotspot prediction (cluster analysis by geo + type + time).
- Multi-language: English / Sesotho / isiZulu / Afrikaans (auto-detect + reply in same language).
- Abusive language detection + escalation.
- Estimated resolution time based on historical avg per category/ward.
- Live agent handoff: officials chat inside dashboard, replies sent back to WhatsApp.

## Phase 4 — Security & auth

- Enable Lovable Cloud auth (email+password + Google) with the `user_roles` pattern.
- Role gates: Super Admin, Municipal Manager, Director, Dept Manager, Supervisor, Agent, Comms, Technician, Councillor, Read-only.
- Audit log table + 2FA (TOTP).
- POPIA notice + consent tracking on chat.

## What Phase 1 will NOT do

- Real WhatsApp delivery (Phase 2)
- Multi-language AI (Phase 3)
- Authentication / login (Phase 4)
- Email/SMS out (Phase 2/3)

## After you approve

I'll enable Lovable Cloud, generate the crest + hero imagery, create the schema and seed data, and ship Phase 1 end-to-end in the next turn. Then we tackle Phase 2 (I'll ask for the Meta credentials at that point).
