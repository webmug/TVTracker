import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24">
      <header className="sticky top-0 z-10 -mx-4 mb-6 flex items-center gap-4 border-b border-white/10 bg-[--color-ink]/90 px-4 py-3 backdrop-blur">
        <Link href="/dashboard" className="font-semibold">
          📺 TV Tracker
        </Link>
        <nav className="flex items-center gap-4 text-sm text-[--color-muted]">
          <Link href="/dashboard" className="hover:text-white">
            Up Next
          </Link>
          <Link href="/search" className="hover:text-white">
            Zoeken
          </Link>
          <Link href="/import" className="hover:text-white">
            Import
          </Link>
          {isAdmin && (
            <Link href="/admin/invites" className="hover:text-white">
              Uitnodigen
            </Link>
          )}
        </nav>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="ml-auto"
        >
          <button className="text-sm text-[--color-muted] hover:text-white">
            Uitloggen
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
