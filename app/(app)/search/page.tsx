import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  searchShows,
  searchMovies,
  searchAll,
  type DiscoverItem,
} from "@/lib/tmdb";
import { PosterCard } from "@/app/(app)/_components/PosterCard";
import { FollowButton } from "@/app/(app)/_components/FollowButton";
import { MovieActionButton } from "@/app/(app)/_components/MovieActionButton";

type SearchType = "all" | "tv" | "movie";

const TYPES: { value: SearchType; label: string }[] = [
  { value: "all", label: "Alles" },
  { value: "tv", label: "Series" },
  { value: "movie", label: "Films" },
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const user = await requireUser();
  const { q, type } = await searchParams;
  const query = (q ?? "").trim();
  const activeType: SearchType = TYPES.some((t) => t.value === type)
    ? (type as SearchType)
    : "all";

  let results: DiscoverItem[] = [];
  if (query) {
    if (activeType === "tv") {
      results = (await searchShows(query)).map((r) => ({
        kind: "tv",
        id: r.id,
        title: r.name,
        overview: r.overview ?? "",
        posterPath: r.poster_path,
        year: r.first_air_date ? r.first_air_date.slice(0, 4) : null,
      }));
    } else if (activeType === "movie") {
      results = (await searchMovies(query)).map((r) => ({
        kind: "movie",
        id: r.id,
        title: r.title,
        overview: r.overview ?? "",
        posterPath: r.poster_path,
        year: r.release_date ? r.release_date.slice(0, 4) : null,
      }));
    } else {
      results = await searchAll(query);
    }
  }

  // Bestaande status van de gebruiker om de juiste actie/knop te tonen.
  const [follows, watchedMovies, watchlistMovies] = await Promise.all([
    prisma.follow.findMany({
      where: { userId: user.id },
      select: { show: { select: { tmdbId: true } } },
    }),
    prisma.watchedMovie.findMany({
      where: { userId: user.id },
      select: { movie: { select: { tmdbId: true } } },
    }),
    prisma.watchlistMovie.findMany({
      where: { userId: user.id },
      select: { movie: { select: { tmdbId: true } } },
    }),
  ]);
  const followedIds = new Set(follows.map((f) => f.show.tmdbId));
  const watchedIds = new Set(watchedMovies.map((w) => w.movie.tmdbId));
  const watchlistIds = new Set(watchlistMovies.map((w) => w.movie.tmdbId));

  return (
    <main>
      <h1 className="mb-4 text-xl font-semibold">Zoeken</h1>

      <form action="/search" method="get" className="mb-4 flex gap-2">
        <input type="hidden" name="type" value={activeType} />
        <input
          name="q"
          defaultValue={query}
          placeholder="Titel, bv. Severance of Dune"
          className="flex-1 rounded-lg border border-white/10 bg-(--color-panel) px-4 py-3 outline-none focus:border-(--color-accent)"
        />
        <button className="rounded-lg bg-(--color-accent) px-5 py-3 font-medium text-white">
          Zoek
        </button>
      </form>

      <div className="mb-6 flex gap-2">
        {TYPES.map((t) => {
          const active = t.value === activeType;
          const params = new URLSearchParams();
          if (query) params.set("q", query);
          params.set("type", t.value);
          return (
            <Link
              key={t.value}
              href={`/search?${params.toString()}`}
              className={
                "rounded-full px-3 py-1.5 text-sm " +
                (active
                  ? "bg-(--color-accent) text-white"
                  : "border border-white/15 text-(--color-muted) hover:text-white")
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {query && results.length === 0 && (
        <p className="text-(--color-muted)">Geen resultaten voor “{query}”.</p>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
          {results.map((r) => (
            <PosterCard
              key={`${r.kind}-${r.id}`}
              posterPath={r.posterPath}
              title={r.title}
              subtitle={r.year}
              href={r.kind === "tv" ? `/show/${r.id}` : undefined}
              fallbackEmoji={r.kind === "tv" ? "📺" : "🎬"}
              action={
                r.kind === "tv" ? (
                  <FollowButton tmdbId={r.id} following={followedIds.has(r.id)} />
                ) : (
                  <MovieActionButton
                    tmdbId={r.id}
                    compact
                    initial={
                      watchedIds.has(r.id)
                        ? "watched"
                        : watchlistIds.has(r.id)
                          ? "watchlist"
                          : "none"
                    }
                  />
                )
              }
            />
          ))}
        </div>
      )}
    </main>
  );
}
