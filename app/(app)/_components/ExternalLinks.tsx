// Kleine rij met externe links naar de trailer, IMDb en TMDB. Gebruikt op de
// showpagina en onder de filmtegels. IMDb wordt alleen getoond als er een imdbId
// bekend is; de TMDB-link is er altijd (tmdbId hebben we altijd). De trailer
// verschijnt alleen als TMDB er een kent.
export function ExternalLinks({
  imdbId,
  tmdbId,
  kind,
  trailerUrl,
}: {
  imdbId?: string | null;
  tmdbId: number;
  kind: "tv" | "movie";
  trailerUrl?: string | null;
}) {
  const linkClass =
    "text-xs text-(--color-muted) underline decoration-white/20 hover:text-white";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {trailerUrl && (
        <a
          href={trailerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          ▶ Trailer
        </a>
      )}
      {imdbId && (
        <a
          href={`https://www.imdb.com/title/${imdbId}/`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          IMDb
        </a>
      )}
      <a
        href={`https://www.themoviedb.org/${kind}/${tmdbId}`}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        TMDB
      </a>
    </div>
  );
}
