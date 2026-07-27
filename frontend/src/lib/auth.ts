import "server-only";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import PostgresAdapter from "@auth/pg-adapter";
import { getDashboardDb } from "./db";

// Auth.js v5 (NextAuth) configuration for the /dashboard "connected
// instance" mode. OAuth-only (GitHub + Google) — no password flow, no
// email/magic-link — since this is a portfolio-scale build and the simple
// ownership model (§ task brief) doesn't need anything beyond "who is this
// signed-in person."
//
// Ownership model: every connected instance and diagnosis is scoped by
// `owner_user_id` = this session's user id. There is no team/role hierarchy
// — a user only ever sees what they personally connected (see
// src/lib/dashboard-data.ts).
//
// Session strategy: explicitly "jwt", even though a database adapter is
// configured. This is a deliberate, standard Auth.js v5 pattern, not an
// oversight:
//   - The adapter is still required and still does real work — it creates
//     `users`/`accounts` rows on first sign-in and links subsequent
//     sign-ins from the same provider account to the same user row. That
//     user id is what `owner_user_id` in Postgres refers to.
//   - With `strategy: "jwt"`, the session itself is a signed, encrypted
//     cookie (`AUTH_SECRET`) rather than a row in the adapter's `sessions`
//     table — so checking "is this request authenticated" never requires a
//     database round-trip. That is what lets src/proxy.ts do a real (not
//     merely optimistic) check on every /dashboard/* request cheaply.
//   - The tradeoff: revoking a session instantly (e.g. "sign out this
//     device remotely") isn't possible the way it would be with database
//     sessions, since the JWT is valid until it expires. Acceptable for
//     this project's scale; noted here so it isn't a silent decision.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(getDashboardDb()),
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    // Carry the adapter-assigned user id onto the JWT, then onto the
    // session, so every Server Component / route handler that calls
    // `auth()` gets `session.user.id` without a separate lookup. This id is
    // the same value used as `owner_user_id` throughout the dashboard.
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
