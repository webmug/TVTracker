// Laad-skeleton voor Verken. Verken haalt bij elke navigatie live TMDB-data op
// (trending + aanbevelingen), wat een paar seconden kan duren; deze UI verschijnt
// direct via Suspense zodat de klik meteen voelbaar reageert.
function SkeletonRow() {
  return (
    <section className="mb-8">
      <div className="mb-3 h-6 w-48 animate-pulse rounded bg-(--color-panel2)" />
      <div className="-mx-4 flex gap-4 overflow-hidden px-4 pb-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-36 shrink-0">
            <div className="aspect-[2/3] w-full animate-pulse rounded-xl border border-white/10 bg-(--color-panel2)" />
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-(--color-panel2)" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Loading() {
  return (
    <main>
      <h1 className="mb-6 text-xl font-semibold">Verken</h1>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </main>
  );
}
