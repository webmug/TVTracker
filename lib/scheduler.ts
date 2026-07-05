import cron from "node-cron";
import { checkNewEpisodes, sendWeeklyDigest } from "@/lib/notify";

// In-process scheduler: draait de mail-jobs vanuit de web-service zelf, zodat er
// géén aparte Railway Cron-service nodig is. Vereist wel dat de web-service continu
// draait (serverless/"scale to zero" UIT) en op één instance staat — anders vuurt
// de timer niet of sturen meerdere instances dubbele mails.
//
// Schema's in lokale tijd (Europe/Amsterdam):
//   - dagelijks 08:00  -> nieuwe-afleveringen-mail  (checkNewEpisodes)
//   - vrijdag  09:00   -> wekelijkse samenvatting    (sendWeeklyDigest)
const TIMEZONE = "Europe/Amsterdam";
const DAILY_CRON = "0 8 * * *";
const WEEKLY_CRON = "0 9 * * 5";

// Voorkom dubbele registratie (register() kan bij dev hot-reload meermaals lopen).
const GLOBAL_KEY = "__tvtracker_scheduler_started__";

async function runJob(label: string, job: () => Promise<{ emailsSent: number; showsRefreshed: number; errors: string[] }>) {
  try {
    const res = await job();
    console.log(
      `[scheduler] ${label}: ${res.emailsSent} mail(s), ${res.showsRefreshed} series ververst` +
        (res.errors.length ? `, ${res.errors.length} fout(en): ${res.errors.join("; ")}` : "")
    );
  } catch (e) {
    console.error(`[scheduler] ${label} faalde:`, (e as Error).message);
  }
}

export function startScheduler(): void {
  // Alleen in productie: in dev willen we geen echte mails versturen.
  if (process.env.NODE_ENV !== "production") return;

  const g = globalThis as unknown as Record<string, boolean>;
  if (g[GLOBAL_KEY]) return;
  g[GLOBAL_KEY] = true;

  cron.schedule(DAILY_CRON, () => runJob("dagelijks", checkNewEpisodes), {
    timezone: TIMEZONE,
    noOverlap: true,
    name: "daily-new-episodes",
  });

  cron.schedule(WEEKLY_CRON, () => runJob("wekelijks", sendWeeklyDigest), {
    timezone: TIMEZONE,
    noOverlap: true,
    name: "weekly-digest",
  });

  console.log(
    `[scheduler] gestart — dagelijks '${DAILY_CRON}' en wekelijks '${WEEKLY_CRON}' (${TIMEZONE})`
  );
}
