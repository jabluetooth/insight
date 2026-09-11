"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

/**
 * The single deliberate motion moment on the landing page: hero content
 * (passed as server-rendered children, each marked `data-hero-in`) staggers
 * in on load. Isolated in its own small client component so the rest of
 * `page.tsx` stays a server component — only this wrapper ships JS.
 *
 * Skips the animation entirely under prefers-reduced-motion (checked before
 * any GSAP call runs, not just via a CSS override) and uses
 * useLayoutEffect + gsap.set-before-to so the from-state applies before
 * paint — no flash of fully-visible content before the animation starts.
 */
export function HeroReveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !ref.current) return;

    const targets = ref.current.querySelectorAll<HTMLElement>("[data-hero-in]");
    if (targets.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.set(targets, { opacity: 0, y: 18 });
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.09,
        delay: 0.05,
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
