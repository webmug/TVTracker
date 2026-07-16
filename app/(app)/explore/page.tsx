import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  getTrending,
  getShowRecommendations,
  getMovieRecommendations,
  getShowStatus,
  type DiscoverItem,
} from "@/lib/tmdb";
import { CardCarousel } from "@/app/(app)/_components/CardCarousel";

export const dynamic = "force-dynamic";

// Verken: trending, wat andere gebruikers toevoegen + aanbevelingen op basis van je collectie.
export default async function ExplorePage() {
  const user = await requireUser();

  // Seeds: recent gevolgde series + recent geziene films. Plus alles wat de gebruiker
  // al kent (om uit te filteren) en wat ándere gebruikers recent hebben toegevoegd.
  const [
    seedFollows,
    seedMovies,
    allFollows,
    allWatchedMovies,
    allWatchlistMovies,
    otherFollows,
    otherWatchlist,
    otherWatched,
  ] = await Promise.all([
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
    prisma.follow.findMany({
      where: { userId: { not: user.id } },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        show: {
          select: {
            tmdbId: true,
            name: true,
            overview: true,
            posterPath: true,
            firstAirDate: true,
            status: true,
          },
        },
      },
    }),
    prisma.watchlistMovie.findMany({
      where: { userId: { not: user.id } },
      orderBy: { addedAt: "desc" },
      take: 40,
      select: {
        movie: {
          select: { tmdbId: true, title: true, overview: true, posterPath: true, releaseDate: true },
        },
      },
    }),
    prisma.watchedMovie.findMany({
      where: { userId: { not: user.id } },
      orderBy: { watchedAt: "desc" },
      take: 40,
      select: {
        movie: {
          select: { tmdbId: true, title: true, overview: true, posterPath: true, releaseDate: true },
        },
      },
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

  // Wat andere gebruikers toevoegden → naar DiscoverItem (series eerst, dan films).
  const othersRaw: DiscoverItem[] = [
    ...otherFollows.map((f) => ({
      kind: "tv" as const,
      id: f.show.tmdbId,
      title: f.show.name,
      overview: f.show.overview ?? "",
      posterPath: f.show.posterPath,
      year: f.show.firstAirDate ? String(f.show.firstAirDate.getFullYear()) : null,
      status: f.show.status, // uit de DB; geen extra TMDB-call nodig
    })),
    ...[...otherWatchlist, ...otherWatched].map((m) => ({
      kind: "movie" as const,
      id: m.movie.tmdbId,
      title: m.movie.title,
      overview: m.movie.overview ?? "",
      posterPath: m.movie.posterPath,
      year: m.movie.releaseDate ? String(m.movie.releaseDate.getFullYear()) : null,
    })),
  ].filter((i) => i.posterPath);

  // Aanbevelingen per seed (parallel), plus trending.
  const [showRecs, movieRecs, trendingTv, trendingMovies] = await Promise.all([
    Promise.all(seedFollows.map((f) => getShowRecommendations(f.show.tmdbId))),
    Promise.all(seedMovies.map((m) => getMovieRecommendations(m.movie.tmdbId))),
    getTrending("tv").catch(() => []),
    getTrending("movie").catch(() => []),
  ]);

  // Schoonmaken in weergavevolgorde, zodat dedupe de bovenste secties voorrang geeft.
  const trendingTvClean = clean(trendingTv);
  const trendingMoviesClean = clean(trendingMovies);
  const othersClean = clean(othersRaw);

  const recSections: { title: string; items: DiscoverItem[] }[] = [];
  seedFollows.forEach((f, i) => {
    const items = clean(showRecs[i] ?? []);
    if (items.length > 0) recSections.push({ title: `Omdat je ${f.show.name} keek`, items });
  });
  seedMovies.forEach((m, i) => {
    const items = clean(movieRecs[i] ?? []);
    if (items.length > 0) recSections.push({ title: `Omdat je ${m.movie.title} zag`, items });
  });

  // Vul de "loopt/geëindigd"-status aan voor getoonde series die die nog niet hebben
  // (trending + aanbevelingen komen van TMDB-lijsten zonder status). Gecachet per uur.
  const needStatus = new Set<number>();
  const rendered = [
    ...trendingTvClean,
    ...othersClean,
    ...recSections.flatMap((s) => s.items),
  ];
  for (const it of rendered) {
    if (it.kind === "tv" && it.status === undefined) needStatus.add(it.id);
  }
  const statusPairs = await Promise.all(
    [...needStatus].map(async (id) => [id, await getShowStatus(id).catch(() => null)] as const)
  );
  const statusMap = new Map(statusPairs);
  for (const it of rendered) {
    if (it.kind === "tv" && it.status === undefined) it.status = statusMap.get(it.id) ?? null;
  }

  const nothing =
    recSections.length === 0 &&
    trendingTvClean.length === 0 &&
    trendingMoviesClean.length === 0 &&
    othersClean.length === 0;

  return (
    <main>
      <h1 className="mb-6 text-xl font-semibold">Verken</h1>

      {nothing && (
        <div className="rounded-xl border border-white/10 bg-(--color-panel) p-6 text-center">
          <p className="text-(--color-muted)">
            Nog niks te verkennen. Begin met{" "}
            <Link href="/search" className="text-(--color-accent) underline">
              zoeken
            </Link>{" "}
            en volg een paar series of films — dan komen hier tips.
          </p>
        </div>
      )}

      <CardCarousel title="Trending series" items={trendingTvClean} />
      <CardCarousel title="Trending films" items={trendingMoviesClean} />
      <CardCarousel title="Toegevoegd door anderen" items={othersClean} />

      {recSections.map((s) => (
        <CardCarousel key={s.title} title={s.title} items={s.items} />
      ))}
    </main>
  );
}
