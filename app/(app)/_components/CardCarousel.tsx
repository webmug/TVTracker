import type { DiscoverItem } from "@/lib/tmdb";
import { PosterCard } from "@/app/(app)/_components/PosterCard";
import { FollowButton } from "@/app/(app)/_components/FollowButton";
import { MovieActionButton } from "@/app/(app)/_components/MovieActionButton";

// Horizontaal scrollende rij aanbevelingen voor de Verken-pagina. Elke kaart
// krijgt de juiste actie: series → volgen, films → watchlist/gezien.
export function CardCarousel({ title, items }: { title: string; items: DiscoverItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-medium">{title}</h2>
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {items.map((item) => (
          <div key={`${item.kind}-${item.id}`} className="w-36 shrink-0 snap-start">
            <PosterCard
              posterPath={item.posterPath}
              title={item.title}
              subtitle={item.year}
              href={item.kind === "tv" ? `/show/${item.id}` : undefined}
              fallbackEmoji={item.kind === "tv" ? "📺" : "🎬"}
              action={
                item.kind === "tv" ? (
                  <FollowButton tmdbId={item.id} following={false} />
                ) : (
                  <MovieActionButton tmdbId={item.id} compact />
                )
              }
            />
          </div>
        ))}
      </div>
    </section>
  );
}
