"use client";

import { useTransition } from "react";
import { toggleSeason } from "@/app/(app)/actions";

export function SeasonActions({
  tmdbId,
  season,
  allWatched,
}: {
  tmdbId: number;
  season: number;
  allWatched: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => toggleSeason(tmdbId, season, !allWatched))}
      className="rounded-md border border-white/15 px-3 py-1 text-xs text-[--color-muted] hover:text-white disabled:opacity-50"
    >
      {pending
        ? "…"
        : allWatched
          ? "Seizoen niet gezien"
          : "Heel seizoen gezien"}
    </button>
  );
}
