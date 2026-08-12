-- REFERENCE ONLY — NOT the authoritative migration for these two tables.
--
-- PRD §6.7 describes `connected_instances` and `diagnoses` as "a sketch,
-- not a migration," and per this project's architecture (§6.2a, §6.6) n8n
-- is the sole writer to both — the actual CREATE TABLE for them belongs to
-- the backend build (the "Insight - Manage Instance" and diagnosis
-- pipeline workflows), not to this frontend.
--
-- This file exists only so:
--   1. frontend/src/lib/dashboard-data.ts's column-name assumptions
--      (owner_user_id, base_url, last_polled_at, root_cause_category, etc.)
--      are written down somewhere runnable, not just implied by SQL text
--      buried in that file.
--   2. Someone can stand up a local Postgres and exercise the /dashboard
--      pages against realistic data before the real backend tables exist.
--
-- If/when the backend's own migration lands with different column names,
-- update dashboard-data.ts's queries (and, if useful, this file) to match —
-- this file does not need to be kept in sync as a matter of correctness,
-- only as a matter of convenience for local dev.

CREATE TABLE IF NOT EXISTS connected_instances
(
  id                SERIAL PRIMARY KEY,
  owner_user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label             TEXT NOT NULL,
  base_url          TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active', -- 'active' | 'revoked'
  encrypted_api_key TEXT,   -- AES-256-GCM ciphertext; written by n8n only
  api_key_nonce     TEXT,   -- per-row nonce; written by n8n only
  ingest_token_hash TEXT,   -- hash of the token issued at connect time; used to resolve an inbound push by token
  encrypted_ingest_token TEXT, -- AES-256-GCM ciphertext of the SAME token, iv:tag:ciphertext packed into one string (same format/key as encrypted_api_key); written by n8n only. Needed because auto-installing the error-workflow template (§6.6a) requires Insight to embed a working ingest token in a workflow it authors on the target instance — a one-way hash can verify an inbound token but can't be replayed back out, so the token now needs a reversible copy alongside the irreversible one used for lookup.
  error_workflow_id TEXT,  -- the target instance's own workflow id for the "Insight - Error Workflow Template" Insight created there (§6.6a); NULL until the first workflow on this instance is auto-installed. Reused (not recreated) for every subsequent workflow install on the same instance.
  last_polled_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS diagnoses
(
  id                  SERIAL PRIMARY KEY,
  instance_id         INTEGER REFERENCES connected_instances(id) ON DELETE CASCADE, -- NULL for public paste-page runs
  execution_id        TEXT NOT NULL,
  workflow_id         TEXT,
  workflow_name       TEXT,
  failing_node        TEXT,
  root_cause_category TEXT,
  confidence          REAL,
  explanation         TEXT,
  suggested_fix       TEXT,
  retrieved_pattern_ids TEXT[],
  model               TEXT,
  prompt_tokens       INTEGER,
  completion_tokens   INTEGER,
  cost_usd            NUMERIC(10, 6),
  latency_ms          INTEGER,
  source              TEXT, -- 'push' | 'poll' | 'public' | 'eval'
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The §8 idempotency mitigation: same execution shouldn't be diagnosed twice
-- for the same instance (Error Trigger push + scheduled poll both firing).
CREATE UNIQUE INDEX IF NOT EXISTS diagnoses_instance_execution_uidx
  ON diagnoses (instance_id, execution_id)
  WHERE instance_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS connected_instances_owner_idx ON connected_instances (owner_user_id);
CREATE INDEX IF NOT EXISTS diagnoses_instance_idx ON diagnoses (instance_id, created_at DESC);
