import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getWatchlistMovies, getWatchedMoviesPage, PAGE_SIZE } from "@/lib/library";
import { PosterCard } from "@/app/(app)/_components/PosterCard";
import { WatchedMoviesGrid } from "@/app/(app)/_components/WatchedMoviesGrid";
import { WatchlistCheckButton } from "@/app/(app)/_components/WatchlistCheckButton";
import { ExternalLinks } from "@/app/(app)/_components/ExternalLinks";

type MovieFilter = "all" | "watchlist" | "watched";

const FILTERS: { value: MovieFilter; label: string }[] = [
  { value: "all", label: "Alles" },
  { value: "watchlist", label: "Wil ik zien" },
  { value: "watched", label: "Gezien" },
];

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  const { filter: filterParam } = await searchParams;
  const filter: MovieFilter = FILTERS.some((f) => f.value === filterParam)
    ? (filterParam as MovieFilter)
    : "all";

  const showWatchlist = filter === "all" || filter === "watchlist";
  const showWatched = filter === "all" || filter === "watched";

  const [watchlist, watchedFirst] = await Promise.all([
    showWatchlist ? getWatchlistMovies(user.id) : Promise.resolve([]),
    showWatched ? getWatchedMoviesPage(user.id, 0, PAGE_SIZE) : Promise.resolve([]),
  ]);

  const empty = watchlist.length === 0 && watchedFirst.length === 0;

  return (
    <main>
      <h1 className="mb-4 text-xl font-semibold">Films</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <Link
              key={f.value}
              href={f.value === "all" ? "/movies" : `/movies?filter=${f.value}`}
              className={
                "rounded-full px-3 py-1.5 text-sm " +
                (active
                  ? "bg-[--color-accent] text-white"
                  : "border border-white/15 text-[--color-muted] hover:text-white")
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {empty && (
        <div className="rounded-xl border border-white/10 bg-[--color-panel] p-6 text-center">
          <p className="text-[--color-muted]">
            {filter === "watchlist"
              ? "Nog geen films op je watchlist. "
              : filter === "watched"
                ? "Nog geen geziene films. "
                : "Nog geen films. "}
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

      {showWatchlist && watchlist.length > 0 && (
        <section className="mb-10">
          {filter === "all" && (
            <h2 className="mb-3 text-sm font-medium text-[--color-muted]">
              Wil ik zien ({watchlist.length})
            </h2>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
            {watchlist.map((m) => (
              <PosterCard
                key={m.id}
                posterPath={m.posterPath}
                title={m.title}
                subtitle={m.year ? String(m.year) : null}
                fallbackEmoji="🎬"
                action={<WatchlistCheckButton movieId={m.id} />}
                links={<ExternalLinks imdbId={m.imdbId} tmdbId={m.tmdbId} kind="movie" />}
              />
            ))}
          </div>
        </section>
      )}

      {showWatched && watchedFirst.length > 0 && (
        <section>
          {filter === "all" && (
            <h2 className="mb-3 text-sm font-medium text-[--color-muted]">Gezien</h2>
          )}
          <WatchedMoviesGrid initialItems={watchedFirst} pageSize={PAGE_SIZE} />
        </section>
      )}
    </main>
  );
}
