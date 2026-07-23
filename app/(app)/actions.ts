"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { syncShow, syncMovie } from "@/lib/shows";
import {
  getWatchProviders,
  getTrailerUrl,
  getMovie,
  getMovieCollection,
} from "@/lib/tmdb";
import {
  getSeriesLibraryPage,
  getWatchedMoviesPage,
  getWatchlistMoviesPage,
  type FollowFilter,
  type SeriesCard,
  type MovieCard,
} from "@/lib/library";

// Serie volgen (synct van TMDB indien nodig).
export async function followShow(tmdbId: number) {
  const user = await requireUser();
  const show = await syncShow(tmdbId);
  await prisma.follow.upsert({
    where: { userId_showId: { userId: user.id, showId: show.id } },
    create: { userId: user.id, showId: show.id },
    update: {},
  });
  // Geen revalidatePath: de FollowButton flipt lokaal en /dashboard, /series en
  // /show zijn dynamisch (laden vers bij navigatie). Revalidatie zou de
  // client-router-cache legen en carousels op Verken/Zoeken laten springen.
}

export async function unfollowShow(tmdbId: number) {
  const user = await requireUser();
  const show = await prisma.show.findUnique({ where: { tmdbId } });
  if (show) {
    await prisma.follow.deleteMany({ where: { userId: user.id, showId: show.id } });
  }
  // Zie followShow: geen revalidatePath om reflow te voorkomen.
}

export async function setFollowStatus(
  tmdbId: number,
  status: "WATCHING" | "PAUSED" | "FINISHED"
) {
  const user = await requireUser();
  const show = await prisma.show.findUnique({ where: { tmdbId } });
  if (show) {
    await prisma.follow.updateMany({
      where: { userId: user.id, showId: show.id },
      data: { status },
    });
  }
  revalidatePath("/dashboard");
  revalidatePath(`/show/${tmdbId}`);
}

// Eén aflevering aan/uit vinken.
export async function toggleWatched(episodeId: string, watched: boolean) {
  const user = await requireUser();
  if (watched) {
    await prisma.watchedEpisode.upsert({
      where: { userId_episodeId: { userId: user.id, episodeId } },
      create: { userId: user.id, episodeId },
      update: {},
    });
  } else {
    await prisma.watchedEpisode.deleteMany({ where: { userId: user.id, episodeId } });
  }
  const ep = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: { show: true },
  });
  if (ep) revalidatePath(`/show/${ep.show.tmdbId}`);
  revalidatePath("/dashboard");
}

// Alle (uitgezonden) afleveringen t/m een bepaalde aflevering als gezien markeren.
export async function markWatchedThrough(showTmdbId: number, throughEpisodeId: string) {
  const user = await requireUser();
  const show = await prisma.show.findUnique({ where: { tmdbId: showTmdbId } });
  if (!show) return;
  const target = await prisma.episode.findUnique({ where: { id: throughEpisodeId } });
  if (!target) return;

  const episodes = await prisma.episode.findMany({
    where: { showId: show.id },
    orderBy: [{ season: "asc" }, { number: "asc" }],
  });

  const toMark = episodes.filter(
    (e) =>
      e.season < target.season ||
      (e.season === target.season && e.number <= target.number)
  );

  await prisma.watchedEpisode.createMany({
    data: toMark.map((e) => ({ userId: user.id, episodeId: e.id })),
    skipDuplicates: true,
  });
  revalidatePath(`/show/${showTmdbId}`);
  revalidatePath("/dashboard");
}

// Film (via TMDB-id, bv. vanuit zoeken of Verken) op de watchlist zetten. Synct
// eerst de film naar de DB. No-op als hij al gezien is.
export async function addMovieToWatchlist(tmdbId: number) {
  const user = await requireUser();
  const movie = await syncMovie(tmdbId);
  const alreadyWatched = await prisma.watchedMovie.findUnique({
    where: { userId_movieId: { userId: user.id, movieId: movie.id } },
  });
  if (!alreadyWatched) {
    await prisma.watchlistMovie.upsert({
      where: { userId_movieId: { userId: user.id, movieId: movie.id } },
      create: { userId: user.id, movieId: movie.id },
      update: {},
    });
  }
  // Bewust géén revalidatePath: deze knop staat op Zoeken/Verken, waar de kaart
  // alleen lokaal naar "op watchlist" flipt. Revalidatie zou de client-router-
  // cache legen en de Verken-pagina laten herbouwen (nieuwe rijen → springt).
  // /movies is dynamisch en laadt bij navigatie toch vers.
}

// Film (via TMDB-id) meteen als "gezien" markeren en van de watchlist halen.
export async function markMovieWatchedByTmdb(tmdbId: number) {
  const user = await requireUser();
  const movie = await syncMovie(tmdbId);
  await prisma.watchedMovie.upsert({
    where: { userId_movieId: { userId: user.id, movieId: movie.id } },
    create: { userId: user.id, movieId: movie.id },
    update: {},
  });
  await prisma.watchlistMovie.deleteMany({ where: { userId: user.id, movieId: movie.id } });
  // Zie addMovieToWatchlist: geen revalidatePath, om reflow op Verken/Zoeken te
  // voorkomen. De kaart toont lokaal "✓ Gezien".
}

