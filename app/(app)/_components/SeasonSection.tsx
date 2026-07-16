"use client";

import { useState } from "react";
import { WatchedCheckbox } from "@/app/(app)/_components/WatchedCheckbox";
import { SeasonActions } from "@/app/(app)/_components/SeasonActions";
import { MarkThroughButton } from "@/app/(app)/_components/MarkThroughButton";

type Ep = {
  id: string;
  season: number;
  number: number;
  name: string | null;
  airDate: Date | null;
};

function epLabel(season: number, number: number): string {
  return `S${String(season).padStart(2, "0")}E${String(number).padStart(2, "0")}`;
}

export function SeasonSection({
  tmdbId,
  season,
  allWatched,
  watchedCount,
  total,
  eps,
  watchedIds,
}: {
  tmdbId: number;
  season: number;
  allWatched: boolean;
  watchedCount: number;
  total: number;
  eps: Ep[];
  watchedIds: string[];
}) {
  // Volledig geziene seizoenen starten ingeklapt; de gebruiker kan open/dicht.
  const [collapsed, setCollapsed] = useState(allWatched);
  const watched = new Set(watchedIds);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex min-w-0 items-center gap-2 text-left"
          aria-expanded={!collapsed}
        >
          <span className="text-(--color-muted)">{collapsed ? "▸" : "▾"}</span>
          <h2 className="text-lg font-medium">
            {season === 0 ? "Specials" : `Seizoen ${season}`}
          </h2>
          {collapsed && (
            <span className="text-sm text-(--color-muted)">
              {watchedCount}/{total} gezien
            </span>
          )}
        </button>
        <div onClick={(e) => e.stopPropagation()}>
          <SeasonActions tmdbId={tmdbId} season={season} allWatched={allWatched} />
        </div>
      </div>
      {!collapsed && (
        <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-(--color-panel)">
          {eps.map((ep) => {
            const isWatched = watched.has(ep.id);
            const future = ep.airDate && ep.airDate.getTime() > Date.now();
            return (
              <li key={ep.id} className="flex items-center gap-3 px-3 py-2.5">
                <WatchedCheckbox episodeId={ep.id} watched={isWatched} />
                <div className="min-w-0 flex-1">
                  <span className="text-sm">
                    <span className="text-(--color-muted)">
                      {epLabel(ep.season, ep.number)}
                    </span>{" "}
                    {ep.name}
                  </span>
                  {ep.airDate && (
                    <span
                      className={
                        "ml-2 text-xs " +
                        (future ? "text-amber-300/80" : "text-(--color-muted)")
                      }
                    >
                      {future ? "verwacht " : ""}
                      {ep.airDate.toLocaleDateString("nl-NL")}
                    </span>
                  )}
                </div>
                {!isWatched && !future && (
                  <MarkThroughButton tmdbId={tmdbId} episodeId={ep.id} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
