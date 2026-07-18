"use client";

import { InfiniteGrid } from "@/app/(app)/_components/InfiniteGrid";
import { PosterCard } from "@/app/(app)/_components/PosterCard";
import { loadMoreSeries } from "@/app/(app)/actions";
import type { SeriesCard, FollowFilter } from "@/lib/library";

export function SeriesGrid({
  initialItems,
  filter,
  providerIds,
  pageSize,
}: {
  initialItems: SeriesCard[];
  filter: FollowFilter;
  providerIds?: number[];
  pageSize: number;
}) {
  return (
    <InfiniteGrid<SeriesCard>
      initialItems={initialItems}
      pageSize={pageSize}
      loadMore={(offset) => loadMoreSeries(offset, filter, providerIds)}
      itemKey={(s) => s.tmdbId}
      renderItem={(s) => {
        // Voortgang rekent over beschikbare (uitgezonden) afleveringen;
        // toekomstige afleveringen worden apart vermeld.
        const aired = s.total - s.upcoming;
        const complete = aired > 0 && s.watched >= aired;
        const progress = aired > 0 ? `${s.watched}/${aired} gezien` : null;
        const upcomingTxt = s.upcoming > 0 ? `${s.upcoming} verwacht` : null;
        const subtitle = [progress, upcomingTxt].filter(Boolean).join(" · ") || null;
        return (
          <PosterCard
            posterPath={s.posterPath}
            title={s.name}
            subtitle={subtitle}
            href={`/show/${s.tmdbId}`}
            fallbackEmoji="📺"
            badge={
              <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                {complete ? "✓ bij" : aired > 0 ? `${s.watched}/${aired}` : "binnenkort"}
              </span>
            }
          />
        );
      }}
    />
  );
}
