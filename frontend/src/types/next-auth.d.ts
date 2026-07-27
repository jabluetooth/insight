import type { DefaultSession } from "next-auth";

// Module augmentation: add `id` onto session.user, populated by the
// `session` callback in src/lib/auth.ts from the JWT's `sub` claim (which
// itself is the Auth.js Postgres adapter's `users.id`). Every dashboard
// query scopes by this id as `owner_user_id`.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
