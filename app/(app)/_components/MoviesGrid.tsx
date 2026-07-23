"use client";

import { InfiniteGrid } from "@/app/(app)/_components/InfiniteGrid";
import { MovieCard as MovieCardTile } from "@/app/(app)/_components/MovieCard";
import type { MovieCard } from "@/lib/library";

// Infinite-scroll grid voor de filmbibliotheek (watchlist én gezien). Krijgt de
// server-action om verder te laden mee, plus de beginstatus voor de kaartknoppen.
// Zo pagineren beide secties op /movies op dezelfde manier i.p.v. alles ineens.
export function MoviesGrid({
  initialItems,
  pageSize,
  loadMore,
  providerIds,
  initialState,
}: {
  initialItems: MovieCard[];
  pageSize: number;
  loadMore: (offset: number, providerIds?: number[]) => Promise<MovieCard[]>;
  providerIds?: number[];
  initialState: "watchlist" | "watched";
}) {
  return (
    <InfiniteGrid<MovieCard>
      initialItems={initialItems}
      pageSize={pageSize}
      loadMore={(offset) => loadMore(offset, providerIds)}
      itemKey={(m) => m.id}
      renderItem={(m) => (
        <MovieCardTile
          tmdbId={m.tmdbId}
          title={m.title}
          year={m.year ? String(m.year) : null}
          overview={m.overview}
          posterPath={m.posterPath}
          imdbId={m.imdbId}
          initialState={initialState}
        />
      )}
    />
  );
}
