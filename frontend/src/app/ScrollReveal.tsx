"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

/**
 * Scroll-triggered counterpart to HeroReveal, for content below the fold
 * (here: the "How it works" section) — the hero's load-time entrance
 * doesn't cover anything the visitor has to scroll to first. Same
 * stagger/easing values as HeroReveal so the two read as one consistent
 * motion language rather than two different animation styles on one page.
 *
 * Uses a plain IntersectionObserver rather than pulling in GSAP's
 * ScrollTrigger plugin — this only needs a single one-shot "has this
 * entered the viewport yet" check, not scroll-position-linked scrubbing,
 * so the extra plugin weight isn't justified.
 */
export function ScrollReveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !ref.current) return;

    const targets = ref.current.querySelectorAll<HTMLElement>("[data-reveal-in]");
    if (targets.length === 0) return;

    gsap.set(targets, { opacity: 0, y: 18 });

    const node = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          gsap.to(targets, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.09,
          });
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
