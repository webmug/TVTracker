import { parse } from "csv-parse/sync";
import { unzipSync } from "fflate";
import { prisma } from "@/lib/prisma";
import { searchShows, getShow, parseDate } from "@/lib/tmdb";
import { syncShow } from "@/lib/shows";

// Eén afgevinkte aflevering uit de TV Time-export.
export interface WatchedRow {
  seriesName: string | null;
  tmdbSeriesId: number | null;
  season: number | null;
  episode: number | null;
  watchedAt: Date | null;
}

export interface ParseResult {
  rows: WatchedRow[];
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

// Parse een TV Time export-ZIP (buffer) naar afgevinkte afleveringen.
export async function parseTvTimeZip(buffer: Buffer): Promise<ParseResult> {
  const unzipped = unzipSync(new Uint8Array(buffer));
  const result: ParseResult = { rows: [], files: [], warnings: [] };
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

    // Alleen bestanden met season + episode zijn tracking-records.
    if (!map.season || !map.episode) continue;

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
  }

  if (result.rows.length === 0) {
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
