import { prisma } from "@/lib/prisma";

// Server-side paginatie-helpers voor de bibliotheek-overzichten. Selecteren alleen
// de velden die de kaarten nodig hebben en werken met skip/take, zodat lange
// collecties niet in één keer worden geladen.

export const PAGE_SIZE = 40;

// Filters op basis van kijk-voortgang (niet op het handmatige Follow.status):
//  - "watching" = nog minstens één ongeziene aflevering (nog niet uitgekeken)
//  - "finished" = alle afleveringen gezien (bij)
export type FollowFilter = "all" | "watching" | "finished";

export interface SeriesCard {
  tmdbId: number;
  name: string;
  posterPath: string | null;
  status: string; // FollowStatus
  total: number;
  watched: number;
}

// Eén pagina gevolgde series met voortgang (gezien/totaal), ongeacht status
// (of gefilterd op status). Nieuwste follows eerst.
export async function getSeriesLibraryPage(
  userId: string,
  offset: number,
  take = PAGE_SIZE,
  filter: FollowFilter = "all"
): Promise<SeriesCard[]> {
  // Voortgangsfilter als relatie-conditie op de Show, zodat paginatie
  // (skip/take) blijft werken.
  const hasUnwatched = { episodes: { some: { watched: { none: { userId } } } } };
  const allWatched = {
    AND: [
      { episodes: { some: {} } },
      { episodes: { none: { watched: { none: { userId } } } } },
    ],
  };
  const showFilter =
    filter === "watching" ? hasUnwatched : filter === "finished" ? allWatched : undefined;

  const follows = await prisma.follow.findMany({
    where: {
      userId,
      ...(showFilter ? { show: showFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    skip: offset,
    take,
    select: {
      status: true,
      show: {
        select: {
          tmdbId: true,
          name: true,
          posterPath: true,
          _count: { select: { episodes: true } },
          episodes: {
            where: { watched: { some: { userId } } },
            select: { id: true },
          },
        },
      },
    },
  });

  return follows.map((f) => ({
    tmdbId: f.show.tmdbId,
    name: f.show.name,
    posterPath: f.show.posterPath,
    status: f.status,
    total: f.show._count.episodes,
    watched: f.show.episodes.length,
  }));
}

export interface MovieCard {
  id: string;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  year: number | null;
}

export async function getWatchlistMovies(userId: string): Promise<MovieCard[]> {
  const rows = await prisma.watchlistMovie.findMany({
    where: { userId },
    orderBy: { addedAt: "desc" },
    select: {
      movie: {
        select: { id: true, tmdbId: true, title: true, posterPath: true, releaseDate: true },
      },
    },
  });
  return rows.map((r) => toMovieCard(r.movie));
}

export async function getWatchedMoviesPage(
  userId: string,
  offset: number,
  take = PAGE_SIZE
): Promise<MovieCard[]> {
  const rows = await prisma.watchedMovie.findMany({
    where: { userId },
    orderBy: { watchedAt: "desc" },
    skip: offset,
    take,
    select: {
      movie: {
        select: { id: true, tmdbId: true, title: true, posterPath: true, releaseDate: true },
      },
    },
  });
  return rows.map((r) => toMovieCard(r.movie));
}

function toMovieCard(m: {
  id: string;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseDate: Date | null;
}): MovieCard {
  return {
    id: m.id,
    tmdbId: m.tmdbId,
    title: m.title,
    posterPath: m.posterPath,
    year: m.releaseDate?.getFullYear() ?? null,
  };
}
