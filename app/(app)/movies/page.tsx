import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getWatchlistMovies, getWatchedMoviesPage, PAGE_SIZE } from "@/lib/library";
import { PosterCard } from "@/app/(app)/_components/PosterCard";
import { WatchedMoviesGrid } from "@/app/(app)/_components/WatchedMoviesGrid";
import { WatchlistCheckButton } from "@/app/(app)/_components/WatchlistCheckButton";

export default async function MoviesPage() {
  const user = await requireUser();

  const [watchlist, watchedFirst] = await Promise.all([
    getWatchlistMovies(user.id),
    getWatchedMoviesPage(user.id, 0, PAGE_SIZE),
  ]);

  return (
    <main>
      <h1 className="mb-4 text-xl font-semibold">Films</h1>

      {watchlist.length === 0 && watchedFirst.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-[--color-panel] p-6 text-center">
          <p className="text-[--color-muted]">
            Nog geen films.{" "}
            <Link href="/search" className="text-[--color-accent] underline">
              Zoek een film
            </Link>{" "}
            of{" "}
            <Link href="/import" className="text-[--color-accent] underline">
              importeer je TV Time-historie
            </Link>
            .
          </p>
        </div>
      )}

      {watchlist.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-medium text-[--color-muted]">
            Wil ik zien ({watchlist.length})
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
            {watchlist.map((m) => (
              <PosterCard
                key={m.id}
                posterPath={m.posterPath}
                title={m.title}
                subtitle={m.year ? String(m.year) : null}
                fallbackEmoji="🎬"
                action={<WatchlistCheckButton movieId={m.id} />}
              />
            ))}
          </div>
        </section>
      )}

      {watchedFirst.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-[--color-muted]">Gezien</h2>
          <WatchedMoviesGrid initialItems={watchedFirst} pageSize={PAGE_SIZE} />
        </section>
      )}
    </main>
  );
}
