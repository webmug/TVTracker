import { parse } from "csv-parse/sync";
import { unzipSync } from "fflate";
import { prisma } from "@/lib/prisma";
import { searchShows, getShow, searchMovies, getMovie, parseDate } from "@/lib/tmdb";
import { syncShow, syncMovie } from "@/lib/shows";

// Eén afgevinkte aflevering uit de TV Time-export.
export interface WatchedRow {
  seriesName: string | null;
  tmdbSeriesId: number | null;
  season: number | null;
  episode: number | null;
  watchedAt: Date | null;
}

// Eén geziene film uit de TV Time-export.
export interface MovieRow {
  title: string | null;
  tmdbMovieId: number | null;
  watchedAt: Date | null;
}

export interface ParseResult {
  rows: WatchedRow[];
  movies: MovieRow[];
  files: { name: string; rows: number; mapping: Record<string, string> }[];
  warnings: string[];
}

function norm(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Vind de eerste header die één van de kandidaten (genormaliseerd) bevat.
function pick(headers: string[], candidates: string[]): string | null {
  const normed = headers.map((h) => ({ raw: h, n: norm(h) }));
  for (const cand of candidates) {
    const exact = normed.find((h) => h.n === cand);
    if (exact) return exact.raw;
  }
  for (const cand of candidates) {
    const partial = normed.find((h) => h.n.includes(cand));
    if (partial) return partial.raw;
  }
  return null;
}

// Detecteer de kolom-mapping voor een CSV op basis van de headers.
function detectMapping(headers: string[]) {
  return {
    seriesName: pick(headers, [
      "tvshowname",
      "seriesname",
      "showname",
      "seriestitle",
      "showtitle",
      "series",
      "show",
      "title",
      "name",
    ]),
    tmdbSeriesId: pick(headers, ["tmdbid", "tmdbseriesid", "themoviedbid"]),
    seriesId: pick(headers, ["seriesid", "showid", "entityid"]),
    season: pick(headers, ["seasonnumber", "seasonno", "season"]),
    episode: pick(headers, ["episodenumber", "episodeno", "episode", "epnumber"]),
    watchedAt: pick(headers, [
      "watchedat",
      "watcheddate",
      "seenat",
      "createdat",
      "updatedat",
      "date",
      "timestamp",
    ]),
  };
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

// Detecteer de kolom-mapping voor een film-CSV.
function detectMovieMapping(headers: string[]) {
  return {
    title: pick(headers, [
      "moviename",
      "movietitle",
      "filmname",
      "filmtitle",
      "title",
      "name",
    ]),
    tmdbMovieId: pick(headers, ["tmdbmovieid", "tmdbid", "themoviedbid", "movieid"]),
    watchedAt: pick(headers, [
      "watchedat",
      "watcheddate",
      "seenat",
      "createdat",
      "updatedat",
      "date",
      "timestamp",
    ]),
  };
}

// Ziet dit CSV-bestand eruit als een film-bestand? TV Time zet films in een aparte
// export (bv. movie/film in de bestandsnaam); we vereisen ook een titelkolom.
function looksLikeMovieFile(path: string, title: string | null): boolean {
  if (!title) return false;
  return /movie|film/i.test(path);
}

// Parse een TV Time export-ZIP (buffer) naar afgevinkte afleveringen + geziene films.
export async function parseTvTimeZip(buffer: Buffer): Promise<ParseResult> {
  const unzipped = unzipSync(new Uint8Array(buffer));
  const result: ParseResult = { rows: [], movies: [], files: [], warnings: [] };
  const decoder = new TextDecoder("utf8");

  for (const [path, data] of Object.entries(unzipped)) {
    if (!path.toLowerCase().endsWith(".csv") || data.length === 0) continue;
    const content = decoder.decode(data);
    let records: Record<string, string>[];
    try {
      records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        bom: true,
      });
    } catch {
      result.warnings.push(`Kon ${path} niet parsen (overgeslagen).`);
      continue;
    }
    if (records.length === 0) continue;

    const headers = Object.keys(records[0]);
    const map = detectMapping(headers);

    // Bestanden met season + episode zijn afleveringen-tracking.
    if (map.season && map.episode) {
      let added = 0;
      for (const rec of records) {
        const season = toInt(map.season ? rec[map.season] : null);
        const episode = toInt(map.episode ? rec[map.episode] : null);
        if (season === null || episode === null) continue;

        let tmdbSeriesId: number | null = null;
        if (map.tmdbSeriesId) tmdbSeriesId = toInt(rec[map.tmdbSeriesId]);
        // TV Time's series_id is historisch gelijk aan het TMDB-id; als er geen
        // expliciet tmdb-id is, gebruiken we dit als hint (met titel-fallback).
        if (tmdbSeriesId === null && map.seriesId) tmdbSeriesId = toInt(rec[map.seriesId]);

        result.rows.push({
          seriesName: map.seriesName ? String(rec[map.seriesName] ?? "").trim() || null : null,
          tmdbSeriesId,
          season,
          episode,
          watchedAt: map.watchedAt ? parseDate(rec[map.watchedAt]) : null,
        });
        added++;
      }

      const mapping: Record<string, string> = {};
      for (const [k, v] of Object.entries(map)) if (v) mapping[k] = v;
      result.files.push({ name: path, rows: added, mapping });
      continue;
    }

    // Anders: film-bestand? (geen season/episode, wel movie/film in de naam + titel)
    const mmap = detectMovieMapping(headers);
    if (looksLikeMovieFile(path, mmap.title)) {
      let added = 0;
      for (const rec of records) {
        const title = mmap.title ? String(rec[mmap.title] ?? "").trim() || null : null;
        const tmdbMovieId = mmap.tmdbMovieId ? toInt(rec[mmap.tmdbMovieId]) : null;
        if (!title && tmdbMovieId === null) continue;

        result.movies.push({
          title,
          tmdbMovieId,
          watchedAt: mmap.watchedAt ? parseDate(rec[mmap.watchedAt]) : null,
        });
        added++;
      }

      const mapping: Record<string, string> = {};
      for (const [k, v] of Object.entries(mmap)) if (v) mapping[k] = v;
      result.files.push({ name: path, rows: added, mapping });
    }
  }

  if (result.rows.length === 0 && result.movies.length === 0) {
    result.warnings.push(
      "Geen tracking-records gevonden. Controleer of dit de juiste TV Time-export is."
    );
  }
  return result;
}

