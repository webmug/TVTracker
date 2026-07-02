import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { syncShow } from "@/lib/shows";
import { posterUrl } from "@/lib/tmdb";
import { FollowButton } from "@/app/(app)/_components/FollowButton";
import { WatchedCheckbox } from "@/app/(app)/_components/WatchedCheckbox";
import { SeasonActions } from "@/app/(app)/_components/SeasonActions";
import { MarkThroughButton } from "@/app/(app)/_components/MarkThroughButton";

function epLabel(season: number, number: number): string {
  return `S${String(season).padStart(2, "0")}E${String(number).padStart(2, "0")}`;
}

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
          <div className="mt-3">
            <FollowButton tmdbId={tmdbId} following={Boolean(follow)} />
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-8">
        {[...seasons.entries()].map(([season, eps]) => {
          const allWatched = eps.every((e) => watched.has(e.id));
          return (
            <section key={season}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-medium">
                  {season === 0 ? "Specials" : `Seizoen ${season}`}
                </h2>
                <SeasonActions tmdbId={tmdbId} season={season} allWatched={allWatched} />
              </div>
              <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-[--color-panel]">
                {eps.map((ep) => {
                  const isWatched = watched.has(ep.id);
                  const future =
                    ep.airDate && ep.airDate.getTime() > Date.now();
                  return (
                    <li key={ep.id} className="flex items-center gap-3 px-3 py-2.5">
                      <WatchedCheckbox episodeId={ep.id} watched={isWatched} />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm">
                          <span className="text-[--color-muted]">
                            {epLabel(ep.season, ep.number)}
                          </span>{" "}
                          {ep.name}
                        </span>
                        {ep.airDate && (
                          <span
                            className={
                              "ml-2 text-xs " +
                              (future ? "text-amber-300/80" : "text-[--color-muted]")
                            }
                          >
                            {future ? "verwacht " : ""}
                            {ep.airDate.toLocaleDateString("nl-NL")}
                          </span>
                        )}
                      </div>
                      {!isWatched && !future && (
                        <MarkThroughButton tmdbId={tmdbId} episodeId={ep.id} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
