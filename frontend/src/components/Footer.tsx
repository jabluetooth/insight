import Link from "next/link";
import styles from "./Footer.module.css";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const SITE_LINKS: FooterLink[] = [
  { label: "Diagnose a failure", href: "/diagnose" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Sign in", href: "/signin" },
  { label: "View source", href: "https://github.com/jabluetooth/insight", external: true },
];

const ELSEWHERE_LINKS: FooterLink[] = [
  { label: "GitHub", href: "https://github.com/jabluetooth", external: true },
  { label: "LinkedIn", href: "https://ph.linkedin.com/in/filheinzrelatorre", external: true },
  { label: "Instagram", href: "https://www.instagram.com/fil.tower", external: true },
  { label: "Portfolio", href: "https://www.filheinzrelatorre.com/", external: true },
];

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className={styles.column}>
      <h2 className={styles.columnTitle}>{title}</h2>
      <ul className={styles.columnList}>
        {links.map((link) => (
          <li key={link.href}>
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                {link.label}
              </a>
            ) : (
              <Link href={link.href} className={styles.link}>
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * App-wide footer, rendered once from the root layout. Two-panel layout
 * (accent brand card + glass link card) — same structural idea as a
 * shadcn/Tailwind footer template this was adapted from, rebuilt against
 * Insight's own CSS Modules design-token system instead of Tailwind: the
 * accent panel reuses the same primary gradient + dark contrast text as
 * every pill button (.primaryCta, .stepNumber), and the link panel reuses
 * the same glass-card recipe as every other card in the app.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandPanel}>
          <div>
            <span className={styles.wordmark}>Insight</span>
            <p className={styles.tagline}>
              An AI root-cause copilot for n8n workflow failures.
            </p>
          </div>
          <div>
            <p className={styles.disclosure}>
              All diagnosis logic runs in an n8n workflow; this site is a
              thin, stateless front end that forwards your request there and
              renders what comes back.
            </p>
            <p className={styles.copyright}>
              &copy; {year} Insight — a portfolio project by Fil Heinz
              Relatorre.
            </p>
          </div>
        </div>

        <nav aria-label="Footer" className={styles.linksPanel}>
          <FooterColumn title="Site" links={SITE_LINKS} />
          <FooterColumn title="Elsewhere" links={ELSEWHERE_LINKS} />
        </nav>
      </div>
    </footer>
  );
}
