import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getPrimaryProviderForUser } from "@/lib/auth-data";
import Tag from "@/components/marketing/Tag";

export const metadata: Metadata = {
  title: "Settings",
};

const PROVIDER_LABELS: Record<string, string> = {
  github: "GitHub",
  google: "Google",
};

export default async function SettingsPage() {
  // Auth gate already happened in dashboard/layout.tsx; this call only reads
  // the signed-in user's own info.
  const session = await auth();
  const user = session!.user;

  // The provider isn't on the session/JWT itself (see src/types/next-auth.d.ts
  // — only `id` was added there), so it's a best-effort read straight from
  // Auth.js's own `accounts` table. Non-fatal: if this fails the page still
  // shows name and email.
  let provider: string | null = null;
  try {
    provider = await getPrimaryProviderForUser(user.id);
  } catch {
    provider = null;
  }

  const rows: [string, string][] = [
    ["Name", user.name ?? "—"],
    ["Email", user.email ?? "—"],
    ...(provider ? ([["Signed in with", PROVIDER_LABELS[provider] ?? provider]] as [string, string][]) : []),
  ];

  return (
    <div className="max-w-3xl">
      <Tag>settings</Tag>
      <h1 className="mt-4 text-[clamp(2.25rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.04em]">Account</h1>
      <p className="mt-4 max-w-[52ch] leading-relaxed text-muted">
        Your account details, as provided by whichever service you signed in with.
      </p>
      <dl className="mt-10 border-t border-border">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 border-b border-border py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
            <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{k}</dt>
            <dd className="font-mono text-sm">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
