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
  // Dev-only: canned data teruggeven zonder netwerk/key als TMDB_MOCK=1 staat.
  if (process.env.TMDB_MOCK === "1") {
    const { mockTmdb } = await import("@/lib/tmdb-fixtures");
    const mocked = mockTmdb(path);
    if (mocked !== undefined) return mocked as T;
  }
  const { headers, query } = authParams();
  const usp = new URLSearchParams();
  // Metadata standaard in het Nederlands (valt bij TMDB terug op Engels als er
  // geen vertaling is). Individuele calls kunnen dit via params overschrijven.
  usp.set("language", "nl-NL");
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
  // Eerstvolgende geplande aflevering; alleen gevuld bij lopende series.
  next_episode_to_air?: TmdbEpisode | null;
  // Via append_to_response=external_ids; imdb_id bv. "tt1234567".
  external_ids?: { imdb_id: string | null };
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
  return tmdb<TmdbShowDetails>(`/tv/${tmdbId}`, { append_to_response: "external_ids" });
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
  // /movie/{id} levert imdb_id direct mee (bv. "tt1234567").
  imdb_id?: string | null;
  // Filmreeks (TMDB-collection) waar de film bij hoort, bv. een trilogie.
  belongs_to_collection?: { id: number; name: string } | null;
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

// ---------------------------------------------------------------------------
// Verken: trending + aanbevelingen. TMDB levert voor /trending, /recommendations
// en /similar gemengde/media-specifieke lijsten; we normaliseren naar één vorm.
// ---------------------------------------------------------------------------

export type MediaKind = "tv" | "movie";

export interface DiscoverItem {
  kind: MediaKind;
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  year: string | null;
  // Alleen voor series, optioneel aangevuld: TMDB-status ("Ended", "Returning Series", …).
  status?: string | null;
}

// Ruwe TMDB-rij (velden verschillen per media-type).
interface RawMediaResult {
  id: number;
  media_type?: string;
  name?: string;
  title?: string;
  overview?: string;
  poster_path?: string | null;
  first_air_date?: string | null;
  release_date?: string | null;
}

function normalizeMedia(r: RawMediaResult, fallback: MediaKind): DiscoverItem {
  const kind: MediaKind = r.media_type === "movie" || r.media_type === "tv" ? r.media_type : fallback;
  const date = kind === "movie" ? r.release_date : r.first_air_date;
  return {
    kind,
    id: r.id,
    title: (kind === "movie" ? r.title : r.name) ?? r.title ?? r.name ?? "",
    overview: r.overview ?? "",
    posterPath: r.poster_path ?? null,
    year: date ? date.slice(0, 4) : null,
  };
}

export async function getTrending(
  media: MediaKind,
  window: "day" | "week" = "week"
): Promise<DiscoverItem[]> {
  const data = await tmdb<{ results: RawMediaResult[] }>(`/trending/${media}/${window}`);
  return (data.results ?? []).map((r) => normalizeMedia(r, media)).filter((i) => i.posterPath);
}

// Lichte fetch van alleen de serie-status, voor de "loopt/geëindigd"-badge op Verken.
export async function getShowStatus(tmdbId: number): Promise<string | null> {
  const data = await tmdb<{ status: string | null }>(`/tv/${tmdbId}`);
  return data.status ?? null;
}

// Vertaalt een ruwe TMDB-seriestatus naar een NL-badge; null = niet tonen.
export function tvStatusLabel(
  status: string | null | undefined
): { text: string; ended: boolean } | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === "ended" || s === "canceled" || s === "cancelled") {
    return { text: "Geëindigd", ended: true };
  }
  if (s === "returning series" || s === "in production" || s === "planned" || s === "pilot") {
    return { text: "Loopt nog", ended: false };
  }
  return null;
}

export async function getShowRecommendations(tmdbId: number): Promise<DiscoverItem[]> {
  const data = await tmdb<{ results: RawMediaResult[] }>(`/tv/${tmdbId}/recommendations`);
  return (data.results ?? []).map((r) => normalizeMedia(r, "tv")).filter((i) => i.posterPath);
}

export async function getMovieRecommendations(tmdbId: number): Promise<DiscoverItem[]> {
  const data = await tmdb<{ results: RawMediaResult[] }>(`/movie/${tmdbId}/recommendations`);
  return (data.results ?? []).map((r) => normalizeMedia(r, "movie")).filter((i) => i.posterPath);
}

// Zoekt series én films parallel en normaliseert naar één lijst.
export async function searchAll(query: string): Promise<DiscoverItem[]> {
  if (!query.trim()) return [];
  const [tv, movies] = await Promise.all([searchShows(query), searchMovies(query)]);
  const shows: DiscoverItem[] = tv.map((r) => ({
    kind: "tv",
    id: r.id,
    title: r.name,
    overview: r.overview ?? "",
    posterPath: r.poster_path,
    year: r.first_air_date ? r.first_air_date.slice(0, 4) : null,
  }));
  const films: DiscoverItem[] = movies.map((r) => ({
    kind: "movie",
    id: r.id,
    title: r.title,
    overview: r.overview ?? "",
    posterPath: r.poster_path,
    year: r.release_date ? r.release_date.slice(0, 4) : null,
  }));
  return [...shows, ...films];
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

// ---------------------------------------------------------------------------
// Filmreeksen (TMDB-collections): vervolgen/prequels van een film, bv. een
// trilogie. We halen de reeks op via de film zelf (belongs_to_collection).
// ---------------------------------------------------------------------------

export interface CollectionPart {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  year: string | null;
}

export interface MovieCollection {
  name: string;
  // Chronologisch (op releasedatum), inclusief de film zelf.
  parts: CollectionPart[];
}

export async function getMovieCollection(tmdbId: number): Promise<MovieCollection | null> {
  const movie = await getMovie(tmdbId);
  const ref = movie.belongs_to_collection;
  if (!ref) return null;
  const data = await tmdb<{ name: string; parts?: RawMediaResult[] }>(`/collection/${ref.id}`);
  const parts = (data.parts ?? [])
    .slice()
    .sort((a, b) => (a.release_date || "9999").localeCompare(b.release_date || "9999"))
    .map((p) => ({
      tmdbId: p.id,
      title: p.title ?? p.name ?? "",
      posterPath: p.poster_path ?? null,
      year: p.release_date ? p.release_date.slice(0, 4) : null,
    }));
  // Een reeks met alleen de film zelf is geen reeks.
  if (parts.length < 2) return null;
  return { name: data.name, parts };
}

// ---------------------------------------------------------------------------
// Streamingdiensten ("Kijken via"): TMDB's watch/providers-endpoint, gevoed
// door JustWatch. Regio hard op NL (het enige publiek van deze app).
// ---------------------------------------------------------------------------

const WATCH_REGION = "NL";

export interface WatchProvider {
  id: number;
  name: string;
  logoPath: string | null;
}

export interface WatchProviders {
  link: string | null;
  flatrate: WatchProvider[];
}

interface RawWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

export async function getWatchProviders(
  tmdbId: number,
  kind: MediaKind
): Promise<WatchProviders | null> {
  const data = await tmdb<{
    results?: Record<string, { link?: string; flatrate?: RawWatchProvider[] }>;
  }>(`/${kind}/${tmdbId}/watch/providers`);
  const region = data.results?.[WATCH_REGION];
  if (!region || !region.flatrate?.length) return null;
  return {
    link: region.link ?? null,
    flatrate: region.flatrate.map((p) => ({
      id: p.provider_id,
      name: p.provider_name,
      logoPath: p.logo_path,
    })),
  };
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
