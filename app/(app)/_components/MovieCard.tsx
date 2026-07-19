"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { posterUrl } from "@/lib/tmdb";
import { getMovieModalDetails } from "@/app/(app)/actions";
import { MovieActionButton } from "@/app/(app)/_components/MovieActionButton";
import { ExternalLinks } from "@/app/(app)/_components/ExternalLinks";
import { WatchProvidersList } from "@/app/(app)/_components/WatchProvidersList";

type ModalDetails = Awaited<ReturnType<typeof getMovieModalDetails>>;

// Filmkaart voor Verken. Films hebben geen eigen detailpagina, dus de poster opent
// een modal met de samenvatting en extra details. De actie-knoppen (watchlist/gezien)
// zitten zowel op de kaart als in de modal.
export function MovieCard({
  tmdbId,
  title,
  year,
  overview,
  posterPath,
  imdbId,
  initialState = "none",
}: {
  tmdbId: number;
  title: string;
  year: string | null;
  overview: string;
  posterPath: string | null;
  imdbId?: string | null;
  initialState?: "none" | "watchlist" | "watched";
}) {
  const [open, setOpen] = useState(false);
  // De modal kan naar een andere film uit dezelfde reeks springen; activeId is de
  // film die de modal nú toont, de props blijven die van de kaart zelf.
  const [activeId, setActiveId] = useState(tmdbId);
  const [details, setDetails] = useState<ModalDetails | null>(null);
  // Status van déze film, gedeeld door de knop op de kaart en die in de modal.
  const [ownState, setOwnState] = useState(initialState);
  const poster = posterUrl(posterPath, "w342");

  const isOwnCard = activeId === tmdbId;
  // Zolang de details nog laden tonen we voor de eigen kaart de props (voelt
  // instant); bij een ander deel van de reeks wachten we op de echte gegevens.
  const shownTitle = details?.title ?? (isOwnCard ? title : "");
  const shownYear = details?.year ?? (isOwnCard ? year : null);
  const shownOverview = details?.overview ?? (isOwnCard ? overview : "");
  const shownPoster = posterUrl(details?.posterPath ?? (isOwnCard ? posterPath : null), "w500");
  const shownImdbId = details?.imdbId ?? (isOwnCard ? imdbId : null);
  // Voor de eigen film is ownState leidend: die is al bijgewerkt door een klik,
  // terwijl details?.state de stand van het laatste ophaalmoment is.
  const shownState = isOwnCard ? ownState : (details?.state ?? "none");

  // Lazy: alleen ophalen zodra de modal daadwerkelijk opengaat, niet al bij het
  // renderen van elke kaart in een grid/carousel. Draait opnieuw bij het wisselen
  // naar een ander deel van de reeks.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setDetails(null);
    getMovieModalDetails(activeId).then((d) => {
      if (!cancelled) setDetails(d);
    });
    return () => {
      cancelled = true;
    };
  }, [open, activeId]);

  // Bij het sluiten terug naar de eigen film, zodat een volgende klik op de kaart
  // niet nog het laatst bekeken deel van de reeks laat zien.
  function closeModal() {
    setOpen(false);
    setActiveId(tmdbId);
    setDetails(null);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/10 bg-(--color-panel2)">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block h-full w-full"
          title={`Details van ${title}`}
        >
          {poster ? (
            <Image
              src={poster}
              alt={title}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 180px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl">🎬</div>
          )}
        </button>
        <div className="absolute bottom-1.5 right-1.5">
          <MovieActionButton
            tmdbId={tmdbId}
            value={ownState}
            onChange={setOwnState}
            compact
          />
        </div>
      </div>

      <div className="min-w-0 px-0.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block max-w-full truncate text-left text-sm font-medium hover:underline"
          title={title}
        >
          {title}
        </button>
        {year && <p className="truncate text-xs text-(--color-muted)">{year}</p>}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={shownTitle}
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[85vh] w-full max-w-lg gap-4 overflow-y-auto rounded-2xl border border-white/10 bg-(--color-panel) p-5"
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="Sluiten"
              className="absolute right-3 top-3 rounded-lg px-2 py-1 text-(--color-muted) hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>

            {shownPoster && (
              <div className="relative hidden aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 sm:block">
                <Image
                  src={shownPoster}
                  alt={shownTitle}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </div>
            )}

            <div className="min-w-0 flex-1 pr-6">
              <h2 className="text-lg font-semibold">{shownTitle || "Laden…"}</h2>
              {shownYear && <p className="mb-3 text-sm text-(--color-muted)">{shownYear}</p>}
              <p className="mb-4 text-sm leading-relaxed text-(--color-muted)">
                {shownOverview || (details ? "Geen samenvatting beschikbaar." : "")}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {isOwnCard ? (
                  <MovieActionButton
                    tmdbId={activeId}
                    value={ownState}
                    onChange={setOwnState}
                  />
                ) : (
                  // Een ander deel van de reeks: eigen state, key zodat hij
                  // opnieuw begint bij het wisselen van film.
                  <MovieActionButton
                    key={activeId}
                    tmdbId={activeId}
                    initial={shownState}
                  />
                )}
                <Link
                  href={`/similar/movie/${activeId}`}
                  className="text-xs text-(--color-muted) underline decoration-white/20 hover:text-white"
                >
                  Soortgelijke films
                </Link>
                <ExternalLinks
                  imdbId={shownImdbId}
                  tmdbId={activeId}
                  kind="movie"
                  trailerUrl={details?.trailerUrl}
                />
              </div>
              <div className="mt-4">
                <WatchProvidersList providers={details?.providers ?? null} />
              </div>

              {details?.collection && (
                <div className="mt-5">
                  <p className="text-[10px] uppercase tracking-wide text-(--color-muted)">
                    Filmreeks
                  </p>
                  <h3 className="mb-2 text-sm font-semibold">{details.collection.name}</h3>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {details.collection.parts.map((p) => {
                      const partPoster = posterUrl(p.posterPath, "w185");
                      const isCurrent = p.tmdbId === activeId;
                      return (
                        <div key={p.tmdbId} className="w-24 shrink-0">
                          <div
                            className={`relative aspect-[2/3] overflow-hidden rounded-lg border bg-(--color-panel2) ${
                              isCurrent ? "border-(--color-accent)" : "border-white/10"
                            }`}
                          >
                            {/* Klik op een deel: de modal toont die film, zonder de
                                pagina te verlaten. De actieknop ligt er los overheen
                                (een knop in een knop mag niet). */}
                            <button
                              type="button"
                              onClick={() => setActiveId(p.tmdbId)}
                              disabled={isCurrent}
                              title={isCurrent ? p.title : `Bekijk ${p.title}`}
                              className="absolute inset-0 h-full w-full disabled:cursor-default"
                            >
                              {partPoster ? (
                                <Image
                                  src={partPoster}
                                  alt={p.title}
                                  fill
                                  sizes="96px"
                                  className="object-cover"
                                />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-2xl">
                                  🎬
                                </span>
                              )}
                            </button>
                            {!isCurrent && (
                              <div className="absolute bottom-1 right-1">
                                {/* De eigen film kan óók als tegel in de strook staan;
                                    die deelt de status met de kaart eronder. */}
                                {p.tmdbId === tmdbId ? (
                                  <MovieActionButton
                                    tmdbId={p.tmdbId}
                                    value={ownState}
                                    onChange={setOwnState}
                                    compact
                                  />
                                ) : (
                                  <MovieActionButton
                                    tmdbId={p.tmdbId}
                                    initial={p.state}
                                    compact
                                  />
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveId(p.tmdbId)}
                            disabled={isCurrent}
                            className="mt-1 block max-w-full truncate text-left text-xs font-medium enabled:hover:underline"
                            title={p.title}
                          >
                            {p.title}
                          </button>
                          {p.year && (
                            <p className="text-[10px] text-(--color-muted)">{p.year}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
