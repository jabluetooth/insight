import Link from "next/link";
import Wordmark from "@/components/Wordmark";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col justify-between px-[5vw] py-8">
      <Link href="/" aria-label="Insight home" className="w-fit">
        <Wordmark />
      </Link>
      <div className="py-24">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">[ 404 ]</p>
        <h1 className="mt-6 text-[clamp(2.5rem,8vw,7rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
          Nothing ran here.
        </h1>
        <p className="mt-6 max-w-[44ch] leading-relaxed text-muted">
          This page doesn&apos;t exist, or it belongs to an instance you didn&apos;t connect.
        </p>
        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 font-mono text-sm uppercase tracking-[0.06em]">
          <Link href="/" className="underline decoration-border underline-offset-8 hover:decoration-accent">Home</Link>
          <Link href="/diagnose" className="underline decoration-border underline-offset-8 hover:decoration-accent">Diagnose a failure</Link>
          <Link href="/dashboard" className="underline decoration-border underline-offset-8 hover:decoration-accent">Dashboard</Link>
        </div>
      </div>
      <span />
    </main>
  );
}
