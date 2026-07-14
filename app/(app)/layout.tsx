import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { WidthContainer } from "@/app/(app)/_components/WidthContainer";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isAdmin = session.user.role === "ADMIN";

  return (
    <WidthContainer>
      <header className="sticky top-0 z-10 -mx-4 mb-6 border-b border-white/10 bg-[--color-ink]/90 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <input type="checkbox" id="nav-toggle" className="peer hidden" />

          <Link href="/dashboard" className="font-semibold">
            📺 TV Tracker
          </Link>

          <label
            htmlFor="nav-toggle"
            aria-label="Menu"
            className="ml-auto cursor-pointer rounded-lg px-2 py-1.5 text-lg leading-none text-[--color-muted] hover:text-white sm:hidden"
          >
            ☰
          </label>

          <div className="hidden w-full flex-col gap-3 peer-checked:flex sm:flex sm:w-auto sm:flex-1 sm:flex-row sm:items-center sm:gap-4">
            <nav className="flex flex-col gap-3 text-sm text-[--color-muted] sm:flex-row sm:items-center sm:gap-4">
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
              <Link href="/settings" className="hover:text-white">
                Instellingen
              </Link>
              {isAdmin && (
                <Link href="/admin/invites" className="hover:text-white">
                  Uitnodigen
                </Link>
              )}
            </nav>
            <form action="/search" method="get" className="flex items-center gap-2 sm:ml-auto">
              <input
                name="q"
                placeholder="Zoek series & films…"
                aria-label="Zoeken"
                className="w-full rounded-lg border border-white/10 bg-[--color-panel] px-3 py-1.5 text-sm outline-none focus:border-[--color-accent] sm:w-40 sm:focus:w-52"
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
          </div>
        </div>
      </header>
      {children}
      <footer className="mt-16 border-t border-white/10 pt-6 text-xs text-[--color-muted]">
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
