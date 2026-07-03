"use client";

import { InfiniteGrid } from "@/app/(app)/_components/InfiniteGrid";
import { PosterCard } from "@/app/(app)/_components/PosterCard";
import { ExternalLinks } from "@/app/(app)/_components/ExternalLinks";
import { loadMoreWatchedMovies } from "@/app/(app)/actions";
import type { MovieCard } from "@/lib/library";

export function WatchedMoviesGrid({
  initialItems,
  pageSize,
}: {
  initialItems: MovieCard[];
  pageSize: number;
}) {
  return (
    <InfiniteGrid<MovieCard>
      initialItems={initialItems}
      pageSize={pageSize}
      loadMore={(offset) => loadMoreWatchedMovies(offset)}
      itemKey={(m) => m.id}
      renderItem={(m) => (
        <PosterCard
          posterPath={m.posterPath}
          title={m.title}
          subtitle={m.year ? String(m.year) : null}
          fallbackEmoji="🎬"
          links={<ExternalLinks imdbId={m.imdbId} tmdbId={m.tmdbId} kind="movie" />}
        />
      )}
    />
  );
}
