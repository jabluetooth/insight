import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Tag from "@/components/marketing/Tag";
import { Rise } from "@/components/marketing/Reveal";
import CodeBlock from "@/components/marketing/CodeBlock";
import { NPM_PACKAGE, NPM_URL, REPO_URL } from "@/lib/site";

const SITE = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/security", label: "Security" },
  { href: "/get-started", label: "Get started" },
  { href: "/diagnose", label: "Diagnose" },
] as const;

const APP = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/connect", label: "Connect" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

const PEOPLE = [
  { href: "https://www.filheinzrelatorre.com/", label: "Portfolio" },
  { href: "https://ph.linkedin.com/in/filheinzrelatorre", label: "LinkedIn" },
  { href: "https://github.com/jabluetooth", label: "GitHub" },
] as const;

// The closing statement, not a link graveyard: one big call to action, the
// one-line terminal alternative, two plain link rows, and an oversized
// wordmark cropped by the page edge.
export default function SiteFooter() {
  return (
    <footer className="relative mt-[clamp(6rem,14vw,14rem)] overflow-hidden border-t border-border">
      <div className="px-[5vw] pt-[clamp(3rem,7vw,7rem)]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
          <Rise>
            <Tag>next</Tag>
            <Link
              href="/diagnose"
              className="group mt-5 flex items-end gap-[0.15em] text-[clamp(2.5rem,7vw,7.5rem)] font-semibold leading-[0.95] tracking-[-0.04em]"
            >
              <span>
                Paste a <span className="whitespace-nowrap">failure</span>
              </span>
              <ArrowUpRight
                className="mb-[0.12em] size-[0.7em] shrink-0 text-accent transition-transform duration-300 group-hover:-translate-y-2 group-hover:translate-x-2"
                aria-hidden="true"
              />
            </Link>
          </Rise>
          <Rise delay={0.1}>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.1em] text-muted">or from your terminal</p>
            <CodeBlock prompt code={`npx ${NPM_PACKAGE} demo`} />
          </Rise>
        </div>

        <div className="mt-[clamp(3rem,6vw,6rem)] grid gap-8 font-mono text-xs uppercase tracking-[0.1em] sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-3">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {SITE.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-muted transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-muted transition-colors hover:text-foreground">
                  Source ↗
                </a>
              </li>
              <li>
                <a href={NPM_URL} target="_blank" rel="noreferrer" className="text-muted transition-colors hover:text-foreground">
                  npm ↗
                </a>
              </li>
            </ul>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {APP.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-muted/70 transition-colors hover:text-foreground">
                    app / {l.label.toLowerCase()}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="max-w-md space-y-3 text-[11px] normal-case leading-relaxed tracking-normal text-muted">
            <p>
              Built by Fil Heinz O. Re La Torre ·{" "}
              {PEOPLE.map((p, i) => (
                <span key={p.href}>
                  <a href={p.href} target="_blank" rel="noreferrer" className="underline decoration-border underline-offset-4 hover:text-foreground">
                    {p.label}
                  </a>
                  {i < PEOPLE.length - 1 ? " · " : ""}
                </span>
              ))}
            </p>
            <p>
              Insight is an independent project. n8n is a trademark of n8n GmbH. Not affiliated with or endorsed by n8n.
            </p>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none mt-[clamp(2rem,4vw,4rem)] select-none whitespace-nowrap px-[2vw] font-mono text-[22vw] leading-[0.78] tracking-[-0.06em] text-foreground/[0.045]"
        style={{ transform: "translateY(16%)" }}
      >
        insight.
      </div>
    </footer>
  );
}
