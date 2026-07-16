import { tvStatusLabel, type DiscoverItem } from "@/lib/tmdb";
import { PosterCard } from "@/app/(app)/_components/PosterCard";
import { FollowButton } from "@/app/(app)/_components/FollowButton";
import { MovieCard } from "@/app/(app)/_components/MovieCard";

// Kleine badge die aangeeft of een serie nog loopt of geëindigd is.
function StatusBadge({ status }: { status: string | null | undefined }) {
  const label = tvStatusLabel(status);
  if (!label) return null;
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium backdrop-blur ${
        label.ended ? "bg-black/70 text-(--color-muted)" : "bg-emerald-600/80 text-white"
      }`}
    >
      {label.text}
    </span>
  );
}

// Eén ontdek-kaart met de juiste actie per media-type: series → volgen (poster linkt
// naar de detailpagina), films → watchlist/gezien + detailmodal. Gedeeld door zowel de
// horizontale carousel als de grids (bv. Soortgelijke).
export function DiscoverCard({ item }: { item: DiscoverItem }) {
  if (item.kind === "tv") {
    return (
      <PosterCard
        posterPath={item.posterPath}
        title={item.title}
        subtitle={item.year}
        href={`/show/${item.id}`}
        fallbackEmoji="📺"
        badge={<StatusBadge status={item.status} />}
        action={<FollowButton tmdbId={item.id} following={false} />}
      />
    );
  }
  return (
    <MovieCard
      tmdbId={item.id}
      title={item.title}
      year={item.year}
      overview={item.overview}
      posterPath={item.posterPath}
    />
  );
}
