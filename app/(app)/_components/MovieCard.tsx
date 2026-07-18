"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { posterUrl, type WatchProviders } from "@/lib/tmdb";
import { getMovieWatchProviders, getMovieCollectionInfo } from "@/app/(app)/actions";
import { MovieActionButton } from "@/app/(app)/_components/MovieActionButton";
import { ExternalLinks } from "@/app/(app)/_components/ExternalLinks";
import { WatchProvidersList } from "@/app/(app)/_components/WatchProvidersList";

type CollectionInfo = Awaited<ReturnType<typeof getMovieCollectionInfo>>;

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
  const [providers, setProviders] = useState<WatchProviders | null>(null);
  const [collection, setCollection] = useState<CollectionInfo>(null);
  const poster = posterUrl(posterPath, "w342");
  const posterLarge = posterUrl(posterPath, "w500");

  // Lazy: alleen ophalen zodra de modal daadwerkelijk opengaat, niet al bij het
  // renderen van elke kaart in een grid/carousel.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getMovieWatchProviders(tmdbId).then((p) => {
      if (!cancelled) setProviders(p);
    });
    getMovieCollectionInfo(tmdbId).then((c) => {
      if (!cancelled) setCollection(c);
    });
    return () => {
      cancelled = true;
    };
  }, [open, tmdbId]);

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
          <MovieActionButton tmdbId={tmdbId} initial={initialState} compact />
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
          aria-label={title}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[85vh] w-full max-w-lg gap-4 overflow-y-auto rounded-2xl border border-white/10 bg-(--color-panel) p-5"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Sluiten"
              className="absolute right-3 top-3 rounded-lg px-2 py-1 text-(--color-muted) hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>

            {posterLarge && (
              <div className="relative hidden aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 sm:block">
                <Image src={posterLarge} alt={title} fill sizes="112px" className="object-cover" />
              </div>
            )}

            <div className="min-w-0 flex-1 pr-6">
              <h2 className="text-lg font-semibold">{title}</h2>
              {year && <p className="mb-3 text-sm text-(--color-muted)">{year}</p>}
              <p className="mb-4 text-sm leading-relaxed text-(--color-muted)">
                {overview || "Geen samenvatting beschikbaar."}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <MovieActionButton tmdbId={tmdbId} initial={initialState} />
                <Link
                  href={`/similar/movie/${tmdbId}`}
                  className="text-xs text-(--color-muted) underline decoration-white/20 hover:text-white"
                >
                  Soortgelijke films
                </Link>
                <ExternalLinks imdbId={imdbId} tmdbId={tmdbId} kind="movie" />
              </div>
              <div className="mt-4">
                <WatchProvidersList providers={providers} />
              </div>

              {collection && (
                <div className="mt-5">
                  <p className="text-[10px] uppercase tracking-wide text-(--color-muted)">
                    Filmreeks
                  </p>
                  <h3 className="mb-2 text-sm font-semibold">{collection.name}</h3>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {collection.parts.map((p) => {
                      const partPoster = posterUrl(p.posterPath, "w185");
                      const isCurrent = p.tmdbId === tmdbId;
                      return (
                        <div key={p.tmdbId} className="w-24 shrink-0">
                          <div
                            className={`relative aspect-[2/3] overflow-hidden rounded-lg border bg-(--color-panel2) ${
                              isCurrent ? "border-(--color-accent)" : "border-white/10"
                            }`}
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
                              <div className="flex h-full w-full items-center justify-center text-2xl">
                                🎬
                              </div>
                            )}
                            {!isCurrent && (
                              <div className="absolute bottom-1 right-1">
                                <MovieActionButton tmdbId={p.tmdbId} initial={p.state} compact />
                              </div>
                            )}
                          </div>
                          <p className="mt-1 truncate text-xs font-medium" title={p.title}>
                            {p.title}
                          </p>
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
