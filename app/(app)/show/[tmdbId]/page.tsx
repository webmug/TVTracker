import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { syncShow } from "@/lib/shows";
import {
  posterUrl,
  getWatchProviders,
  getTrailerUrl,
  getShow,
  tvStatusLabel,
  parseDate,
  type TmdbEpisode,
} from "@/lib/tmdb";
import { FollowButton } from "@/app/(app)/_components/FollowButton";
import { ExternalLinks } from "@/app/(app)/_components/ExternalLinks";
import { ShowSeasonsToggle } from "@/app/(app)/_components/ShowSeasonsToggle";
import { SeasonSection } from "@/app/(app)/_components/SeasonSection";
import { WatchProvidersList } from "@/app/(app)/_components/WatchProvidersList";

// "S02E05"-notatie voor een aflevering.
function epCode(ep: TmdbEpisode): string {
  const s = String(ep.season_number).padStart(2, "0");
  const e = String(ep.episode_number).padStart(2, "0");
  return `S${s}E${e}`;
}

// Uitzenddatum in het Nederlands, plus een relatieve hint ("vandaag", "morgen",
// "over 6 dagen") zolang de datum in de toekomst ligt.
function airDateLabel(raw: string | null): string | null {
  const date = parseDate(raw);
  if (!date) return null;
  const formatted = date.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return `${formatted} (vandaag)`;
  if (days === 1) return `${formatted} (morgen)`;
  if (days > 1) return `${formatted} (over ${days} dagen)`;
  return formatted;
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

  // Streamingdiensten zijn een leuke extra, geen essentieel gegeven -> pagina
  // moet blijven werken als TMDB hier hapert.
  const providers = await getWatchProviders(tmdbId, "tv").catch(() => null);

  // Idem voor de trailer: leuk als het lukt, geen reden om de pagina te breken.
  const trailerUrl = await getTrailerUrl(tmdbId, "tv").catch(() => null);

  // Volgende aflevering (next_episode_to_air) live van TMDB, alleen zinvol voor
  // lopende series. Ook een extra: de pagina blijft werken als dit hapert.
  const ended = tvStatusLabel(show.status)?.ended ?? false;
  const nextEpisode = ended
    ? null
    : ((await getShow(tmdbId).catch(() => null))?.next_episode_to_air ?? null);
  const nextAirLabel = nextEpisode ? airDateLabel(nextEpisode.air_date) : null;

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
          <div className="flex h-44 w-28 items-center justify-center rounded-lg bg-(--color-panel2) text-4xl">
            📺
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{show.name}</h1>
          <p className="mt-1 text-sm text-(--color-muted)">
            {show.status ?? ""} · {totalWatched}/{total} gezien
          </p>
          <p className="mt-2 line-clamp-4 text-sm text-(--color-muted)">
            {show.overview}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <FollowButton tmdbId={tmdbId} following={Boolean(follow)} />
            {total > 0 && (
              <ShowSeasonsToggle tmdbId={tmdbId} allWatched={allWatched} />
            )}
            <Link
              href={`/similar/tv/${tmdbId}`}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-(--color-muted) hover:text-white"
            >
              Soortgelijke series
            </Link>
            <ExternalLinks
              imdbId={show.imdbId}
              tmdbId={show.tmdbId}
              kind="tv"
              trailerUrl={trailerUrl}
            />
          </div>
          <div className="mt-4">
            <WatchProvidersList providers={providers} />
          </div>
        </div>
      </div>

      {nextEpisode && (
        <div className="mt-6 rounded-xl border border-white/10 bg-(--color-panel) p-4">
          <p className="text-xs uppercase tracking-wide text-(--color-muted)">
            Volgende aflevering
          </p>
          <p className="mt-1 font-medium">
            {epCode(nextEpisode)}
            {nextEpisode.name ? ` · ${nextEpisode.name}` : ""}
          </p>
          {nextAirLabel && (
            <p className="mt-0.5 text-sm text-(--color-muted)">{nextAirLabel}</p>
          )}
          {nextEpisode.overview && (
            <p className="mt-2 line-clamp-3 text-sm text-(--color-muted)">
              {nextEpisode.overview}
            </p>
          )}
        </div>
      )}

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
                overview: e.overview,
              }))}
              watchedIds={eps.filter((e) => watched.has(e.id)).map((e) => e.id)}
            />
          );
        })}
      </div>
    </main>
  );
}
