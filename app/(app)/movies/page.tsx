import Link from "next/link";
import { requireUser } from "@/lib/session";
import {
  getWatchlistMovies,
  getWatchedMoviesPage,
  getMovieWatchProviderOptions,
  parseProviderIds,
  PAGE_SIZE,
} from "@/lib/library";
import { MovieCard } from "@/app/(app)/_components/MovieCard";
import { WatchedMoviesGrid } from "@/app/(app)/_components/WatchedMoviesGrid";
import { ProviderFilterChips } from "@/app/(app)/_components/ProviderFilterChips";

type MovieFilter = "all" | "watchlist" | "watched";

const FILTERS: { value: MovieFilter; label: string }[] = [
  { value: "all", label: "Alles" },
  { value: "watchlist", label: "Wil ik zien" },
  { value: "watched", label: "Gezien" },
];

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; provider?: string }>;
}) {
  const user = await requireUser();
  const { filter: filterParam, provider } = await searchParams;
  const filter: MovieFilter = FILTERS.some((f) => f.value === filterParam)
    ? (filterParam as MovieFilter)
    : "all";
  const providerIds = parseProviderIds(provider);

  const showWatchlist = filter === "all" || filter === "watchlist";
  const showWatched = filter === "all" || filter === "watched";

  const [watchlist, watchedFirst, providerOptions] = await Promise.all([
    showWatchlist ? getWatchlistMovies(user.id, providerIds) : Promise.resolve([]),
    showWatched ? getWatchedMoviesPage(user.id, 0, PAGE_SIZE, providerIds) : Promise.resolve([]),
    getMovieWatchProviderOptions(user.id),
  ]);

  const empty = watchlist.length === 0 && watchedFirst.length === 0;

  return (
    <main>
      <h1 className="mb-4 text-xl font-semibold">Films</h1>

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.value === filter;
          const params = new URLSearchParams();
          if (f.value !== "all") params.set("filter", f.value);
          if (providerIds.length > 0) params.set("provider", providerIds.join(","));
          const qs = params.toString();
          return (
            <Link
              key={f.value}
              href={qs ? `/movies?${qs}` : "/movies"}
              className={
                "rounded-full px-3 py-1.5 text-sm " +
                (active
                  ? "bg-(--color-accent) text-white"
                  : "border border-white/15 text-(--color-muted) hover:text-white")
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <ProviderFilterChips
        basePath="/movies"
        options={providerOptions}
        active={providerIds}
        otherParams={filter !== "all" ? { filter } : {}}
      />

      {empty && (
        <div className="rounded-xl border border-white/10 bg-(--color-panel) p-6 text-center">
          <p className="text-(--color-muted)">
            {filter === "watchlist"
              ? "Nog geen films op je watchlist. "
              : filter === "watched"
                ? "Nog geen geziene films. "
                : "Nog geen films. "}
            <Link href="/search" className="text-(--color-accent) underline">
              Zoek een film
            </Link>{" "}
            of{" "}
            <Link href="/import" className="text-(--color-accent) underline">
              importeer je TV Time-historie
            </Link>
            .
          </p>
        </div>
      )}

      {showWatchlist && watchlist.length > 0 && (
        <section className="mb-10">
          {filter === "all" && (
            <h2 className="mb-3 text-sm font-medium text-(--color-muted)">
              Wil ik zien ({watchlist.length})
            </h2>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
            {watchlist.map((m) => (
              <MovieCard
                key={m.id}
                tmdbId={m.tmdbId}
                title={m.title}
                year={m.year ? String(m.year) : null}
                overview={m.overview}
                posterPath={m.posterPath}
                imdbId={m.imdbId}
                initialState="watchlist"
              />
            ))}
          </div>
        </section>
      )}

      {showWatched && watchedFirst.length > 0 && (
        <section>
          {filter === "all" && (
            <h2 className="mb-3 text-sm font-medium text-(--color-muted)">Gezien</h2>
          )}
          <WatchedMoviesGrid
            key={providerIds.join(",")}
            initialItems={watchedFirst}
            providerIds={providerIds}
            pageSize={PAGE_SIZE}
          />
        </section>
      )}
    </main>
  );
}
