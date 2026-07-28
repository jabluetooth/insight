import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import styles from "./dashboard.module.css";

// Authoritative auth gate for every /dashboard/* route (src/proxy.ts is the
// fast first line of defense; this is the one that actually matters — see
// the comment in proxy.ts on why Proxy alone isn't trusted for this).
//
// This layout no longer renders its own topbar — the signed-in user's email
// and sign-out control live in the root layout's header now (src/app/layout.tsx),
// so there's exactly one glass header instead of two stacked on every
// /dashboard/* route.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin?callbackUrl=/dashboard");
  }

  return (
    <div className={styles.shell}>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
