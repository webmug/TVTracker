"use client";

import { useTransition } from "react";
import { toggleAllSeasons } from "@/app/(app)/actions";

export function ShowSeasonsToggle({
  tmdbId,
  allWatched,
}: {
  tmdbId: number;
  allWatched: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => toggleAllSeasons(tmdbId, !allWatched))}
      className="rounded-md border border-white/15 px-3 py-1 text-sm text-[--color-muted] hover:text-white disabled:opacity-50"
    >
      {pending ? "…" : allWatched ? "Alles niet gezien" : "Alles gezien"}
    </button>
  );
}
