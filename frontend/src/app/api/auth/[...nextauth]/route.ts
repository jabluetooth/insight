import { handlers } from "@/lib/auth";

// Auth.js's own catch-all route — handles the OAuth redirect dance
// (/api/auth/signin/github, /api/auth/callback/github, /api/auth/session,
// /api/auth/signout, etc). This is Auth.js's own well-known contract, not a
// custom endpoint of ours, so it stays a one-line re-export.
export const { GET, POST } = handlers;
