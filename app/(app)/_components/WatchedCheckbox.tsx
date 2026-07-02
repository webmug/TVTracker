"use client";

import { useTransition } from "react";
import { toggleWatched } from "@/app/(app)/actions";

export function WatchedCheckbox({
  episodeId,
  watched,
}: {
  episodeId: string;
  watched: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      disabled={pending}
      aria-pressed={watched}
      title={watched ? "Gezien — klik om terug te zetten" : "Markeer als gezien"}
      onClick={() => start(async () => toggleWatched(episodeId, !watched))}
      className={
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm transition disabled:opacity-50 " +
        (watched
          ? "border-[--color-accent] bg-[--color-accent] text-white"
          : "border-white/20 text-transparent hover:border-white/50")
      }
    >
      ✓
    </button>
  );
}
