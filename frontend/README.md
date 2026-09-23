# Insight — frontend

Next.js (App Router, TypeScript) frontend for [Insight](../README.md), an AI root-cause copilot for n8n workflow failures. This app holds no diagnosis logic of its own — it's a thin client that either forwards requests to the n8n backend or reads already-diagnosed rows straight from Postgres for display.

Live: [insightby.filheinzrelatorre.com](https://insightby.filheinzrelatorre.com)

## Pages

| Route | What it does |
|---|---|
| `/` | Landing page: animated execution demo, root-cause categories, interactive confidence dial. |
| `/how-it-works` | The pipeline stage by stage (scroll-driven), how monitoring works, and what's live vs. not yet. |
| `/security` | Endpoint allowlist, what goes where, how keys are stored, known limits. |
| `/get-started` | The `npx insight-n8n` CLI, getting an execution's JSON, monitoring an instance, FAQ. |
| `/diagnose` | Public, no-signup "paste a failed execution, get a diagnosis" page. Accepts either an execution ID + your n8n instance details, or an uploaded exported execution JSON file. |
| `/dashboard` | Authenticated (GitHub/Google via Auth.js). Connect an n8n instance, see aggregate diagnosis stats across all of them. |
| `/dashboard/connect` | Register a new instance (base URL + n8n API key) and get back a per-instance ingest token. |
| `/dashboard/instances/[id]` | Diagnosis log for one connected instance. |
| `/dashboard/settings` | Account settings. |

## API routes

- `POST /api/diagnose` — rate-limits per IP, validates the request shape, and forwards to the n8n diagnosis webhook with a shared-secret header. No diagnosis logic here; see [`src/app/api/diagnose/route.ts`](src/app/api/diagnose/route.ts).
- `POST /api/instances/connect`, `POST /api/instances/revoke` — same pattern, forwarding to n8n's manage-instance webhook.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev   # http://localhost:3000
```

`.env.example` documents every environment variable in detail — what it's for, which n8n-side value it has to match, and which OAuth/Postgres setup steps are manual. At minimum you'll need:

- A running instance of Insight's n8n backend (or your own equivalent) and its webhook URLs + shared secret, to make `/diagnose` actually return a diagnosis.
- A Postgres database with [`../migrations/`](../migrations/) applied, for Auth.js and for reading `connected_instances` / `diagnoses`.
- OAuth app credentials (GitHub and/or Google) if you want to exercise `/dashboard` locally — `/diagnose` alone doesn't need auth.

## Project structure

```
src/
  app/
    (marketing)/        # public site: header/footer layout, home, how-it-works, security,
                        # get-started, diagnose (public paste page), signin
    dashboard/          # authenticated app shell + instance management and diagnosis log
    api/                # thin proxy routes to the n8n backend
  components/
    marketing/          # site header/footer, reveal animations, demo, pipeline, confidence dial
    AppShell.tsx        # dashboard chrome
    DiagnosisView.tsx   # one diagnosis, shared by /diagnose and the dashboard log
    confidence.ts       # the confidence tiers' words, icons and colours, in one place
    ui.tsx              # form fields, notices, buttons
  lib/
    auth.ts             # Auth.js v5 config
    dashboard-data.ts   # every read query backing the /dashboard pages
    db.ts               # Postgres connection pooling
    rate-limit.ts
    types.ts
```

## Design

The site follows the same design system as [Relay](https://github.com/jabluetooth/relay): Tailwind CSS v4 with colour tokens in `src/app/globals.css`, Framer Motion for motion, Lucide icons, Geist and Geist Mono. Dark is the designed identity and a light palette follows the OS preference. Motion respects `prefers-reduced-motion` (a `MotionConfig` on both layouts plus a CSS override). Confidence tiers always pair a colour with a word and an icon.

## Notes for anyone extending this

- Every dashboard query in `src/lib/dashboard-data.ts` scopes by `owner_user_id` so one signed-in user can never read another's rows — see the comments there before adding a new query.
- `DASHBOARD_DATABASE_URL` is a single read/write connection string used for both Auth.js's own tables and reading `connected_instances`/`diagnoses`; this app's own code never writes to the latter two (see `.env.example` for the full rationale — it's a documented simplification, not an oversight).
