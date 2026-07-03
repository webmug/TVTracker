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
      <header className="sticky top-0 z-10 -mx-4 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 bg-[--color-ink]/90 px-4 py-3 backdrop-blur">
        <Link href="/dashboard" className="font-semibold">
          📺 TV Tracker
        </Link>
        <nav className="flex items-center gap-4 text-sm text-[--color-muted]">
          <Link href="/dashboard" className="hover:text-white">
            Up Next
          </Link>
          <Link href="/series" className="hover:text-white">
            Series
          </Link>
          <Link href="/movies" className="hover:text-white">
            Films
          </Link>
          <Link href="/explore" className="hover:text-white">
            Verken
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
        <form action="/search" method="get" className="ml-auto flex items-center gap-2">
          <input
            name="q"
            placeholder="Zoek series & films…"
            aria-label="Zoeken"
            className="w-40 rounded-lg border border-white/10 bg-[--color-panel] px-3 py-1.5 text-sm outline-none focus:w-52 focus:border-[--color-accent] sm:w-48"
          />
        </form>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
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
