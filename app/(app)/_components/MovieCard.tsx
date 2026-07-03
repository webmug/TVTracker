"use client";

import { useState } from "react";
import Image from "next/image";
import { posterUrl } from "@/lib/tmdb";
import { MovieActionButton } from "@/app/(app)/_components/MovieActionButton";

// Filmkaart voor Verken. Films hebben geen eigen detailpagina, dus de poster opent
// een modal met de samenvatting en extra details. De actie-knoppen (watchlist/gezien)
// zitten zowel op de kaart als in de modal.
export function MovieCard({
  tmdbId,
  title,
  year,
  overview,
  posterPath,
}: {
  tmdbId: number;
  title: string;
  year: string | null;
  overview: string;
  posterPath: string | null;
}) {
  const [open, setOpen] = useState(false);
  const poster = posterUrl(posterPath, "w342");
  const posterLarge = posterUrl(posterPath, "w500");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/10 bg-[--color-panel2]">
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
          <MovieActionButton tmdbId={tmdbId} compact />
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
        {year && <p className="truncate text-xs text-[--color-muted]">{year}</p>}
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
            className="relative flex max-h-[85vh] w-full max-w-lg gap-4 overflow-y-auto rounded-2xl border border-white/10 bg-[--color-panel] p-5"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Sluiten"
              className="absolute right-3 top-3 rounded-lg px-2 py-1 text-[--color-muted] hover:bg-white/10 hover:text-white"
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
              {year && <p className="mb-3 text-sm text-[--color-muted]">{year}</p>}
              <p className="mb-4 text-sm leading-relaxed text-[--color-muted]">
                {overview || "Geen samenvatting beschikbaar."}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <MovieActionButton tmdbId={tmdbId} />
                <a
                  href={`https://www.themoviedb.org/movie/${tmdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[--color-muted] underline decoration-white/20 hover:text-white"
                >
                  TMDB
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
