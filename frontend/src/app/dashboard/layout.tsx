import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import AppShell from "@/components/AppShell";

// Authoritative auth gate for every /dashboard/* route (src/proxy.ts is the
// fast first line of defense; this is the one that actually matters — see
// the comment in proxy.ts on why Proxy alone isn't trusted for this).
//
// It also renders the dashboard's own app shell, including the signed-in
// user's account menu. The public pages don't read the session at all, so
// they stay static.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin?callbackUrl=/dashboard");
  }

  return (
    <AppShell
      user={{ name: session.user.name ?? null, email: session.user.email ?? null, image: session.user.image ?? null }}
      signOutAction={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      {children}
    </AppShell>
  );
}
