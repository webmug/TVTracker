"use client";

import { useState, useTransition } from "react";
import { addMovieToWatchlist, markMovieWatchedByTmdb } from "@/app/(app)/actions";

type State = "none" | "watchlist" | "watched";

// Actie-knoppen voor een film-kaart (zoeken/Verken): op de watchlist zetten of
// meteen als gezien markeren. Werkt op TMDB-id en synct de film indien nodig.
export function MovieActionButton({
  tmdbId,
  initial = "none",
  compact = false,
}: {
  tmdbId: number;
  initial?: State;
  compact?: boolean;
}) {
  const [state, setState] = useState<State>(initial);
  const [pending, start] = useTransition();

  const base =
    "rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:opacity-50 backdrop-blur";

  if (state === "watched") {
    return (
      <span className={`${base} bg-emerald-600/80 text-white`}>✓ Gezien</span>
    );
  }

  if (state === "watchlist") {
    return (
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            await markMovieWatchedByTmdb(tmdbId);
            setState("watched");
          })
        }
        title="Markeer als gezien"
        className={`${base} bg-(--color-accent) text-white hover:opacity-90`}
      >
        {pending ? "…" : "✓ Gezien"}
      </button>
    );
  }

  return (
    <div className={compact ? "flex flex-col gap-1" : "flex gap-1"}>
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            await addMovieToWatchlist(tmdbId);
            setState("watchlist");
          })
        }
        title="Op watchlist"
        className={`${base} bg-black/60 text-white hover:bg-black/80`}
      >
        {pending ? "…" : "+ Watchlist"}
      </button>
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            await markMovieWatchedByTmdb(tmdbId);
            setState("watched");
          })
        }
        title="Al gezien"
        className={`${base} bg-black/60 text-white hover:bg-black/80`}
      >
        {pending ? "…" : "✓ Gezien"}
      </button>
    </div>
  );
}
