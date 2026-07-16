import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import {
  getShowRecommendations,
  getMovieRecommendations,
  getShowStatus,
  type DiscoverItem,
} from "@/lib/tmdb";
import { DiscoverCard } from "@/app/(app)/_components/DiscoverCard";

export const dynamic = "force-dynamic";

// Overzicht van soortgelijke titels bij een serie of film (TMDB /recommendations).
// Serie → soortgelijke series, film → soortgelijke films.
export default async function SimilarPage({
  params,
}: {
  params: Promise<{ kind: string; tmdbId: string }>;
}) {
  await requireUser();
  const { kind, tmdbId: tmdbIdStr } = await params;
  const tmdbId = Number(tmdbIdStr);
  if ((kind !== "tv" && kind !== "movie") || !Number.isFinite(tmdbId)) notFound();

  const items: DiscoverItem[] =
    kind === "tv"
      ? await getShowRecommendations(tmdbId)
      : await getMovieRecommendations(tmdbId);

  // Voor series de "loopt/geëindigd"-status aanvullen (recommendations-lijst heeft die niet).
  if (kind === "tv") {
    const statusPairs = await Promise.all(
      items.map(async (it) => [it.id, await getShowStatus(it.id).catch(() => null)] as const)
    );
    const statusMap = new Map(statusPairs);
    for (const it of items) it.status = statusMap.get(it.id) ?? null;
  }

  const title = kind === "tv" ? "Soortgelijke series" : "Soortgelijke films";

  return (
    <main>
      <h1 className="mb-6 text-xl font-semibold">{title}</h1>

      {items.length === 0 ? (
        <p className="text-(--color-muted)">Geen soortgelijke titels gevonden.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
          {items.map((item) => (
            <DiscoverCard key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}
