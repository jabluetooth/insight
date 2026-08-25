import type { Metadata } from "next";
import { Fraunces, Manrope, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { UserMenu } from "./UserMenu";
import { NavLinks } from "./NavLinks";
import "./globals.css";
import styles from "./layout.module.css";

// Display serif for headings and the confidence-percentage number — used
// with its default (400) weight, occasionally italic for emphasis. Fraunces
// was picked over Instrument Serif (the reference design's signature face)
// specifically to avoid duplicating it; its variable optical-size axis also
// gives crisper rendering at the small sizes headings use here.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

// UI sans for body copy, labels, and buttons — a more distinctive
// alternative to the previous Geist Sans default, still highly legible at
// small form-label sizes.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

// Kept from the previous system for data/code values (execution IDs, API
// tokens, JSON, suggested-fix snippets) — no reason to change what already
// reads well as tabular/code text.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Insight — AI root-cause copilot for n8n workflows",
  description:
    "Paste a failed n8n execution and get a plain-English root-cause diagnosis in seconds — no account required.",
};

export const viewport = {
  themeColor: "#05080a",
  colorScheme: "dark" as const,
};

// Root layout renders the single, app-wide glass header — including the
// signed-in user's account menu (UserMenu: avatar trigger, name/email,
// Settings link, sign-out) when there's a session. This used to be
// duplicated: dashboard/layout.tsx rendered its own second glass topbar,
// which stacked visually on every /dashboard/* route. Consolidating here
// means dashboard/layout.tsx goes back to being just the auth gate (see the
// comment there) plus a content wrapper.
//
// Calling auth() here makes every route render dynamically (it reads the
// session cookie), same as dashboard/layout.tsx already did before this
// change — acceptable given the JWT session strategy (no DB hit per the
// comment in src/lib/auth.ts).
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${manrope.variable} ${geistMono.variable}`}
      style={{ colorScheme: "dark" }}
    >
      <body>
        <a href="#main-content" className={styles.skipLink}>
          Skip to main content
        </a>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <Link href="/" className={styles.brand}>
              Insight
            </Link>
            <div className={styles.headerRight}>
              <NavLinks />
              {session?.user && (
                <UserMenu
                  name={session.user.name ?? null}
                  email={session.user.email ?? null}
                  image={session.user.image ?? null}
                  signOutAction={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                />
              )}
            </div>
          </div>
        </header>
        <main id="main-content">{children}</main>
        <footer className={styles.footer}>
          <p>
            Insight is a portfolio project — an AI root-cause copilot for n8n
            workflow failures. All diagnosis logic runs in an n8n workflow;
            this site is a thin, stateless front end that forwards your
            request there and renders what comes back.
          </p>
        </footer>
      </body>
    </html>
  );
}
