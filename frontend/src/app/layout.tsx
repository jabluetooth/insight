import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Data gets its own typeface (node names, execution ids, error text,
// confidence numbers), so it reads as data against the prose around it.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    siteName: "Insight",
    title: "Insight — why your n8n workflow failed",
    description: "The node that broke, the likely root cause, how sure it is, and the fix. Paste an execution or run npx insight-n8n.",
  },
  twitter: { card: "summary_large_image" },
  title: { default: "Insight — why your n8n workflow failed", template: "%s · Insight" },
  description:
    "Paste a failed n8n execution and get the failing node, the root cause, a calibrated confidence score and a suggested fix. No account needed, or try it from your terminal with npx insight-n8n.",
};

// The root layout is chrome-free on purpose: the public site's header and
// footer live in (marketing)/layout.tsx and the dashboard's app shell in
// dashboard/layout.tsx, so marketing pages stay static (no session read).
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
