import { prisma } from "@/lib/prisma";

// Server-side paginatie-helpers voor de bibliotheek-overzichten. Selecteren alleen
// de velden die de kaarten nodig hebben en werken met skip/take, zodat lange
// collecties niet in één keer worden geladen.

export const PAGE_SIZE = 40;

// Parseert de `?provider=8,337`-queryparam (kan ook één id zijn) naar een lijst
// geldige TMDB-provider-ids, voor de multi-select streamingdienst-filters.
export function parseProviderIds(param: string | undefined): number[] {
  if (!param) return [];
  return param
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0);
}

// Filters op basis van kijk-voortgang (niet op het handmatige Follow.status):
//  - "watching" = nog minstens één ongeziene aflevering (nog niet uitgekeken)
//  - "finished" = alle afleveringen gezien (bij)
export type FollowFilter = "all" | "watching" | "finished";

export interface SeriesCard {
  tmdbId: number;
  name: string;
  posterPath: string | null;
  status: string; // FollowStatus
  total: number; // alle afleveringen
  watched: number; // geziene beschikbare (uitgezonden) afleveringen
  upcoming: number; // nog te verwachten (toekomstige) afleveringen
}

// Eén pagina gevolgde series met voortgang (gezien/totaal), ongeacht status
// (of gefilterd op status/streamingdienst). Nieuwste follows eerst.
export async function getSeriesLibraryPage(
  userId: string,
  offset: number,
  take = PAGE_SIZE,
  filter: FollowFilter = "all",
  providerIds?: number[]
): Promise<SeriesCard[]> {
  const now = new Date();

  // Voortgangsfilter als relatie-conditie op de Show, zodat paginatie
  // (skip/take) blijft werken. Voortgang rekent over *beschikbare* (uitgezonden)
  // afleveringen; toekomstige afleveringen tellen niet mee.
  const aired = { OR: [{ airDate: { lte: now } }, { airDate: null }] };
  const hasUnwatched = {
    episodes: { some: { AND: [aired, { watched: { none: { userId } } }] } },
  };
  const allWatched = {
    AND: [
      { episodes: { some: aired } },
      { episodes: { none: { AND: [aired, { watched: { none: { userId } } }] } } },
    ],
  };
  const progressFilter =
    filter === "watching" ? hasUnwatched : filter === "finished" ? allWatched : undefined;
  // Meerdere diensten = OR ("op Netflix óf Disney Plus"), niet AND.
  const showFilters = [
    progressFilter,
    providerIds?.length
      ? { watchProviders: { some: { providerId: { in: providerIds } } } }
      : undefined,
  ].filter((f): f is NonNullable<typeof f> => f !== undefined);

  const follows = await prisma.follow.findMany({
    where: {
      userId,
      ...(showFilters.length > 0 ? { show: { AND: showFilters } } : {}),
    },
    orderBy: { createdAt: "desc" },
    skip: offset,
    take,
    select: {
      status: true,
      show: {
        select: {
          id: true,
          tmdbId: true,
          name: true,
          posterPath: true,
        },
      },
    },
  });

  const showIds = follows.map((f) => f.show.id);

  // Tellingen via aggregatie i.p.v. alle afleveringen te laden: 3 groupBy-queries
  // over precies de series op deze pagina. Een langlopende serie materialiseert zo
  // niet langer honderden afleveringrijen per kaart.
  const [totalRows, upcomingRows, watchedRows] =
    showIds.length === 0
      ? [[], [], []]
      : await Promise.all([
          prisma.episode.groupBy({
            by: ["showId"],
            where: { showId: { in: showIds } },
            _count: true,
          }),
          prisma.episode.groupBy({
            by: ["showId"],
            where: { showId: { in: showIds }, airDate: { gt: now } },
            _count: true,
          }),
          // Uitgezonden (of undated) afleveringen die de gebruiker heeft gezien.
          prisma.episode.groupBy({
            by: ["showId"],
            where: {
              showId: { in: showIds },
              ...aired,
              watched: { some: { userId } },
            },
            _count: true,
          }),
        ]);

  const totalById = new Map(totalRows.map((r) => [r.showId, r._count]));
  const upcomingById = new Map(upcomingRows.map((r) => [r.showId, r._count]));
  const watchedById = new Map(watchedRows.map((r) => [r.showId, r._count]));

  return follows.map((f) => ({
    tmdbId: f.show.tmdbId,
    name: f.show.name,
    posterPath: f.show.posterPath,
    status: f.status,
    total: totalById.get(f.show.id) ?? 0,
    watched: watchedById.get(f.show.id) ?? 0,
    upcoming: upcomingById.get(f.show.id) ?? 0,
  }));
}

