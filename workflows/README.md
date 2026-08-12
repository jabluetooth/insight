# Test workflows for connecting an n8n instance to Insight

## The normal path: "Add workflow" (automatic)

As of the auto-install flow, you don't need any of this. From `/dashboard`:

1. **Connect your instance** (`+ Add instance`) — submit your instance's base URL and an API key. Insight now needs write access to this key (see PRD §5), not just read access: connecting an instance still only registers it, but adding a workflow (next step) creates and activates a workflow on your instance.
2. Insight lists every workflow on that instance and flags which ones aren't monitored yet.
3. Click **Add workflow** next to the one you want protected. Insight creates and activates "Insight - Error Workflow Template" on your instance (reused for every subsequent workflow you add on the same instance), and points the target workflow's own **Error Workflow** setting at it — all in one call, no manual n8n editing.

Everything below this point is the **manual fallback** — useful if you want to see exactly what gets created, if your instance can't grant write access, or if you're testing the pipeline standalone.

## Manual fallback

Two workflows for exercising the full push-diagnosis path end to end (FR-1a), meant to be imported into **your own** n8n instance — not Insight's backend instance.

- `insight-error-workflow-template.json` — the piece every monitored production workflow needs: an Error Trigger that POSTs the failure to Insight's ingest webhook. This is the exact workflow Insight's auto-install creates on your behalf — importing it by hand produces the same result, minus the automation.
- `insight-test-failure.json` — a workflow that fails on command, so you have something to trigger without waiting for a real production bug.

### Setup

1. **Connect your instance first.** In Insight, sign in → `/dashboard` → **+ Add instance** → submit your instance's base URL and an API key. On success you'll get an **ingest token** — copy it now, it's shown once (Insight also keeps an encrypted copy of its own, for the automatic path above).
2. **Import both files** into your n8n instance: n8n's editor → **Import from File** (top-right menu) → select `insight-error-workflow-template.json`, repeat for `insight-test-failure.json`.
3. **Paste your ingest token.** Open the imported "Insight - Error Workflow Template" workflow → the "Push Failure To Insight" node → find `"ingestToken": "REPLACE_WITH_YOUR_INGEST_TOKEN"` in the JSON body field → replace the placeholder with the real token from step 1. Save.
4. **Point the test workflow's Error Workflow at the template.** Open "Insight - Test Failure (Intentional)" → workflow settings (⋯ menu → Settings) → **Error Workflow** → select "Insight - Error Workflow Template" → save. This has to be a manual step after import — n8n assigns each workflow a new ID on import, so the file can't pre-wire this reference.
5. **Activate the error-workflow template** (the toggle in the top-right) — n8n only fires a workflow's configured Error Workflow if that error workflow itself is active. The test-failure workflow itself does *not* need to be active to be run manually.

### Running the test

Open "Insight - Test Failure (Intentional)" and click **Execute Workflow**. It throws immediately, which triggers "Insight - Error Workflow Template", which POSTs to Insight's ingest webhook. From there:

1. Insight looks up your instance by the ingest token.
2. It calls back into your instance's REST API to fetch the full execution data (this is why your instance needs to be reachable from the internet, not just `localhost`).
3. It redacts, retrieves matching knowledge-base patterns, and generates a diagnosis, tagged with the failing workflow's id/name.
4. The result appears in Insight's Slack alert (if configured) and on `/dashboard/instances/<your-instance-id>` — the diagnosis log page.

### If nothing shows up

- Double-check the ingest token was pasted correctly (no extra whitespace) and the workflow was saved.
- Confirm "Insight - Error Workflow Template" is **active**.
- Confirm your n8n instance's base URL is actually reachable from the public internet.
- Confirm your n8n instance's Code-node sandbox allows the `crypto` built-in module (`NODE_FUNCTION_ALLOW_BUILTIN=crypto` or `N8N_RUNNERS_ALLOW_BUILTIN=crypto`, depending on your n8n version) — Insight's own backend needs this for API-key and ingest-token encryption/decryption, and newer n8n versions running Code nodes through the external task runner disallow it by default.
- This also depends on Insight's own backend workflows (the diagnosis pipeline and manage-instance workflow) being active and correctly configured on Insight's side.
