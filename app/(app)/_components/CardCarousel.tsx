import { type DiscoverItem } from "@/lib/tmdb";
import { DiscoverCard } from "@/app/(app)/_components/DiscoverCard";

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
            <DiscoverCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
