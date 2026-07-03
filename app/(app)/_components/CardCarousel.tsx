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
        label.ended ? "bg-black/70 text-[--color-muted]" : "bg-emerald-600/80 text-white"
      }`}
    >
      {label.text}
    </span>
  );
}

// Horizontaal scrollende rij aanbevelingen voor de Verken-pagina. Elke kaart
// krijgt de juiste actie: series → volgen, films → watchlist/gezien + detailmodal.
export function CardCarousel({ title, items }: { title: string; items: DiscoverItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-medium">{title}</h2>
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {items.map((item) => (
          <div key={`${item.kind}-${item.id}`} className="w-36 shrink-0 snap-start">
            {item.kind === "tv" ? (
              <PosterCard
                posterPath={item.posterPath}
                title={item.title}
                subtitle={item.year}
                href={`/show/${item.id}`}
                fallbackEmoji="📺"
                badge={<StatusBadge status={item.status} />}
                action={<FollowButton tmdbId={item.id} following={false} />}
              />
            ) : (
              <MovieCard
                tmdbId={item.id}
                title={item.title}
                year={item.year}
                overview={item.overview}
                posterPath={item.posterPath}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