// Film van de watchlist afvinken: verplaats 'm naar "gezien".
export async function markMovieWatched(movieId: string) {
  const user = await requireUser();
  await prisma.watchedMovie.upsert({
    where: { userId_movieId: { userId: user.id, movieId } },
    create: { userId: user.id, movieId },
    update: {},
  });
  await prisma.watchlistMovie.deleteMany({ where: { userId: user.id, movieId } });
  revalidatePath("/movies");
}

// Hele seizoen aan/uit vinken.
export async function toggleSeason(showTmdbId: number, season: number, watched: boolean) {
  const user = await requireUser();
  const show = await prisma.show.findUnique({ where: { tmdbId: showTmdbId } });
  if (!show) return;
  const episodes = await prisma.episode.findMany({
    where: { showId: show.id, season },
    select: { id: true },
  });
  if (watched) {
    await prisma.watchedEpisode.createMany({
      data: episodes.map((e) => ({ userId: user.id, episodeId: e.id })),
      skipDuplicates: true,
    });
  } else {
    await prisma.watchedEpisode.deleteMany({
      where: { userId: user.id, episodeId: { in: episodes.map((e) => e.id) } },
    });
  }
  revalidatePath(`/show/${showTmdbId}`);
  revalidatePath("/dashboard");
}

// Alle seizoenen (de hele serie) in één keer aan/uit vinken.
export async function toggleAllSeasons(showTmdbId: number, watched: boolean) {
  const user = await requireUser();
  const show = await prisma.show.findUnique({ where: { tmdbId: showTmdbId } });
  if (!show) return;
  const episodes = await prisma.episode.findMany({
    where: { showId: show.id },
    select: { id: true },
  });
  if (watched) {
    await prisma.watchedEpisode.createMany({
      data: episodes.map((e) => ({ userId: user.id, episodeId: e.id })),
      skipDuplicates: true,
    });
  } else {
    await prisma.watchedEpisode.deleteMany({
      where: { userId: user.id, episodeId: { in: episodes.map((e) => e.id) } },
    });
  }
  revalidatePath(`/show/${showTmdbId}`);
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Paginatie voor de infinite-scroll grids (aangeroepen vanuit CardGrid).
// ---------------------------------------------------------------------------

export async function loadMoreSeries(
  offset: number,
  filter: FollowFilter = "all",
  providerIds?: number[]
): Promise<SeriesCard[]> {
  const user = await requireUser();
  return getSeriesLibraryPage(user.id, offset, undefined, filter, providerIds);
}

export async function loadMoreWatchedMovies(
  offset: number,
  providerIds?: number[]
): Promise<MovieCard[]> {
  const user = await requireUser();
  return getWatchedMoviesPage(user.id, offset, undefined, providerIds);
}

export async function loadMoreWatchlistMovies(
  offset: number,
  providerIds?: number[]
): Promise<MovieCard[]> {
  const user = await requireUser();
  return getWatchlistMoviesPage(user.id, offset, undefined, providerIds);
}

// Alles wat de filmdetailmodal lazy nodig heeft in één call (films hebben geen
// server-gerenderde detailpagina). Ook de kerngegevens zelf, zodat de modal kan
// wisselen naar een andere film uit de reeks zonder de pagina te verlaten.
// Elk onderdeel faalt zelfstandig: een hikkende TMDB-call mag de modal niet slopen.
export async function getMovieModalDetails(tmdbId: number) {
  const user = await requireUser();
  const [details, providers, trailerUrl, collection] = await Promise.all([
    getMovie(tmdbId).catch(() => null),
    getWatchProviders(tmdbId, "movie").catch(() => null),
    getTrailerUrl(tmdbId, "movie").catch(() => null),
    loadCollectionInfo(tmdbId, user.id),
  ]);

  const own = await prisma.movie.findUnique({
    where: { tmdbId },
    select: {
      watched: { where: { userId: user.id }, select: { id: true } },
      watchlist: { where: { userId: user.id }, select: { id: true } },
    },
  });

  return {
    title: details?.title ?? null,
    year: details?.release_date ? details.release_date.slice(0, 4) : null,
    overview: details?.overview ?? null,
    posterPath: details?.poster_path ?? null,
    imdbId: details?.imdb_id ?? null,
    state: (own?.watched.length
      ? "watched"
      : own?.watchlist.length
        ? "watchlist"
        : "none") as "none" | "watchlist" | "watched",
    providers,
    trailerUrl,
    collection,
  };
}

// Filmreeks (TMDB-collection) voor de filmdetailmodal: vervolgen/prequels, bv. een
// trilogie. Per deel geven we de watchlist/gezien-status van de gebruiker mee zodat
// de knoppen goed staan. Interne helper: gaat mee in getMovieModalDetails.
async function loadCollectionInfo(tmdbId: number, userId: string) {
  const collection = await getMovieCollection(tmdbId).catch(() => null);
  if (!collection) return null;

  const known = await prisma.movie.findMany({
    where: { tmdbId: { in: collection.parts.map((p) => p.tmdbId) } },
    select: {
      tmdbId: true,
      watched: { where: { userId }, select: { id: true } },
      watchlist: { where: { userId }, select: { id: true } },
    },
  });
  const stateByTmdbId = new Map<number, "none" | "watchlist" | "watched">(
    known.map((m) => [
      m.tmdbId,
      m.watched.length > 0 ? "watched" : m.watchlist.length > 0 ? "watchlist" : "none",
    ])
  );

  return {
    name: collection.name,
    parts: collection.parts.map((p) => ({
      ...p,
      state: stateByTmdbId.get(p.tmdbId) ?? ("none" as const),
    })),
  };
}
