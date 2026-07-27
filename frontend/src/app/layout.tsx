import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import styles from "./layout.module.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Insight — AI root-cause copilot for n8n workflows",
  description:
    "Paste a failed n8n execution and get a plain-English root-cause diagnosis in seconds — no account required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
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