// -- Matching + wegschrijven ------------------------------------------------

export interface SeriesGroup {
  key: string;
  name: string | null;
  tmdbSeriesId: number | null;
  episodes: { season: number; episode: number; watchedAt: Date | null }[];
}

export function groupBySeries(rows: WatchedRow[]): SeriesGroup[] {
  const map = new Map<string, SeriesGroup>();
  for (const r of rows) {
    if (r.season === null || r.episode === null) continue;
    const key = r.tmdbSeriesId ? `id:${r.tmdbSeriesId}` : `name:${(r.seriesName ?? "").toLowerCase()}`;
    let g = map.get(key);
    if (!g) {
      g = { key, name: r.seriesName, tmdbSeriesId: r.tmdbSeriesId, episodes: [] };
      map.set(key, g);
    }
    if (!g.name && r.seriesName) g.name = r.seriesName;
    g.episodes.push({ season: r.season, episode: r.episode, watchedAt: r.watchedAt });
  }
  return [...map.values()];
}

export interface MatchReport {
  series: {
    name: string | null;
    matchedTmdbId: number | null;
    matchedName: string | null;
    episodeCount: number;
    confidence: "id" | "name" | "none";
  }[];
  totals: { series: number; matched: number; episodes: number; unmatchedSeries: number };
}

// Resolve een groep naar een TMDB-id (id-hint eerst, anders titel-zoektocht).
async function resolveTmdbId(
  g: SeriesGroup
): Promise<{ tmdbId: number | null; name: string | null; confidence: "id" | "name" | "none" }> {
  if (g.tmdbSeriesId) {
    try {
      const show = await getShow(g.tmdbSeriesId);
      return { tmdbId: show.id, name: show.name, confidence: "id" };
    } catch {
      // id klopte niet -> val terug op naam
    }
  }
  if (g.name) {
    try {
      const results = await searchShows(g.name);
      if (results[0]) return { tmdbId: results[0].id, name: results[0].name, confidence: "name" };
    } catch {
      /* ignore */
    }
  }
  return { tmdbId: null, name: null, confidence: "none" };
}

