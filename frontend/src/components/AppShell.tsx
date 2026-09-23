"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, MotionConfig } from "framer-motion";
import { LayoutDashboard, PlugZap, Settings, ArrowUpRight } from "lucide-react";
import Wordmark from "@/components/Wordmark";
import { UserMenu } from "@/components/UserMenu";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/connect", label: "Connect", icon: PlugZap },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/instances");
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface User {
  name: string | null;
  email: string | null;
  image: string | null;
}

// The product keeps a persistent app shell; the public site has its own
// header and footer. Solid surface and a hairline, no blur or glow.
export default function AppShell({
  user,
  signOutAction,
  children,
}: {
  user: User;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-full flex-1 flex-col">
        <a
          href="#app-main"
          className="sr-only z-50 rounded bg-accent px-3 py-2 font-mono text-xs text-accent-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-2.5 sm:px-6">
          <Link href="/" aria-label="Insight home">
            <Wordmark />
          </Link>

          <nav aria-label="Dashboard" className="min-w-0">
            <ul className="flex items-center gap-0.5 rounded border border-border bg-background p-0.5">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      aria-label={label}
                      className={
                        "relative flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors sm:px-3 " +
                        (active ? "text-accent-foreground" : "text-muted hover:text-foreground")
                      }
                    >
                      {active && (
                        <motion.span
                          layoutId="app-nav-active"
                          className="absolute inset-0 rounded bg-accent"
                          transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        />
                      )}
                      <Icon className="relative z-10 size-3.5 shrink-0" aria-hidden="true" />
                      <span className="relative z-10 hidden sm:inline">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/diagnose"
              className="hidden items-center gap-1 font-mono text-xs uppercase tracking-[0.08em] text-muted transition-colors hover:text-foreground md:inline-flex"
            >
              Diagnose <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
            <UserMenu name={user.name} email={user.email} image={user.image} signOutAction={signOutAction} />
          </div>
        </header>

        <main id="app-main" className="min-w-0 flex-1 px-[5vw] pb-[clamp(4rem,8vw,8rem)] pt-[clamp(2rem,4vw,4rem)]">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </MotionConfig>
  );
}
