import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { WidthContainer } from "@/app/(app)/_components/WidthContainer";
import { MobileNav } from "@/app/(app)/_components/MobileNav";
import { NavLink } from "@/app/(app)/_components/NavLink";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isAdmin = session.user.role === "ADMIN";

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <WidthContainer>
      <header className="sticky top-0 z-10 -mx-4 mb-6 border-b border-white/10 bg-(--color-ink)/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-4">
          <MobileNav isAdmin={isAdmin} signOutAction={signOutAction} />

          <Link href="/dashboard" className="font-semibold">
            📺 TV Tracker
          </Link>

          <div className="hidden flex-1 items-center gap-4 sm:flex">
            <nav className="flex items-center gap-4 text-sm">
              <NavLink href="/dashboard">Up Next</NavLink>
              <NavLink href="/series">Series</NavLink>
              <NavLink href="/movies">Films</NavLink>
              <NavLink href="/explore">Verken</NavLink>
              <NavLink href="/import">Import</NavLink>
              <NavLink href="/settings">Instellingen</NavLink>
              {isAdmin && <NavLink href="/admin/invites">Uitnodigen</NavLink>}
            </nav>
            <form action="/search" method="get" className="ml-auto flex items-center gap-2">
              <input
                name="q"
                placeholder="Zoek series & films…"
                aria-label="Zoeken"
                className="w-40 rounded-lg border border-white/10 bg-(--color-panel) px-3 py-1.5 text-sm outline-none focus:w-52 focus:border-(--color-accent)"
              />
            </form>
            <form action={signOutAction}>
              <button className="text-sm text-(--color-muted) hover:text-white">
                Uitloggen
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
      <footer className="mt-16 border-t border-white/10 pt-6 text-xs text-(--color-muted)">
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:text-white"
        >
          {/* Verplichte TMDB-bronvermelding; klein embleem, plain <img> zodat
              w-auto op de SVG de juiste verhouding houdt. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tmdb.svg" alt="TMDB" className="h-4 w-auto" />
          <span>
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </span>
        </a>
      </footer>
    </WidthContainer>
  );
}
