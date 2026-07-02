import { prisma } from "@/lib/prisma";
import { syncShow } from "@/lib/shows";
import { sendNewEpisodesEmail, type NewEpisodeMail } from "@/lib/email";

function epLabel(season: number, number: number): string {
  return `S${String(season).padStart(2, "0")}E${String(number).padStart(2, "0")}`;
}

export interface NotifyResult {
  showsRefreshed: number;
  emailsSent: number;
  errors: string[];
}

// Ververst gevolgde series van TMDB, detecteert nieuw uitgezonden afleveringen en
// mailt elke gebruiker een samenvatting. Idempotent via Follow.notifiedThroughDate.
export async function checkNewEpisodes(): Promise<NotifyResult> {
  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const now = new Date();
  const errors: string[] = [];

  // 1. Ververs alle gevolgde series.
  const shows = await prisma.show.findMany({
    where: { follows: { some: {} } },
    select: { tmdbId: true },
  });
  for (const s of shows) {
    try {
      await syncShow(s.tmdbId, { force: true });
    } catch (e) {
      errors.push(`sync ${s.tmdbId}: ${(e as Error).message}`);
    }
  }

  // 2. Verzamel per gebruiker de nieuw uitgezonden afleveringen.
  const follows = await prisma.follow.findMany({
    where: { status: { in: ["WATCHING", "PAUSED"] } },
    include: {
      user: { select: { id: true, email: true } },
      show: {
        select: {
          name: true,
          episodes: {
            orderBy: [{ season: "asc" }, { number: "asc" }],
            select: { season: true, number: true, name: true, airDate: true },
          },
        },
      },
    },
  });

  const perUser = new Map<string, { email: string; shows: NewEpisodeMail[] }>();
  const followIdsToAdvance: string[] = [];

  for (const f of follows) {
    if (!f.user.email) continue;
    const cursor = f.notifiedThroughDate ?? f.createdAt;
    const fresh = f.show.episodes.filter(
      (e) => e.airDate && e.airDate > cursor && e.airDate <= now
    );
    followIdsToAdvance.push(f.id);
    if (fresh.length === 0) continue;

    let bucket = perUser.get(f.user.id);
    if (!bucket) {
      bucket = { email: f.user.email, shows: [] };
      perUser.set(f.user.id, bucket);
    }
    bucket.shows.push({
      showName: f.show.name,
      episodes: fresh.map((e) => ({
        label: epLabel(e.season, e.number),
        name: e.name,
        airDate: e.airDate,
      })),
    });
  }

  // 3. Verstuur e-mails.
  let emailsSent = 0;
  for (const { email, shows: userShows } of perUser.values()) {
    try {
      await sendNewEpisodesEmail(email, userShows, appUrl);
      emailsSent++;
    } catch (e) {
      errors.push(`mail ${email}: ${(e as Error).message}`);
    }
  }

  // 4. Cursor bijwerken (alleen als we niet in een dry-run zitten).
  if (followIdsToAdvance.length > 0) {
    await prisma.follow.updateMany({
      where: { id: { in: followIdsToAdvance } },
      data: { notifiedThroughDate: now },
    });
  }

  return { showsRefreshed: shows.length, emailsSent, errors };
}
