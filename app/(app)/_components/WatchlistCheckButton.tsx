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
      className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-sm text-[--color-muted] hover:text-white disabled:opacity-50"
    >
      {pending ? "…" : "✓ Gezien"}
    </button>
  );
}
