"use client";

import { motion } from "framer-motion";

// A typographic wordmark with a status light instead of an icon lockup.
// The dot breathes like an idle monitor LED; it stops under reduced motion
// (MotionConfig / the global CSS rule).
export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={"inline-flex items-baseline font-mono text-sm font-medium tracking-tight " + className}>
      insight
      <motion.span
        aria-hidden="true"
        className="ml-[0.2em] inline-block size-[0.42em] translate-y-[-0.05em] rounded-full bg-accent"
        animate={{ opacity: [1, 0.25, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </span>
  );
}
