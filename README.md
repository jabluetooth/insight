# Postmortem

An AI root-cause copilot for n8n workflows — paste a failed execution, get a plain-English diagnosis of which node broke and why, instead of reading raw execution JSON by hand.

Working title, pre-implementation. Full scope, architecture, and eval plan: [PRD-Postmortem.md](PRD-Postmortem.md).

## Frontend ("Insight")

The public-facing frontend lives in [`frontend/`](frontend/) — a Next.js (App Router, TypeScript) app with:

- `/` — a short landing page.
- `/diagnose` — the public "paste-and-diagnose" page (PRD §6.6.1, FR-12): paste an execution ID + your own n8n instance base URL + API key, or upload an exported execution JSON file. Renders the failing node, root-cause category, plain-English explanation, a visually-calibrated confidence indicator (low-confidence results are shown hedged, not with false certainty — PRD §2.1), and the suggested fix when present.
- `/api/diagnose` — a thin server-side proxy (PRD §6.2a) that rate-limits per IP, validates the request shape, and forwards it to the n8n diagnosis pipeline webhook with a shared-secret header. It contains no diagnosis logic of its own — all root-cause analysis happens in the n8n workflow.

### Running locally

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in / confirm N8N_DIAGNOSE_WEBHOOK_URL and N8N_WEBHOOK_SHARED_SECRET
npm run dev                  # http://localhost:3000
```

See [`frontend/.env.example`](frontend/.env.example) for what each environment variable does and where its value must match on the n8n side.
