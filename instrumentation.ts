// Next.js instrumentation-hook: register() draait één keer bij het opstarten van
// de server. We trappen hier de eenmalige IMDb-backfill af (fire-and-forget,
// zodat de opstart niet blokkeert). Alleen op de Node.js-runtime — Prisma en de
// fetch-cache werken niet op de edge-runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { backfillImdbIds } = await import("@/lib/backfill");
  // Niet awaiten: laat de backfill op de achtergrond lopen.
  void backfillImdbIds();
}