export interface MovieCard {
  id: string;
  tmdbId: number;
  imdbId: string | null;
  title: string;
  overview: string;
  posterPath: string | null;
  year: number | null;
}

export async function getWatchlistMovies(userId: string, providerIds?: number[]): Promise<MovieCard[]> {
  const rows = await prisma.watchlistMovie.findMany({
    where: {
      userId,
      ...(providerIds?.length
        ? { movie: { watchProviders: { some: { providerId: { in: providerIds } } } } }
        : {}),
    },
    orderBy: { addedAt: "desc" },
    select: {
      movie: {
        select: { id: true, tmdbId: true, imdbId: true, title: true, overview: true, posterPath: true, releaseDate: true },
      },
    },
  });
  return rows.map((r) => toMovieCard(r.movie));
}

export async function getWatchedMoviesPage(
  userId: string,
  offset: number,
  take = PAGE_SIZE,
  providerIds?: number[]
): Promise<MovieCard[]> {
  const rows = await prisma.watchedMovie.findMany({
    where: {
      userId,
      ...(providerIds?.length
        ? { movie: { watchProviders: { some: { providerId: { in: providerIds } } } } }
        : {}),
    },
    orderBy: { watchedAt: "desc" },
    skip: offset,
    take,
    select: {
      movie: {
        select: { id: true, tmdbId: true, imdbId: true, title: true, overview: true, posterPath: true, releaseDate: true },
      },
    },
  });
  return rows.map((r) => toMovieCard(r.movie));
}

function toMovieCard(m: {
  id: string;
  tmdbId: number;
  imdbId: string | null;
  title: string;
  overview: string | null;
  posterPath: string | null;
  releaseDate: Date | null;
}): MovieCard {
  return {
    id: m.id,
    tmdbId: m.tmdbId,
    imdbId: m.imdbId,
    title: m.title,
    overview: m.overview ?? "",
    posterPath: m.posterPath,
    year: m.releaseDate?.getFullYear() ?? null,
  };
}

export interface WatchProviderOption {
  id: number;
  name: string;
  logoPath: string | null;
}

// Streamingdiensten die daadwerkelijk voorkomen in de gevolgde series van deze
// gebruiker, voor de filterchips op /series. Alfabetisch gesorteerd.
export async function getSeriesWatchProviderOptions(userId: string): Promise<WatchProviderOption[]> {
  const rows = await prisma.showWatchProvider.findMany({
    where: { show: { follows: { some: { userId } } } },
    distinct: ["providerId"],
    orderBy: { providerName: "asc" },
    select: { providerId: true, providerName: true, logoPath: true },
  });
  return rows.map((r) => ({ id: r.providerId, name: r.providerName, logoPath: r.logoPath }));
}

// Idem, maar over de filmbibliotheek (watchlist + gezien) van deze gebruiker.
export async function getMovieWatchProviderOptions(userId: string): Promise<WatchProviderOption[]> {
  const rows = await prisma.movieWatchProvider.findMany({
    where: {
      movie: {
        OR: [{ watchlist: { some: { userId } } }, { watched: { some: { userId } } }],
      },
    },
    distinct: ["providerId"],
    orderBy: { providerName: "asc" },
    select: { providerId: true, providerName: true, logoPath: true },
  });
  return rows.map((r) => ({ id: r.providerId, name: r.providerName, logoPath: r.logoPath }));
}
