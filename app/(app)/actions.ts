"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { syncShow } from "@/lib/shows";

// Serie volgen (synct van TMDB indien nodig).
export async function followShow(tmdbId: number) {
  const user = await requireUser();
  const show = await syncShow(tmdbId);
  await prisma.follow.upsert({
    where: { userId_showId: { userId: user.id, showId: show.id } },
    create: { userId: user.id, showId: show.id },
    update: {},
  });
  revalidatePath("/dashboard");
  revalidatePath(`/show/${tmdbId}`);
}

export async function unfollowShow(tmdbId: number) {
  const user = await requireUser();
  const show = await prisma.show.findUnique({ where: { tmdbId } });
  if (show) {
    await prisma.follow.deleteMany({ where: { userId: user.id, showId: show.id } });
  }
  revalidatePath("/dashboard");
  revalidatePath(`/show/${tmdbId}`);
}

export async function setFollowStatus(
  tmdbId: number,
  status: "WATCHING" | "PAUSED" | "FINISHED"
) {
  const user = await requireUser();
  const show = await prisma.show.findUnique({ where: { tmdbId } });
  if (show) {
    await prisma.follow.updateMany({
      where: { userId: user.id, showId: show.id },
      data: { status },
    });
  }
  revalidatePath("/dashboard");
  revalidatePath(`/show/${tmdbId}`);
}

// Eén aflevering aan/uit vinken.
export async function toggleWatched(episodeId: string, watched: boolean) {
  const user = await requireUser();
  if (watched) {
    await prisma.watchedEpisode.upsert({
      where: { userId_episodeId: { userId: user.id, episodeId } },
      create: { userId: user.id, episodeId },
      update: {},
    });
  } else {
    await prisma.watchedEpisode.deleteMany({ where: { userId: user.id, episodeId } });
  }
  const ep = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: { show: true },
  });
  if (ep) revalidatePath(`/show/${ep.show.tmdbId}`);
  revalidatePath("/dashboard");
}

// Alle (uitgezonden) afleveringen t/m een bepaalde aflevering als gezien markeren.
export async function markWatchedThrough(showTmdbId: number, throughEpisodeId: string) {
  const user = await requireUser();
  const show = await prisma.show.findUnique({ where: { tmdbId: showTmdbId } });
  if (!show) return;
  const target = await prisma.episode.findUnique({ where: { id: throughEpisodeId } });
  if (!target) return;

  const episodes = await prisma.episode.findMany({
    where: { showId: show.id },
    orderBy: [{ season: "asc" }, { number: "asc" }],
  });

  const toMark = episodes.filter(
    (e) =>
      e.season < target.season ||
      (e.season === target.season && e.number <= target.number)
  );

  await prisma.watchedEpisode.createMany({
    data: toMark.map((e) => ({ userId: user.id, episodeId: e.id })),
    skipDuplicates: true,
  });
  revalidatePath(`/show/${showTmdbId}`);
  revalidatePath("/dashboard");
}

// Film van de watchlist afvinken: verplaats 'm naar "gezien".
export async function markMovieWatched(movieId: string) {
  const user = await requireUser();
  await prisma.watchedMovie.upsert({
    where: { userId_movieId: { userId: user.id, movieId } },
    create: { userId: user.id, movieId },
    update: {},
  });
  await prisma.watchlistMovie.deleteMany({ where: { userId: user.id, movieId } });
  revalidatePath("/movies");
}

// Hele seizoen aan/uit vinken.
export async function toggleSeason(showTmdbId: number, season: number, watched: boolean) {
  const user = await requireUser();
  const show = await prisma.show.findUnique({ where: { tmdbId: showTmdbId } });
  if (!show) return;
  const episodes = await prisma.episode.findMany({
    where: { showId: show.id, season },
    select: { id: true },
  });
  if (watched) {
    await prisma.watchedEpisode.createMany({
      data: episodes.map((e) => ({ userId: user.id, episodeId: e.id })),
      skipDuplicates: true,
    });
  } else {
    await prisma.watchedEpisode.deleteMany({
      where: { userId: user.id, episodeId: { in: episodes.map((e) => e.id) } },
    });
  }
  revalidatePath(`/show/${showTmdbId}`);
  revalidatePath("/dashboard");
}
