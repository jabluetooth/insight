import type { Metadata } from "next";
import { Fraunces, Manrope, Geist_Mono } from "next/font/google";
import Link from "next/link";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
            <nav aria-label="Main">
              <Link href="/diagnose" className={styles.navLink}>
                Diagnose a failure
              </Link>
              <Link href="/dashboard" className={styles.navLink}>
                Dashboard
              </Link>
            </nav>
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
