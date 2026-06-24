# Onference Event Studio — Solution Notes

**Candidate submission for OnferenceTV**  
**Project:** Event management system for a medical CME platform  
**Stack:** Next.js 16 (App Router) · Fastify · MongoDB · GraphQL · Tailwind CSS v4 · Radix UI · Zustand · Gemini API · Vercel (frontend) · GCP (backend)

---

## 1. Approach

I started with the data model and GraphQL contract before building UI. That gave a stable API surface early: events, attendees, auth, and public read paths were defined in TypeGraphQL resolvers and MongoDB schemas first, then the Next.js client was built against those queries and mutations.

The frontend and backend are fully decoupled. The client talks only to `/graphql` over HTTPS with cookie-based sessions; there is no shared code between repos. That made it straightforward to deploy the UI on Vercel and the API on a GCP VM with a blue-green script.

On the client, the App Router was used for route-based splitting: authenticated dashboards (`/events`, `/my-events`), a public event page (`/events/[slug]`), and auth flows (`/login`) each live in their own segment. Public event pages load data on the server where possible so the first paint is not blocked by client-side CORS or hydration issues.

The product workflow mirrors how a real CME ops team would work: organizers create events in **draft**, submit for **admin approval**, and only **published** events appear on the public site. Attendees RSVP on public pages and see their registrations in a separate portal. Slugs are name-based (e.g. `/events/emergency-medicine-trauma-protocols`) rather than opaque IDs.

---

## 2. Technology Choices

**Next.js 16** — SSR and static generation where they help (metadata, sitemap), simple Vercel deployment, and a mature App Router for layouts and loading states.

**Fastify** — Chosen over Express for lower overhead, built-in plugin model, and cleaner integration with Mercurius for GraphQL. TypeGraphQL keeps resolver types aligned with the schema.

**MongoDB** — Event documents evolve quickly during an assignment (AI fields, slug, organizer linkage, status workflow). A document store avoided migration churn while the schema was still moving.

**GraphQL** — One endpoint for the dashboard, public lookup, and admin flows. Field-level fetching keeps the client from over-fetching on event cards with attendee counts.

**Gemini API (free tier)** — Used in-product to draft event descriptions and speaker intros from structured event metadata. Generation runs server-side so the API key never reaches the browser.

**jsPDF** — Client-side PDF export for event summaries. No server render pipeline required; organizers can download a PDF from the dashboard or public page without adding a PDF service to the backend.

**Tailwind CSS v4 + Radix UI** — Utility-first styling with accessible primitives for dialogs, dropdowns, and forms. Zustand handles lightweight auth and toast state without boilerplate.

**Deployment** — Frontend on Vercel; backend on GCP in Docker with a blue-green deploy script (`deploy-bluegreen.sh`), nginx upstream switching, and GitHub Actions on push to `main`.

**Live demo** — [https://events.orbitalops.net](https://events.orbitalops.net) (API: [https://api-events.orbitalops.net/graphql](https://api-events.orbitalops.net/graphql))

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@orbitalops.net` | `EventAdmin@123` |
| Organizer | `organizer.demo@orbitalops.net` | `Organizer@123` |
| Attendee | `attendee.demo@orbitalops.net` | `Attendee@123` |

---

## 3. Challenges Faced

**Gemini free-tier limits** — Full flash models (`gemini-2.0-flash`, `gemini-flash-latest`) hit 429 quota errors quickly. The fix was a **model fallback chain** that tries flash-lite variants first (separate quota pool), skips 404/unavailable models, and retries transient failures with a short delay. Error messages now distinguish quota exhaustion from invalid keys.

**CORS between Vercel and GCP** — The API uses credentialed cookies for auth. `CORS_ORIGINS` must explicitly list `http://localhost:3000` and the production frontend origin; a mismatch silently breaks login. This was debugged early by checking preflight responses and cookie `SameSite` settings.

**Routing conflict on public events** — An empty `events/[id]` folder alongside `events/[slug]` caused Next.js to return 404 for all public URLs. Removing the stale route and server-side lookup fixed it.

**Slug and approval UX** — Early slug logic appended MongoDB ID suffixes for uniqueness, which broke public URLs when the UI generated clean slugs from event names. Slugs were normalized to name-based values with numeric collision suffixes only when needed (`-2`, `-3`).

**PDF styling** — Initial jsPDF output used hardcoded colors that did not match the dark theme. Layout, typography, and accent colors were adjusted manually to align with the design system.

**GraphQL initialization in production** — `PublicEventLookup` referenced `EventType` before it was defined in the schema file, which crashed ESM builds on the server. Reordering object types resolved a startup failure that only appeared in compiled output.

---

## 4. Error Handling

**Missing required fields** — Validated in dedicated modules (`event.validation.ts`, `auth.validation.ts`) before resolvers mutate data. GraphQL returns clear error messages (e.g. missing speaker name, invalid email) rather than generic 500s.

**Invalid event date** — The create/update forms enforce required date input on the client; the backend validates ISO date strings and rejects malformed payloads at the service layer.

**AI generation failure** — If Gemini is unavailable, returns bad JSON, or quota is exceeded, the mutation surfaces a user-facing message (e.g. quota exceeded, try again later, or type content manually). The event remains saved as draft; generation does not block saving core event fields.

**Database connectivity** — A `/health` endpoint pings MongoDB on each check. Fastify `onReady` connects at startup; failed startup prevents the container from passing deploy health checks. The health handler returns `503` with a degraded status when the database is unreachable.

**Auth** — Unauthenticated GraphQL requests to protected resolvers return `UNAUTHENTICATED`. Role checks (organizer vs admin vs attendee) gate mutations such as approve/reject and organizer-scoped event lists.

---

## 5. AI Usage

**Gemini (in product)** — Generates event descriptions and speaker intros from structured metadata so organizers do not have to write CME copy from scratch.

**Development** — Used for scaffolding resolvers, MongoDB schemas, and component structure. GraphQL return types and PDF styling were manually corrected after reviewing AI output. All architecture decisions, deployment setup, and business logic were made independently.

---

## 6. Future Improvements

- **Security** — Rate limiting on public endpoints, JWT rotation, input sanitization audit.
- **Scale** — Load balancer on GCP, Redis cache for public events, MongoDB indexes on `status` and `date`.
- **SEO** — Richer Open Graph and JSON-LD per event (sitemap and robots already in place).
- **Notifications** — Email on approval/rejection and RSVP confirmations.
- **Monetization** — Paid CME tiers with Stripe.
- **Video** — Tie event pages to OnferenceTV stream/recording URLs.

---

