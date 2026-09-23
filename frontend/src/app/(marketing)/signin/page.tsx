import type { Metadata } from "next";
import Link from "next/link";
import { signIn } from "@/lib/auth";
import Tag from "@/components/marketing/Tag";
import { LineReveal, Rise } from "@/components/marketing/Reveal";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to connect your own n8n instance and see its diagnosis history.",
};

const providerButton =
  "group flex w-full items-center justify-between gap-3 rounded border border-border bg-surface px-5 py-4 text-left transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  // Only same-site paths: "//evil.example" would otherwise be an open redirect.
  const redirectTo = callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/dashboard";

  return (
    <section className="px-[5vw] pt-[clamp(2.5rem,6vw,6rem)]">
      <div className="grid gap-[clamp(2.5rem,5vw,5rem)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
        <div>
          <Rise inView={false}>
            <Tag>sign in</Tag>
          </Rise>
          <LineReveal
            as="h1"
            inView={false}
            delay={0.1}
            className="mt-6 text-[clamp(2.5rem,6vw,6.5rem)] font-semibold leading-[0.95] tracking-[-0.04em]"
            lines={["Watch an", "instance, not", "one failure."]}
          />
          <Rise inView={false} delay={0.4}>
            <p className="mt-8 max-w-[48ch] leading-relaxed text-muted">
              Signing in lets you connect your own n8n instance, pick the workflows to protect, and keep a running log of
              diagnoses with suggested fixes. You only ever see instances you connected yourself.
            </p>
          </Rise>
        </div>

        <Rise inView={false} delay={0.3} y={20}>
          <div className="space-y-3">
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo });
              }}
            >
              <button type="submit" className={providerButton}>
                <span className="flex items-center gap-3">
                  <GitHubIcon />
                  <span className="font-medium">Continue with GitHub</span>
                </span>
                <span aria-hidden="true" className="text-muted transition-transform group-hover:translate-x-1">→</span>
              </button>
            </form>
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo });
              }}
            >
              <button type="submit" className={providerButton}>
                <span className="flex items-center gap-3">
                  <GoogleIcon />
                  <span className="font-medium">Continue with Google</span>
                </span>
                <span aria-hidden="true" className="text-muted transition-transform group-hover:translate-x-1">→</span>
              </button>
            </form>
            <p className="pt-3 text-sm leading-relaxed text-muted">
              Just want to try it?{" "}
              <Link href="/diagnose" className="text-foreground underline decoration-border underline-offset-4 hover:decoration-accent">
                The diagnose page
              </Link>{" "}
              and <span className="font-mono text-foreground">npx insight-n8n</span> need no account.
            </p>
          </div>
        </Rise>
      </div>
    </section>
  );
}

function GitHubIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" width="18" height="18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.61Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.19l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.95 10.69A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.69V4.98H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.02l2.99-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.98l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
    </svg>
  );
}
