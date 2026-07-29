# Insight — frontend

Next.js (App Router, TypeScript) frontend for [Insight](../README.md), an AI root-cause copilot for n8n workflow failures. This app holds no diagnosis logic of its own — it's a thin client that either forwards requests to the n8n backend or reads already-diagnosed rows straight from Postgres for display.

Live: [insight-azure-five.vercel.app](https://insight-azure-five.vercel.app)

## Pages

| Route | What it does |
|---|---|
| `/` | Landing page. |
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
    diagnose/          # public paste-and-diagnose page
    dashboard/          # authenticated instance management + diagnosis log
    api/                 # thin proxy routes to the n8n backend
    signin/
  components/          # shared UI (e.g. ConfidenceMeter, reused between /diagnose and the dashboard)
  lib/
    auth.ts             # Auth.js v5 config
    dashboard-data.ts   # every read query backing the /dashboard pages
    db.ts               # Postgres connection pooling
    rate-limit.ts
    types.ts
```

## Notes for anyone extending this

- Every dashboard query in `src/lib/dashboard-data.ts` scopes by `owner_user_id` so one signed-in user can never read another's rows — see the comments there before adding a new query.
- `DASHBOARD_DATABASE_URL` is a single read/write connection string used for both Auth.js's own tables and reading `connected_instances`/`diagnoses`; this app's own code never writes to the latter two (see `.env.example` for the full rationale — it's a documented simplification, not an oversight).
