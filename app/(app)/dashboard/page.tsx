import Link from "next/link";
import Image from "next/image";
import type { FollowStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { posterUrl } from "@/lib/tmdb";
import { WatchedCheckbox } from "@/app/(app)/_components/WatchedCheckbox";
import { PosterCard } from "@/app/(app)/_components/PosterCard";

function epLabel(season: number, number: number): string {
  return `S${String(season).padStart(2, "0")}E${String(number).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const user = await requireUser();

  const now = new Date();
  const activeStatuses: FollowStatus[] = ["WATCHING", "PAUSED"];
  const followedShows = {
    follows: { some: { userId: user.id, status: { in: activeStatuses } } },
  };

  // Alleen de relevante afleveringen laden i.p.v. álle afleveringen van álle
  // gevolgde series: (1) uitgezonden + nog ongezien, (2) eerstvolgende toekomstige.
  const [airedUnwatched, future] = await Promise.all([
    prisma.episode.findMany({
      where: {
        show: followedShows,
        airDate: { lte: now },
        watched: { none: { userId: user.id } },
      },
      orderBy: [{ showId: "asc" }, { season: "asc" }, { number: "asc" }],
      select: {
        id: true,
        season: true,
        number: true,
        name: true,
        airDate: true,
        showId: true,
        show: { select: { tmdbId: true, name: true, posterPath: true } },
      },
    }),
    prisma.episode.findMany({
      where: { show: followedShows, airDate: { gt: now } },
      orderBy: [{ showId: "asc" }, { season: "asc" }, { number: "asc" }],
      select: {
        season: true,
        number: true,
        name: true,
        airDate: true,
        showId: true,
        show: { select: { tmdbId: true, name: true, posterPath: true } },
      },
    }),
  ]);

  type Row = {
    tmdbId: number;
    showName: string;
    posterPath: string | null;
    episodeId: string;
    label: string;
    epName: string | null;
    airDate: Date | null;
    remaining: number;
  };

  const upNext: Row[] = [];
  const upcoming: {
    tmdbId: number;
    showName: string;
    posterPath: string | null;
    label: string;
    epName: string | null;
    airDate: Date;
  }[] = [];

  // Per serie: eerste ongeziene uitgezonden aflevering + resterend aantal.
  const remainingByShow = new Map<string, number>();
  for (const e of airedUnwatched) {
    remainingByShow.set(e.showId, (remainingByShow.get(e.showId) ?? 0) + 1);
  }
  const firstAiredSeen = new Set<string>();
  for (const e of airedUnwatched) {
    if (firstAiredSeen.has(e.showId)) continue;
    firstAiredSeen.add(e.showId);
    upNext.push({
      tmdbId: e.show.tmdbId,
      showName: e.show.name,
      posterPath: e.show.posterPath,
      episodeId: e.id,
      label: epLabel(e.season, e.number),
      epName: e.name,
      airDate: e.airDate,
      remaining: remainingByShow.get(e.showId) ?? 1,
    });
  }

  // Per serie: eerstvolgende toekomstige aflevering.
  const firstFutureSeen = new Set<string>();
  for (const e of future) {
    if (firstFutureSeen.has(e.showId) || !e.airDate) continue;
    firstFutureSeen.add(e.showId);
    upcoming.push({
      tmdbId: e.show.tmdbId,
      showName: e.show.name,
      posterPath: e.show.posterPath,
      label: epLabel(e.season, e.number),
      epName: e.name,
      airDate: e.airDate,
    });
  }

  upNext.sort((a, b) => (b.airDate?.getTime() ?? 0) - (a.airDate?.getTime() ?? 0));
  upcoming.sort((a, b) => a.airDate.getTime() - b.airDate.getTime());

  const followCount = await prisma.follow.count({
    where: { userId: user.id, status: { in: ["WATCHING", "PAUSED"] } },
  });

  return (
    <main>
      <h1 className="mb-4 text-xl font-semibold">Up Next</h1>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        <div>
          {followCount === 0 && (
            <div className="rounded-xl border border-white/10 bg-(--color-panel) p-6 text-center">
              <p className="text-(--color-muted)">
                Je volgt nog geen series.{" "}
                <Link href="/search" className="text-(--color-accent) underline">
                  Zoek er een
                </Link>{" "}
                of{" "}
                <Link href="/import" className="text-(--color-accent) underline">
                  importeer je TV Time-historie
                </Link>
                .
              </p>
            </div>
          )}

          {upNext.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
              {upNext.map((r) => (
                <PosterCard
                  key={r.episodeId}
                  posterPath={r.posterPath}
                  title={r.showName}
                  subtitle={r.epName ? `${r.label} · ${r.epName}` : r.label}
                  href={`/show/${r.tmdbId}`}
                  badge={
                    r.remaining > 1 ? (
                      <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
                        nog {r.remaining}
                      </span>
                    ) : undefined
                  }
                  action={<WatchedCheckbox episodeId={r.episodeId} watched={false} />}
                />
              ))}
            </div>
          )}

          {upNext.length === 0 && followCount > 0 && (
            <p className="text-(--color-muted)">
              Helemaal bij! Geen ongeziene uitgezonden afleveringen. 🎉
            </p>
          )}
        </div>

        {upcoming.length > 0 && (
          <aside className="mt-10 lg:mt-0">
            <h2 className="mb-3 text-lg font-medium">Binnenkort</h2>
            <ul className="flex flex-col gap-2">
              {upcoming.map((u) => {
                const poster = posterUrl(u.posterPath, "w92");
                return (
                  <li
                    key={`${u.tmdbId}-${u.label}`}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-(--color-panel) p-2"
                  >
                    <Link href={`/show/${u.tmdbId}`} className="shrink-0">
                      {poster ? (
                        <Image
                          src={poster}
                          alt={u.showName}
                          width={40}
                          height={60}
                          className="h-15 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-15 w-10 items-center justify-center rounded bg-(--color-panel2) text-sm">
                          📺
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/show/${u.tmdbId}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {u.showName}
                      </Link>
                      <p className="truncate text-xs text-(--color-muted)">
                        {u.label}
                        {u.epName ? ` · ${u.epName}` : ""}
                      </p>
                      <p className="text-xs text-(--color-muted)">
                        {u.airDate.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </aside>
        )}
      </div>
    </main>
  );
}
