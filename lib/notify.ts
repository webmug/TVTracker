import { prisma } from "@/lib/prisma";
import { syncShow } from "@/lib/shows";
import {
  sendNewEpisodesEmail,
  sendWeeklyDigestEmail,
  type NewEpisodeMail,
} from "@/lib/email";

function epLabel(season: number, number: number): string {
  return `S${String(season).padStart(2, "0")}E${String(number).padStart(2, "0")}`;
}

// Verwerk items in batches van `concurrency` tegelijk (i.p.v. strikt sequentieel),
// zodat de TMDB-refresh niet lineair oploopt met het aantal series.
async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += concurrency) {
    await Promise.all(items.slice(i, i + concurrency).map(fn));
  }
}

// Ververst alle gevolgde series van TMDB (met beperkte concurrency). Gedeeld door
// de dagelijkse en wekelijkse job. Geeft het aantal series + eventuele fouten terug.
async function refreshFollowedShows(): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  const shows = await prisma.show.findMany({
    where: { follows: { some: {} } },
    select: { tmdbId: true },
  });
  await mapWithConcurrency(shows, 5, async (s) => {
    try {
      await syncShow(s.tmdbId, { force: true });
    } catch (e) {
      errors.push(`sync ${s.tmdbId}: ${(e as Error).message}`);
    }
  });
  return { count: shows.length, errors };
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

  // 1. Ververs alle gevolgde series.
  const { count: showsRefreshed, errors } = await refreshFollowedShows();

  // 2. Verzamel per gebruiker de nieuw uitgezonden afleveringen. Alleen reeds
  //    uitgezonden afleveringen laden (toekomstige tellen nooit mee); het per-follow
  //    cursorvenster wordt daarna in JS toegepast.
  const follows = await prisma.follow.findMany({
    where: { status: { in: ["WATCHING", "PAUSED"] } },
    include: {
      user: { select: { id: true, email: true, dailyEmails: true } },
      show: {
        select: {
          name: true,
          episodes: {
            where: { airDate: { lte: now } },
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
    // Cursor blijft ook meelopen als de gebruiker de mail uit heeft, zodat er geen
    // backlog ontstaat wanneer die weer wordt aangezet.
    followIdsToAdvance.push(f.id);
    if (fresh.length === 0 || !f.user.dailyEmails) continue;

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

  return { showsRefreshed, emailsSent, errors };
}

// Wekelijkse vrijdag-samenvatting: bundelt alle afleveringen die de afgelopen 7 dagen
// zijn uitgezonden voor gevolgde series, en mailt elke gebruiker die de digest aan heeft.
// Gebruikt bewust een vast tijdvenster en raakt Follow.notifiedThroughDate NIET aan, zodat
// het los staat van de dagelijkse cursor in checkNewEpisodes.
export async function sendWeeklyDigest(): Promise<NotifyResult> {
  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. Ververs alle gevolgde series, zodat de data ook vers is als de dagelijkse job uit staat.
  const { count: showsRefreshed, errors } = await refreshFollowedShows();

  // 2. Verzamel per gebruiker de afleveringen uit de afgelopen week. Meteen op het
  //    weekvenster filteren in de query i.p.v. alle afleveringen te laden.
  const follows = await prisma.follow.findMany({
    where: {
      status: { in: ["WATCHING", "PAUSED"] },
      user: { weeklyDigest: true },
    },
    include: {
      user: { select: { id: true, email: true } },
      show: {
        select: {
          name: true,
          episodes: {
            where: { airDate: { gte: weekAgo, lte: now } },
            orderBy: [{ season: "asc" }, { number: "asc" }],
            select: { season: true, number: true, name: true, airDate: true },
          },
        },
      },
    },
  });

  const perUser = new Map<string, { email: string; shows: NewEpisodeMail[] }>();

  for (const f of follows) {
    if (!f.user.email) continue;
    const fresh = f.show.episodes.filter(
      (e) => e.airDate && e.airDate >= weekAgo && e.airDate <= now
    );
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
      await sendWeeklyDigestEmail(email, userShows, appUrl);
      emailsSent++;
    } catch (e) {
      errors.push(`mail ${email}: ${(e as Error).message}`);
    }
  }

  return { showsRefreshed, emailsSent, errors };
}
