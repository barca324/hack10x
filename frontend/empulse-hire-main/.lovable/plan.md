# IndiaMART IMS — Build Plan

This is a large, multi-module HR system. I'll build it in phases so you can review progress and we don't ship something half-wired. **Phase 1 ships a working app with the core flows**; later phases add integrations (Google Calendar, WhatsApp, email).

---

## Phase 1 — Foundation + Core App (this turn)

**Backend (Lovable Cloud / Supabase)**
- Enable Lovable Cloud
- Create all tables: `engineering_levels`, `allowed_users`, `candidates`, `panelists`, `interviews`, `panelist_slot_offers`, `manual_interventions`, `hr_panelist_mapping`, `availability_log`, `notifications`, `audit_logs`
- Roles in a separate `user_roles` table (admin/hr/panelist) + `has_role()` security-definer function
- RLS on every table
- Seed E0–E7 levels

**Auth**
- Google OAuth (via Lovable Cloud) + email/password fallback
- On login, check `allowed_users` → branded "Access Denied" if missing
- Role-based redirect

**Design system**
- IndiaMART orange `#F37021` primary, slate `#1E293B` sidebar, Inter font
- Tokens in `src/styles.css`, semantic Tailwind classes
- Editable logo placeholder component

**Pages (Phase 1 scope)**
1. Dashboard — stat cards, Recharts (interviews/day, status donut, by level), today's interviews table, manual-intervention alert
2. Candidates — table, filters, add/edit slide-over, bulk CSV upload (with column-mapping preview), detail page with round timeline
3. Panelists — table, filters, add/edit, bulk upload, detail page (calendar slots will be **mocked** in Phase 1), interview history
4. Interviews — full history table, filters, detail view, HR result actions (Selected / Rejected / Move to Next Round → triggers new schedule)
5. Schedule Interview — 5-step wizard with the round-robin algorithm, panelist eligibility filter (panelist.level > candidate.level), unavailability reason capture, manual-intervention flag when no panelists available
6. My Feedback (panelist) — Upcoming/Past tabs, PDF upload
7. Notifications & Manual Interventions — both tabs, "Take Action" deep-links to wizard
8. Admin Panel — 5 tabs (HR users, panelists access, HR↔Panelist mapping, levels/roles config, audit logs)
9. Public candidate slot-selection page `/select-slot/$token` (no login, 48h expiry, panelist names hidden)
10. Access Denied page

**Round-robin algorithm**
- Implemented as a `createServerFn` with `requireSupabaseAuth`
- Filters by HR's mapped pool (admin sees all), `panelist.level > candidate.level`, active only
- Sort by `last_interview_date ASC`, then `total_interviews ASC`
- Returns top 3 with mocked free slots in Phase 1

**Notifications (Phase 1)**
- In-app notifications written to DB + toast feedback
- Email/WhatsApp wired in Phase 2

---

## Phase 2 — Integrations (next turn, after Phase 1 review)
- Google Calendar API (real free/busy + auto-create events)
- Resend email for all 7 trigger points
- Twilio WhatsApp toggle
- ICS calendar invites

## Phase 3 — Polish
- Audit logging coverage on every mutation
- Skeleton loaders everywhere
- CSV template downloads
- Saved filters

---

## Technical notes
- React + TanStack Start, Tailwind v4, shadcn, Recharts, React Hook Form + Zod, Lucide
- All server logic via `createServerFn` (no Edge Functions)
- Roles in `user_roles` table — never on profile (security)
- Public slot-selection page uses a server route `/api/public/select-slot/$token` for the POST

This Phase 1 alone is a substantial build (≈25–35 files). Approve and I'll ship it.
