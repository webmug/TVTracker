import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  getTrending,
  getShowRecommendations,
  getMovieRecommendations,
  type DiscoverItem,
} from "@/lib/tmdb";
import { CardCarousel } from "@/app/(app)/_components/CardCarousel";

export const dynamic = "force-dynamic";

// Verken: aanbevelingen op basis van je collectie + trending.
export default async function ExplorePage() {
  const user = await requireUser();

  // Seeds: recent gevolgde series + recent geziene films.
  const [seedFollows, seedMovies, allFollows, allWatchedMovies, allWatchlistMovies] =
    await Promise.all([
      prisma.follow.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { show: { select: { tmdbId: true, name: true } } },
      }),
      prisma.watchedMovie.findMany({
        where: { userId: user.id },
        orderBy: { watchedAt: "desc" },
        take: 2,
        select: { movie: { select: { tmdbId: true, title: true } } },
      }),
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

  // Alles wat de gebruiker al kent → uitfilteren uit de tips.
  const knownTv = new Set(allFollows.map((f) => f.show.tmdbId));
  const knownMovies = new Set([
    ...allWatchedMovies.map((m) => m.movie.tmdbId),
    ...allWatchlistMovies.map((m) => m.movie.tmdbId),
  ]);

  const seen = new Set<string>(); // dedupe over secties heen: `${kind}-${id}`
  function clean(items: DiscoverItem[], limit = 20): DiscoverItem[] {
    const out: DiscoverItem[] = [];
    for (const it of items) {
      const key = `${it.kind}-${it.id}`;
      if (seen.has(key)) continue;
      if (it.kind === "tv" && knownTv.has(it.id)) continue;
      if (it.kind === "movie" && knownMovies.has(it.id)) continue;
      seen.add(key);
      out.push(it);
      if (out.length >= limit) break;
    }
    return out;
  }

  // Aanbevelingen per seed (parallel), plus trending.
  const [showRecs, movieRecs, trendingTv, trendingMovies] = await Promise.all([
    Promise.all(seedFollows.map((f) => getShowRecommendations(f.show.tmdbId))),
    Promise.all(seedMovies.map((m) => getMovieRecommendations(m.movie.tmdbId))),
    getTrending("tv").catch(() => []),
    getTrending("movie").catch(() => []),
  ]);

  const recSections: { title: string; items: DiscoverItem[] }[] = [];
  seedFollows.forEach((f, i) => {
    const items = clean(showRecs[i] ?? []);
    if (items.length > 0) recSections.push({ title: `Omdat je ${f.show.name} keek`, items });
  });
  seedMovies.forEach((m, i) => {
    const items = clean(movieRecs[i] ?? []);
    if (items.length > 0) recSections.push({ title: `Omdat je ${m.movie.title} zag`, items });
  });

  const trendingTvClean = clean(trendingTv);
  const trendingMoviesClean = clean(trendingMovies);

  const nothing =
    recSections.length === 0 &&
    trendingTvClean.length === 0 &&
    trendingMoviesClean.length === 0;

  return (
    <main>
      <h1 className="mb-6 text-xl font-semibold">Verken</h1>

      {nothing && (
        <div className="rounded-xl border border-white/10 bg-[--color-panel] p-6 text-center">
          <p className="text-[--color-muted]">
            Nog niks te verkennen. Begin met{" "}
            <Link href="/search" className="text-[--color-accent] underline">
              zoeken
            </Link>{" "}
            en volg een paar series of films — dan komen hier tips.
          </p>
        </div>
      )}

      {recSections.map((s) => (
        <CardCarousel key={s.title} title={s.title} items={s.items} />
      ))}

      <CardCarousel title="Trending series" items={trendingTvClean} />
      <CardCarousel title="Trending films" items={trendingMoviesClean} />
    </main>
  );
}
