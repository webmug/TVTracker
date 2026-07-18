// Eenmalige backfill: vult ShowWatchProvider/MovieWatchProvider voor bestaande
// rijen. Nodig omdat syncShow/syncMovie een cache-guard hebben, dus bestaande
// rijen krijgen de streamingdiensten anders pas bij een geforceerde re-sync.
//
// Draaien:  node --env-file=.env scripts/backfill-watch-providers.mjs
// Vereist env: DATABASE_URL + (TMDB_BEARER of TMDB_API_KEY).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = "https://api.themoviedb.org/3";
const WATCH_REGION = "NL";

const bearer = process.env.TMDB_BEARER;
const apiKey = process.env.TMDB_API_KEY;
if (!bearer && !apiKey) {
  console.error("TMDB_BEARER of TMDB_API_KEY is vereist.");
  process.exit(1);
}

async function tmdb(path) {
  const usp = new URLSearchParams();
  if (!bearer && apiKey) usp.set("api_key", apiKey);
  const url = `${BASE}${path}?${usp.toString()}`;
  const res = await fetch(url, {
    headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
  });
  if (!res.ok) throw new Error(`TMDB ${path} -> ${res.status} ${res.statusText}`);
  return res.json();
}

async function getFlatrate(kind, tmdbId) {
  const data = await tmdb(`/${kind}/${tmdbId}/watch/providers`);
  const region = data.results?.[WATCH_REGION];
  return region?.flatrate ?? [];
}

async function syncRow(delegate, parentKey, parentId, flatrate) {
  await delegate.deleteMany({
    where: { [parentKey]: parentId, providerId: { notIn: flatrate.map((p) => p.provider_id) } },
  });
  for (const p of flatrate) {
    await delegate.upsert({
      where: { [`${parentKey}_providerId`]: { [parentKey]: parentId, providerId: p.provider_id } },
      create: {
        [parentKey]: parentId,
        providerId: p.provider_id,
        providerName: p.provider_name,
        logoPath: p.logo_path ?? null,
      },
      update: { providerName: p.provider_name, logoPath: p.logo_path ?? null },
    });
  }
}

async function backfillShows() {
  const shows = await prisma.show.findMany({ select: { id: true, tmdbId: true, name: true } });
  console.log(`Series: ${shows.length}`);
  let updated = 0;
  for (const show of shows) {
    try {
      const flatrate = await getFlatrate("tv", show.tmdbId);
      await syncRow(prisma.showWatchProvider, "showId", show.id, flatrate);
      updated++;
    } catch (e) {
      console.warn(`  ! ${show.name} (tv/${show.tmdbId}): ${e.message}`);
    }
  }
  console.log(`Series bijgewerkt: ${updated}`);
}

async function backfillMovies() {
  const movies = await prisma.movie.findMany({ select: { id: true, tmdbId: true, title: true } });
  console.log(`Films: ${movies.length}`);
  let updated = 0;
  for (const movie of movies) {
    try {
      const flatrate = await getFlatrate("movie", movie.tmdbId);
      await syncRow(prisma.movieWatchProvider, "movieId", movie.id, flatrate);
      updated++;
    } catch (e) {
      console.warn(`  ! ${movie.title} (movie/${movie.tmdbId}): ${e.message}`);
    }
  }
  console.log(`Films bijgewerkt: ${updated}`);
}

try {
  await backfillShows();
  await backfillMovies();
} finally {
  await prisma.$disconnect();
}
