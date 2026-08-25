"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./layout.module.css";

const LINKS = [
  { href: "/diagnose", label: "Diagnose a failure" },
  { href: "/dashboard", label: "Dashboard" },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Client component so it can read the current path (usePathname) and mark
 * the matching link with aria-current="page" — the surrounding header lives
 * in the async server-component root layout, which can't use hooks. */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className={styles.nav}>
      {LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
