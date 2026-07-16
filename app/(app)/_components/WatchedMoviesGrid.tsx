"use client";

import { InfiniteGrid } from "@/app/(app)/_components/InfiniteGrid";
import { MovieCard as MovieCardTile } from "@/app/(app)/_components/MovieCard";
import { loadMoreWatchedMovies } from "@/app/(app)/actions";
import type { MovieCard } from "@/lib/library";

export function WatchedMoviesGrid({
  initialItems,
  providerId,
  pageSize,
}: {
  initialItems: MovieCard[];
  providerId?: number;
  pageSize: number;
}) {
  return (
    <InfiniteGrid<MovieCard>
      initialItems={initialItems}
      pageSize={pageSize}
      loadMore={(offset) => loadMoreWatchedMovies(offset, providerId)}
      itemKey={(m) => m.id}
      renderItem={(m) => (
        <MovieCardTile
          tmdbId={m.tmdbId}
          title={m.title}
          year={m.year ? String(m.year) : null}
          overview={m.overview}
          posterPath={m.posterPath}
          imdbId={m.imdbId}
          initialState="watched"
        />
      )}
    />
  );
}
