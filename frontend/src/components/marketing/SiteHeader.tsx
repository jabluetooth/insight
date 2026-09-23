"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";
import Wordmark from "@/components/Wordmark";
import { REPO_URL } from "@/lib/site";

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/security", label: "Security" },
  { href: "/get-started", label: "Get started" },
] as const;

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  // The hairline only appears once content slides under the bar; at the top
  // of the page the header and hero read as one surface.
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  return (
    <header
      className={
        "sticky top-0 z-40 bg-background transition-[border-color] duration-200 " +
        (scrolled || open ? "border-b border-border" : "border-b border-transparent")
      }
    >
      <div className="flex items-center justify-between gap-6 px-[5vw] py-4">
        <Link href="/" aria-label="Insight home">
          <Wordmark />
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {LINKS.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <li key={href} className="relative">
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={
                      "py-1 font-mono text-xs uppercase tracking-[0.1em] transition-colors " +
                      (active ? "text-foreground" : "text-muted hover:text-foreground")
                    }
                  >
                    {label}
                  </Link>
                  {active && (
                    <motion.span
                      layoutId="site-nav-underline"
                      className="absolute -bottom-0.5 left-0 h-0.5 w-full bg-accent"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="hidden px-2 font-mono text-xs uppercase tracking-[0.1em] text-muted transition-colors hover:text-foreground md:inline"
          >
            Dashboard
          </Link>
          <Link
            href="/diagnose"
            aria-current={pathname === "/diagnose" ? "page" : undefined}
            className="inline-flex items-center gap-1.5 rounded bg-accent px-3.5 py-2 font-mono text-xs font-medium uppercase tracking-[0.08em] text-accent-foreground transition-transform hover:-translate-y-px active:scale-95"
          >
            Diagnose
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex size-9 items-center justify-center rounded border border-border text-muted md:hidden"
          >
            {open ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label="Mobile"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="border-t border-border bg-background px-[5vw] pb-6 pt-2 md:hidden"
          >
            <ul>
              {[...LINKS, { href: "/diagnose", label: "Diagnose a failure" }, { href: "/dashboard", label: "Dashboard" }].map(
                ({ href, label }) => (
                  <li key={href} className="border-b border-border">
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={pathname === href ? "page" : undefined}
                      className="block py-4 text-2xl font-semibold tracking-tight"
                    >
                      {label}
                    </Link>
                  </li>
                )
              )}
              <li>
                <a href={REPO_URL} target="_blank" rel="noreferrer" className="block py-4 text-2xl font-semibold tracking-tight">
                  GitHub
                </a>
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
