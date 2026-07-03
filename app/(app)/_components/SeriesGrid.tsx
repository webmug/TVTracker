"use client";

import { InfiniteGrid } from "@/app/(app)/_components/InfiniteGrid";
import { PosterCard } from "@/app/(app)/_components/PosterCard";
import { loadMoreSeries } from "@/app/(app)/actions";
import type { SeriesCard, FollowFilter } from "@/lib/library";

export function SeriesGrid({
  initialItems,
  filter,
  pageSize,
}: {
  initialItems: SeriesCard[];
  filter: FollowFilter;
  pageSize: number;
}) {
  return (
    <InfiniteGrid<SeriesCard>
      initialItems={initialItems}
      pageSize={pageSize}
      loadMore={(offset) => loadMoreSeries(offset, filter)}
      itemKey={(s) => s.tmdbId}
      renderItem={(s) => {
        const complete = s.total > 0 && s.watched >= s.total;
        return (
          <PosterCard
            posterPath={s.posterPath}
            title={s.name}
            subtitle={s.total > 0 ? `${s.watched}/${s.total} gezien` : null}
            href={`/show/${s.tmdbId}`}
            fallbackEmoji="📺"
            badge={
              <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                {complete ? "✓ bij" : `${s.watched}/${s.total}`}
              </span>
            }
          />
        );
      }}
    />
  );
}
