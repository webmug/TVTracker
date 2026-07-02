// Lichte TMDB v3 API-client. Werkt met een v3 API key (TMDB_API_KEY) of een
// v4 Read Access Token (TMDB_BEARER).

const BASE = "https://api.themoviedb.org/3";
export const TMDB_IMG = "https://image.tmdb.org/t/p";

function authParams(): { headers: Record<string, string>; query: string } {
  const bearer = process.env.TMDB_BEARER;
  if (bearer) {
    return { headers: { Authorization: `Bearer ${bearer}` }, query: "" };
  }
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY of TMDB_BEARER ontbreekt in env.");
  return { headers: {}, query: `api_key=${key}` };
}

async function tmdb<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const { headers, query } = authParams();
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) usp.set(k, String(v));
  if (query) usp.set("api_key", query.split("=")[1]);
  const url = `${BASE}${path}?${usp.toString()}`;
  const res = await fetch(url, { headers, next: { revalidate: 60 * 60 } });
  if (!res.ok) {
    throw new Error(`TMDB ${path} -> ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface TmdbSearchResult {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  first_air_date: string | null;
}

export interface TmdbShowDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  status: string | null;
  first_air_date: string | null;
  number_of_seasons: number;
  seasons: { season_number: number; episode_count: number }[];
}

export interface TmdbEpisode {
  id: number;
  season_number: number;
  episode_number: number;
  name: string | null;
  overview: string | null;
  air_date: string | null;
}

export async function searchShows(query: string): Promise<TmdbSearchResult[]> {
  if (!query.trim()) return [];
  const data = await tmdb<{ results: TmdbSearchResult[] }>("/search/tv", {
    query,
    include_adult: "false",
  });
  return data.results ?? [];
}

export async function getShow(tmdbId: number): Promise<TmdbShowDetails> {
  return tmdb<TmdbShowDetails>(`/tv/${tmdbId}`);
}

export interface TmdbMovieResult {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string | null;
}

export interface TmdbMovieDetails extends TmdbMovieResult {
  status: string | null;
}

export async function searchMovies(query: string): Promise<TmdbMovieResult[]> {
  if (!query.trim()) return [];
  const data = await tmdb<{ results: TmdbMovieResult[] }>("/search/movie", {
    query,
    include_adult: "false",
  });
  return data.results ?? [];
}

export async function getMovie(tmdbId: number): Promise<TmdbMovieDetails> {
  return tmdb<TmdbMovieDetails>(`/movie/${tmdbId}`);
}

export async function getSeasonEpisodes(
  tmdbId: number,
  seasonNumber: number
): Promise<TmdbEpisode[]> {
  const data = await tmdb<{ episodes: TmdbEpisode[] }>(
    `/tv/${tmdbId}/season/${seasonNumber}`
  );
  return data.episodes ?? [];
}

// Alle afleveringen van alle (echte, season >= 1) seizoenen.
export async function getAllEpisodes(details: TmdbShowDetails): Promise<TmdbEpisode[]> {
  const seasons = details.seasons.filter((s) => s.season_number >= 1);
  const all: TmdbEpisode[] = [];
  for (const s of seasons) {
    const eps = await getSeasonEpisodes(details.id, s.season_number);
    all.push(...eps);
  }
  return all;
}

export function posterUrl(path: string | null | undefined, size = "w342"): string | null {
  if (!path) return null;
  return `${TMDB_IMG}/${size}${path}`;
}

export function parseDate(d: string | null | undefined): Date | null {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}
