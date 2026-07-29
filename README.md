# Insight

An AI root-cause copilot for n8n workflow failures. Paste a failed execution — or connect an n8n instance for ongoing monitoring — and get a plain-English diagnosis of which node broke, why, and a suggested fix, instead of reading raw execution JSON by hand.

**Live:** [insight-azure-five.vercel.app](https://insight-azure-five.vercel.app) — try `/diagnose` with no signup required.

Full product spec, architecture rationale, and eval plan: [PRD.md](PRD.md).

## How it works

Insight is two pieces working together:

1. **Frontend** ([`frontend/`](frontend/)) — a Next.js app that's a thin, mostly stateless client. The public `/diagnose` page and the authenticated `/dashboard` (connect an instance, browse its diagnosis history) never run any diagnosis logic themselves; they either forward a request to the n8n backend or read already-diagnosed rows straight from Postgres.
2. **n8n backend** (self-hosted, not in this repo) — a single workflow handling three entry points: the public diagnose webhook, a per-instance push-ingest webhook (fired by a small Error Trigger piece added to a monitored workflow — see [`workflows/`](workflows/)), and instance connect/revoke. The pipeline: fetch the failed execution → redact secrets before it ever reaches an LLM → embed the error text and retrieve similar known patterns from a knowledge base → prompt an LLM (Groq) for a structured diagnosis → store it and alert Slack if confidence clears the threshold.

```
n8n (your monitored workflows)
   │  Error Trigger fires on failure
   ▼
n8n (Insight's backend workflow)
   │  fetch execution → redact → retrieve → diagnose (LLM)
   ▼
Postgres (Neon)  ──read-only──▶  Next.js dashboard (this repo's frontend/)
   │
   ▼
Slack alert (connected-instance mode only)
```

**Current status:** the diagnosis pipeline, public diagnose page, connected-instance dashboard, and Slack alerting are live and working end-to-end. Knowledge-base retrieval (the RAG half of the pipeline) is built but currently disabled pending a seeded Qdrant collection — the LLM diagnoses from the raw error and execution context alone in the meantime. This is called out because the PRD's headline evaluation metric is the accuracy delta *with* retrieval turned on, which is still pending real seed data.

## Repo layout

| Path | What it is |
|---|---|
| [`frontend/`](frontend/) | The Next.js app — see [`frontend/README.md`](frontend/README.md) for local setup. |
| [`workflows/`](workflows/) | Two files a real user imports into *their own* n8n instance to start monitoring it: an Error Trigger template that pushes failures to Insight, and a workflow that fails on command for testing the wiring. See [`workflows/README.md`](workflows/README.md). |
| [`migrations/`](migrations/) | SQL run once against the Postgres database this app and the n8n backend share: Auth.js's own tables, plus `connected_instances` / `diagnoses`. |
| [`PRD.md`](PRD.md) | The full product spec this was built from — problem statement, architecture decisions and why, security model, evaluation plan, and what's deliberately out of scope for v1 (e.g. auto-applying a suggested fix — see PRD §2.2 and §11). |

## Running the frontend locally

```bash
cd frontend
npm install
cp .env.example .env.local   # see the file itself for what each variable does
npm run dev                  # http://localhost:3000
```

The frontend alone is enough to browse the UI, but real diagnosis requests need the n8n backend and Postgres database it depends on — `frontend/.env.example` documents every variable and where its value has to match on the n8n side.

## Connecting your own n8n instance

To get diagnoses on your own workflow failures rather than just the public paste-and-diagnose page:

1. Sign in at `/dashboard` and add your instance (base URL + an n8n API key) to get a per-instance ingest token.
2. Import [`workflows/insight-error-workflow-template.json`](workflows/insight-error-workflow-template.json) into your n8n instance, paste in your ingest token, and point any workflow's **Error Workflow** setting at it.
3. Import [`workflows/insight-test-failure.json`](workflows/insight-test-failure.json) to trigger a failure on demand and confirm the wiring end-to-end.

Full walkthrough: [`workflows/README.md`](workflows/README.md).
