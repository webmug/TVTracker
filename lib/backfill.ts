import { prisma } from "@/lib/prisma";
import { getShow, getMovie } from "@/lib/tmdb";

// Eenmalige backfill van Show.imdbId / Movie.imdbId voor rijen die nog geen
// IMDb-id hebben. Idempotent: pakt alleen rijen met imdbId = null, dus een
// tweede run (bv. na een herstart) doet vrijwel niets. Wordt bij het opstarten
// van de server één keer afgetrapt vanuit instrumentation.ts.

// Guard tegen dubbel draaien binnen hetzelfde proces.
let started = false;

export async function backfillImdbIds(): Promise<void> {
  if (started) return;
  started = true;

  try {
    const shows = await prisma.show.findMany({
      where: { imdbId: null },
      select: { id: true, tmdbId: true },
    });
    let showsUpdated = 0;
    for (const show of shows) {
      try {
        const details = await getShow(show.tmdbId);
        const imdbId = details.external_ids?.imdb_id ?? null;
        if (imdbId) {
          await prisma.show.update({ where: { id: show.id }, data: { imdbId } });
          showsUpdated++;
        }
      } catch (e) {
        console.warn(`[backfill-imdb] serie tv/${show.tmdbId}:`, (e as Error).message);
      }
    }

    const movies = await prisma.movie.findMany({
      where: { imdbId: null },
      select: { id: true, tmdbId: true },
    });
    let moviesUpdated = 0;
    for (const movie of movies) {
      try {
        const details = await getMovie(movie.tmdbId);
        const imdbId = details.imdb_id ?? null;
        if (imdbId) {
          await prisma.movie.update({ where: { id: movie.id }, data: { imdbId } });
          moviesUpdated++;
        }
      } catch (e) {
        console.warn(`[backfill-imdb] film movie/${movie.tmdbId}:`, (e as Error).message);
      }
    }

    if (shows.length || movies.length) {
      console.log(
        `[backfill-imdb] klaar: ${showsUpdated}/${shows.length} series, ` +
          `${moviesUpdated}/${movies.length} films bijgewerkt.`
      );
    }
  } catch (e) {
    console.error("[backfill-imdb] mislukt:", (e as Error).message);
  }
}
