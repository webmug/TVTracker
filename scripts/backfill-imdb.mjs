// Eenmalige backfill: vult Show.imdbId en Movie.imdbId voor bestaande rijen.
// Nodig omdat syncShow/syncMovie een cache-guard hebben, dus bestaande rijen
// krijgen het IMDb-id anders pas bij een geforceerde re-sync.
//
// Draaien:  node --env-file=.env scripts/backfill-imdb.mjs
// Vereist env: DATABASE_URL + (TMDB_BEARER of TMDB_API_KEY).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = "https://api.themoviedb.org/3";

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

async function backfillShows() {
  const shows = await prisma.show.findMany({
    where: { imdbId: null },
    select: { id: true, tmdbId: true, name: true },
  });
  console.log(`Series zonder imdbId: ${shows.length}`);
  let updated = 0;
  for (const show of shows) {
    try {
      const ext = await tmdb(`/tv/${show.tmdbId}/external_ids`);
      const imdbId = ext.imdb_id || null;
      if (imdbId) {
        await prisma.show.update({ where: { id: show.id }, data: { imdbId } });
        updated++;
      }
    } catch (e) {
      console.warn(`  ! ${show.name} (tv/${show.tmdbId}): ${e.message}`);
    }
  }
  console.log(`Series bijgewerkt: ${updated}`);
}

async function backfillMovies() {
  const movies = await prisma.movie.findMany({
    where: { imdbId: null },
    select: { id: true, tmdbId: true, title: true },
  });
  console.log(`Films zonder imdbId: ${movies.length}`);
  let updated = 0;
  for (const movie of movies) {
    try {
      const details = await tmdb(`/movie/${movie.tmdbId}`);
      const imdbId = details.imdb_id || null;
      if (imdbId) {
        await prisma.movie.update({ where: { id: movie.id }, data: { imdbId } });
        updated++;
      }
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
