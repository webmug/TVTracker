import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { syncShow } from "@/lib/shows";
import { posterUrl } from "@/lib/tmdb";
import { FollowButton } from "@/app/(app)/_components/FollowButton";
import { ExternalLinks } from "@/app/(app)/_components/ExternalLinks";
import { ShowSeasonsToggle } from "@/app/(app)/_components/ShowSeasonsToggle";
import { SeasonSection } from "@/app/(app)/_components/SeasonSection";

export default async function ShowPage({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}) {
  const user = await requireUser();
  const { tmdbId: tmdbIdStr } = await params;
  const tmdbId = Number(tmdbIdStr);
  if (!Number.isFinite(tmdbId)) notFound();

  // Zorg dat serie + afleveringen in de DB staan (idempotent, met cache-guard).
  await syncShow(tmdbId);

  const show = await prisma.show.findUnique({
    where: { tmdbId },
    include: { episodes: { orderBy: [{ season: "asc" }, { number: "asc" }] } },
  });
  if (!show) notFound();

  const follow = await prisma.follow.findUnique({
    where: { userId_showId: { userId: user.id, showId: show.id } },
  });

  const watched = new Set(
    (
      await prisma.watchedEpisode.findMany({
        where: {
          userId: user.id,
          episode: { showId: show.id },
        },
        select: { episodeId: true },
      })
    ).map((w) => w.episodeId)
  );

  // Groepeer per seizoen.
  const seasons = new Map<number, typeof show.episodes>();
  for (const ep of show.episodes) {
    if (!seasons.has(ep.season)) seasons.set(ep.season, []);
    seasons.get(ep.season)!.push(ep);
  }

  const poster = posterUrl(show.posterPath, "w342");
  const totalWatched = watched.size;
  const total = show.episodes.length;
  const allWatched = total > 0 && totalWatched === total;

  return (
    <main>
      <div className="flex gap-4">
        {poster ? (
          <Image
            src={poster}
            alt={show.name}
            width={120}
            height={180}
            className="h-44 w-28 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-44 w-28 items-center justify-center rounded-lg bg-[--color-panel2] text-4xl">
            📺
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{show.name}</h1>
          <p className="mt-1 text-sm text-[--color-muted]">
            {show.status ?? ""} · {totalWatched}/{total} gezien
          </p>
          <p className="mt-2 line-clamp-4 text-sm text-[--color-muted]">
            {show.overview}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <FollowButton tmdbId={tmdbId} following={Boolean(follow)} />
            {total > 0 && (
              <ShowSeasonsToggle tmdbId={tmdbId} allWatched={allWatched} />
            )}
            <ExternalLinks imdbId={show.imdbId} tmdbId={show.tmdbId} kind="tv" />
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-8">
        {[...seasons.entries()].map(([season, eps]) => {
          const watchedCount = eps.filter((e) => watched.has(e.id)).length;
          return (
            <SeasonSection
              key={season}
              tmdbId={tmdbId}
              season={season}
              allWatched={watchedCount === eps.length}
              watchedCount={watchedCount}
              total={eps.length}
              eps={eps.map((e) => ({
                id: e.id,
                season: e.season,
                number: e.number,
                name: e.name,
                airDate: e.airDate,
              }))}
              watchedIds={eps.filter((e) => watched.has(e.id)).map((e) => e.id)}
            />
          );
        })}
      </div>
    </main>
  );
}
