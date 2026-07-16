// Next.js instrumentation-hook: register() draait één keer bij het opstarten van
// de server. We trappen hier de eenmalige IMDb-backfill af (fire-and-forget,
// zodat de opstart niet blokkeert) en starten de in-process mail-scheduler.
// Alleen op de Node.js-runtime — Prisma, node-cron en de fetch-cache werken niet
// op de edge-runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { backfillImdbIds, backfillWatchProviders } = await import("@/lib/backfill");
  // Niet awaiten: laat de backfills op de achtergrond lopen.
  void backfillImdbIds();
  void backfillWatchProviders();

  // Dagelijkse + wekelijkse mail-jobs vanuit de web-service zelf (geen aparte
  // Railway Cron-service nodig). No-op buiten productie.
  const { startScheduler } = await import("@/lib/scheduler");
  startScheduler();
}
