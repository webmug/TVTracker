"use client";

import { useTransition } from "react";
import { markMovieWatched } from "@/app/(app)/actions";

// Vinkt een film van de watchlist af als "gezien".
export function WatchlistCheckButton({ movieId }: { movieId: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => start(async () => markMovieWatched(movieId))}
      title="Markeer als gezien"
      className="shrink-0 rounded-lg bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/80 disabled:opacity-50"
    >
      {pending ? "…" : "✓ Gezien"}
    </button>
  );
}
