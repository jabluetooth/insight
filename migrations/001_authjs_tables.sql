-- Auth.js (NextAuth v5) core tables for Insight's authenticated dashboard.
--
-- @auth/pg-adapter (frontend/src/lib/auth.ts) does NOT create or migrate
-- these tables itself — see node_modules/@auth/pg-adapter/src/index.ts,
-- which assumes they already exist and just runs plain SQL against them.
-- This file is that one-time manual migration, run against the same
-- Postgres database referenced by DASHBOARD_DATABASE_URL.
--
-- Schema matches the adapter's expected column names exactly (including
-- camelCase columns, which is why they're double-quoted below — Postgres
-- folds unquoted identifiers to lowercase, and the adapter's queries use
-- the camelCase spelling literally).
--
-- Run once, manually, against the target database:
--   psql "$DASHBOARD_DATABASE_URL" -f migrations/001_authjs_tables.sql
--
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS / ON CONFLICT
-- DO NOTHING is not needed here since these are CREATE TABLE, not seed data).

CREATE TABLE IF NOT EXISTS users
(
  id            SERIAL,
  name          VARCHAR(255),
  email         VARCHAR(255),
  "emailVerified" TIMESTAMPTZ,
  image         TEXT,

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS accounts
(
  id                  SERIAL,
  "userId"            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                VARCHAR(255) NOT NULL,
  provider            VARCHAR(255) NOT NULL,
  "providerAccountId" VARCHAR(255) NOT NULL,
  refresh_token       TEXT,
  access_token        TEXT,
  expires_at          BIGINT,
  id_token            TEXT,
  scope               TEXT,
  session_state       TEXT,
  token_type          TEXT,

  PRIMARY KEY (id),
  UNIQUE (provider, "providerAccountId")
);

-- Not used for session lookups while session: { strategy: "jwt" } is set in
-- frontend/src/lib/auth.ts (see that file's comment for why), but the
-- adapter interface requires the table to exist regardless, and switching
-- back to database sessions later is then just a config change, not a
-- migration.
CREATE TABLE IF NOT EXISTS sessions
(
  id            SERIAL,
  "userId"      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires       TIMESTAMPTZ NOT NULL,
  "sessionToken" VARCHAR(255) NOT NULL,

  PRIMARY KEY (id),
  UNIQUE ("sessionToken")
);

CREATE TABLE IF NOT EXISTS verification_token
(
  identifier TEXT NOT NULL,
  expires    TIMESTAMPTZ NOT NULL,
  token      TEXT NOT NULL,

  PRIMARY KEY (identifier, token)
);

CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts ("userId");
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions ("userId");
