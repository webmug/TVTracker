// Kleine rij met externe links naar IMDb en TMDB. Gebruikt op de showpagina en
// onder de filmtegels. IMDb wordt alleen getoond als er een imdbId bekend is;
// de TMDB-link is er altijd (tmdbId hebben we altijd).
export function ExternalLinks({
  imdbId,
  tmdbId,
  kind,
}: {
  imdbId?: string | null;
  tmdbId: number;
  kind: "tv" | "movie";
}) {
  const linkClass =
    "text-xs text-(--color-muted) underline decoration-white/20 hover:text-white";

  return (
    <div className="flex flex-wrap items-center gap-3">
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
