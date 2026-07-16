import { prisma } from "@/lib/prisma";
import {
  getShow,
  getMovie,
  getAllEpisodes,
  getWatchProviders,
  parseDate,
  type TmdbShowDetails,
  type TmdbMovieDetails,
  type WatchProviders,
} from "@/lib/tmdb";

// Cachet de flatrate-streamingdiensten van TMDB in de ShowWatchProvider-tabel,
// zodat de bibliotheek erop kan filteren zonder TMDB te bevragen (zie syncShow).
export async function syncShowWatchProviders(showId: string, providers: WatchProviders | null) {
  const flatrate = providers?.flatrate ?? [];
  await prisma.showWatchProvider.deleteMany({
    where: { showId, providerId: { notIn: flatrate.map((p) => p.id) } },
  });
  for (const p of flatrate) {
    await prisma.showWatchProvider.upsert({
      where: { showId_providerId: { showId, providerId: p.id } },
      create: { showId, providerId: p.id, providerName: p.name, logoPath: p.logoPath },
      update: { providerName: p.name, logoPath: p.logoPath },
    });
  }
}

// Zie syncShowWatchProviders: dezelfde cache, maar voor films (zie syncMovie).
export async function syncMovieWatchProviders(movieId: string, providers: WatchProviders | null) {
  const flatrate = providers?.flatrate ?? [];
  await prisma.movieWatchProvider.deleteMany({
    where: { movieId, providerId: { notIn: flatrate.map((p) => p.id) } },
  });
  for (const p of flatrate) {
    await prisma.movieWatchProvider.upsert({
      where: { movieId_providerId: { movieId, providerId: p.id } },
      create: { movieId, providerId: p.id, providerName: p.name, logoPath: p.logoPath },
      update: { providerName: p.name, logoPath: p.logoPath },
    });
  }
}

// Haalt een serie + alle afleveringen op van TMDB en schrijft ze (idempotent) naar de DB.
// Geeft het Show-record terug. Skip de netwerk-refresh als de show recent is gesynct
// (tenzij force=true).
export async function syncShow(
  tmdbId: number,
  opts: { force?: boolean; maxAgeMinutes?: number } = {}
): Promise<{ id: string }> {
  const { force = false, maxAgeMinutes = 60 * 12 } = opts;

  const existing = await prisma.show.findUnique({ where: { tmdbId } });
  if (existing && !force) {
    const ageMs = Date.now() - existing.lastSyncedAt.getTime();
    if (ageMs < maxAgeMinutes * 60_000) return { id: existing.id };
  }

  const details: TmdbShowDetails = await getShow(tmdbId);
  const show = await prisma.show.upsert({
    where: { tmdbId },
    create: {
      tmdbId,
      imdbId: details.external_ids?.imdb_id ?? null,
      name: details.name,
      overview: details.overview || null,
      posterPath: details.poster_path,
      status: details.status,
      firstAirDate: parseDate(details.first_air_date),
    },
    update: {
      imdbId: details.external_ids?.imdb_id ?? null,
      name: details.name,
      overview: details.overview || null,
      posterPath: details.poster_path,
      status: details.status,
      firstAirDate: parseDate(details.first_air_date),
      lastSyncedAt: new Date(),
    },
  });

  const providers = await getWatchProviders(tmdbId, "tv").catch(() => null);
  await syncShowWatchProviders(show.id, providers);

  const episodes = await getAllEpisodes(details);
  for (const ep of episodes) {
    await prisma.episode.upsert({
      where: {
        showId_season_number: {
          showId: show.id,
          season: ep.season_number,
          number: ep.episode_number,
        },
      },
      create: {
        showId: show.id,
        tmdbId: ep.id,
        season: ep.season_number,
        number: ep.episode_number,
        name: ep.name || null,
        overview: ep.overview || null,
        airDate: parseDate(ep.air_date),
      },
      update: {
        tmdbId: ep.id,
        name: ep.name || null,
        overview: ep.overview || null,
        airDate: parseDate(ep.air_date),
      },
    });
  }

  return { id: show.id };
}

// Haalt een film op van TMDB en schrijft 'm (idempotent) naar de DB.
// Skip de netwerk-refresh als de film recent is gesynct (tenzij force=true).
export async function syncMovie(
  tmdbId: number,
  opts: { force?: boolean; maxAgeMinutes?: number } = {}
): Promise<{ id: string }> {
  const { force = false, maxAgeMinutes = 60 * 24 * 7 } = opts;

  const existing = await prisma.movie.findUnique({ where: { tmdbId } });
  if (existing && !force) {
    const ageMs = Date.now() - existing.lastSyncedAt.getTime();
    if (ageMs < maxAgeMinutes * 60_000) return { id: existing.id };
  }

  const details: TmdbMovieDetails = await getMovie(tmdbId);
  const movie = await prisma.movie.upsert({
    where: { tmdbId },
    create: {
      tmdbId,
      imdbId: details.imdb_id ?? null,
      title: details.title,
      overview: details.overview || null,
      posterPath: details.poster_path,
      releaseDate: parseDate(details.release_date),
    },
    update: {
      imdbId: details.imdb_id ?? null,
      title: details.title,
      overview: details.overview || null,
      posterPath: details.poster_path,
      releaseDate: parseDate(details.release_date),
      lastSyncedAt: new Date(),
    },
  });

  const providers = await getWatchProviders(tmdbId, "movie").catch(() => null);
  await syncMovieWatchProviders(movie.id, providers);

  return { id: movie.id };
}
