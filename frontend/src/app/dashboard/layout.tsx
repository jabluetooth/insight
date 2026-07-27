import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import styles from "./dashboard.module.css";

// Authoritative auth gate for every /dashboard/* route (src/proxy.ts is the
// fast first line of defense; this is the one that actually matters — see
// the comment in proxy.ts on why Proxy alone isn't trusted for this).
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
      <div className={styles.topBar}>
        <nav className={styles.topBarNav} aria-label="Dashboard">
          <Link href="/dashboard" className={styles.topBarLink}>
            My instances
          </Link>
        </nav>
        <div className={styles.topBarUser}>
          <span className={styles.userEmail}>{session.user.email ?? session.user.name}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className={styles.signOutButton}>
              Sign out
            </button>
          </form>
        </div>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
