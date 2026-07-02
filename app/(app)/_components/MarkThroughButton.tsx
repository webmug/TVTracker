"use client";

import { useTransition } from "react";
import { markWatchedThrough } from "@/app/(app)/actions";

export function MarkThroughButton({
  tmdbId,
  episodeId,
}: {
  tmdbId: number;
  episodeId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      title="Markeer alles t/m deze aflevering als gezien"
      onClick={() => start(async () => markWatchedThrough(tmdbId, episodeId))}
      className="text-xs text-[--color-muted] underline decoration-dotted hover:text-white disabled:opacity-50"
    >
      {pending ? "…" : "t/m hier"}
    </button>
  );
}
