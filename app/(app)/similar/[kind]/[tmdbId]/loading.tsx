// Laad-skeleton voor de "Soortgelijke series/films"-pagina. Deze haalt live TMDB-
// aanbevelingen op (en voor series per titel de status), wat een paar seconden kan
// duren; dit verschijnt direct via Suspense zodat de navigatie meteen reageert.
export default function Loading() {
  return (
    <main>
      <div className="mb-6 h-7 w-56 animate-pulse rounded bg-[--color-panel2]" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[2/3] w-full animate-pulse rounded-xl border border-white/10 bg-[--color-panel2]" />
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-[--color-panel2]" />
          </div>
        ))}
      </div>
    </main>
  );
}
