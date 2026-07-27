import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Next.js 16 renamed `middleware.ts` to `proxy.ts` (functionally the same
// file convention — see node_modules/next/dist/docs/.../proxy.md). Per that
// same doc: "you should not attempt relying on shared modules or globals"
// for Proxy and, more importantly, "Always verify authentication and
// authorization inside each Server Function rather than relying on Proxy
// alone" — a matcher/refactor mistake here must not be the *only* thing
// standing between an unauthenticated request and a /dashboard page.
//
// So this file is a fast, redirect-only first line of defense. The
// authoritative check lives in src/app/dashboard/layout.tsx (calls `auth()`
// again, redirects if there's no session) and in every route handler under
// src/app/api/instances/* (checks `auth()` before doing anything).
//
// Because the session strategy is "jwt" (see src/lib/auth.ts), this check
// is a real signature verification of the session cookie, not a guess — it
// just doesn't hit Postgres, so it's cheap enough to run on every request.
export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const { pathname, search } = req.nextUrl;

  if (!isLoggedIn) {
    const signInUrl = new URL("/signin", req.nextUrl);
    signInUrl.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