// Voer de import uit. dryRun=true schrijft niets weg maar geeft wel het rapport.
export async function runImport(
  userId: string,
  rows: WatchedRow[],
  opts: { dryRun: boolean }
): Promise<MatchReport> {
  const groups = groupBySeries(rows);
  const report: MatchReport = {
    series: [],
    totals: { series: groups.length, matched: 0, episodes: 0, unmatchedSeries: 0 },
  };

  for (const g of groups) {
    const resolved = await resolveTmdbId(g);
    report.series.push({
      name: g.name,
      matchedTmdbId: resolved.tmdbId,
      matchedName: resolved.name,
      episodeCount: g.episodes.length,
      confidence: resolved.confidence,
    });
    report.totals.episodes += g.episodes.length;

    if (!resolved.tmdbId) {
      report.totals.unmatchedSeries++;
      continue;
    }
    report.totals.matched++;

    if (opts.dryRun) continue;

    // Synct serie + afleveringen en vinkt de gekeken afleveringen af.
    const show = await syncShow(resolved.tmdbId);
    await prisma.follow.upsert({
      where: { userId_showId: { userId, showId: show.id } },
      create: { userId, showId: show.id },
      update: {},
    });

    const episodes = await prisma.episode.findMany({
      where: { showId: show.id },
      select: { id: true, season: true, number: true },
    });
    const byKey = new Map(episodes.map((e) => [`${e.season}x${e.number}`, e.id]));

    const toCreate: { userId: string; episodeId: string; watchedAt: Date }[] = [];
    for (const ep of g.episodes) {
      const id = byKey.get(`${ep.season}x${ep.episode}`);
      if (id) toCreate.push({ userId, episodeId: id, watchedAt: ep.watchedAt ?? new Date() });
    }
    if (toCreate.length > 0) {
      await prisma.watchedEpisode.createMany({ data: toCreate, skipDuplicates: true });
    }
  }

  return report;
}

// -- Films: matching + wegschrijven -----------------------------------------

export interface MovieGroup {
  key: string;
  title: string | null;
  tmdbMovieId: number | null;
  watchedAt: Date | null;
}

// Ontdubbel films op tmdb-id of (anders) titel; bewaar de vroegste kijkdatum.
export function groupByMovie(rows: MovieRow[]): MovieGroup[] {
  const map = new Map<string, MovieGroup>();
  for (const r of rows) {
    const key = r.tmdbMovieId
      ? `id:${r.tmdbMovieId}`
      : `title:${(r.title ?? "").toLowerCase()}`;
    if (!key || key === "title:") continue;
    let g = map.get(key);
    if (!g) {
      g = { key, title: r.title, tmdbMovieId: r.tmdbMovieId, watchedAt: r.watchedAt };
      map.set(key, g);
    }
    if (!g.title && r.title) g.title = r.title;
    if (r.watchedAt && (!g.watchedAt || r.watchedAt < g.watchedAt)) g.watchedAt = r.watchedAt;
  }
  return [...map.values()];
}

export interface MovieMatchReport {
  movies: {
    title: string | null;
    matchedTmdbId: number | null;
    matchedName: string | null;
    confidence: "id" | "name" | "none";
  }[];
  totals: { movies: number; matched: number; unmatched: number };
}

// Resolve een film naar een TMDB-id (id-hint eerst, anders titel-zoektocht).
async function resolveMovieTmdbId(
  g: MovieGroup
): Promise<{ tmdbId: number | null; name: string | null; confidence: "id" | "name" | "none" }> {
  if (g.tmdbMovieId) {
    try {
      const movie = await getMovie(g.tmdbMovieId);
      return { tmdbId: movie.id, name: movie.title, confidence: "id" };
    } catch {
      // id klopte niet -> val terug op titel
    }
  }
  if (g.title) {
    try {
      const results = await searchMovies(g.title);
      if (results[0]) return { tmdbId: results[0].id, name: results[0].title, confidence: "name" };
    } catch {
      /* ignore */
    }
  }
  return { tmdbId: null, name: null, confidence: "none" };
}

// Voer de film-import uit. dryRun=true schrijft niets weg maar geeft wel het rapport.
export async function runMovieImport(
  userId: string,
  rows: MovieRow[],
  opts: { dryRun: boolean }
): Promise<MovieMatchReport> {
  const groups = groupByMovie(rows);
  const report: MovieMatchReport = {
    movies: [],
    totals: { movies: groups.length, matched: 0, unmatched: 0 },
  };

  for (const g of groups) {
    const resolved = await resolveMovieTmdbId(g);
    report.movies.push({
      title: g.title,
      matchedTmdbId: resolved.tmdbId,
      matchedName: resolved.name,
      confidence: resolved.confidence,
    });

    if (!resolved.tmdbId) {
      report.totals.unmatched++;
      continue;
    }
    report.totals.matched++;

    if (opts.dryRun) continue;

    const movie = await syncMovie(resolved.tmdbId);
    await prisma.watchedMovie.upsert({
      where: { userId_movieId: { userId, movieId: movie.id } },
      create: { userId, movieId: movie.id, watchedAt: g.watchedAt ?? new Date() },
      update: {},
    });
  }

  return report;
}
