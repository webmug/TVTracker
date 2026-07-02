import { prisma } from "@/lib/prisma";
import {
  getShow,
  getAllEpisodes,
  parseDate,
  type TmdbShowDetails,
} from "@/lib/tmdb";

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
      name: details.name,
      overview: details.overview || null,
      posterPath: details.poster_path,
      status: details.status,
      firstAirDate: parseDate(details.first_air_date),
    },
    update: {
      name: details.name,
      overview: details.overview || null,
      posterPath: details.poster_path,
      status: details.status,
      firstAirDate: parseDate(details.first_air_date),
      lastSyncedAt: new Date(),
    },
  });

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
