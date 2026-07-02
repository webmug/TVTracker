import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { posterUrl } from "@/lib/tmdb";

export default async function MoviesPage() {
  const user = await requireUser();

  const watched = await prisma.watchedMovie.findMany({
    where: { userId: user.id },
    orderBy: { watchedAt: "desc" },
    include: { movie: true },
  });

  return (
    <main>
      <h1 className="mb-4 text-xl font-semibold">Films</h1>

      {watched.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-[--color-panel] p-6 text-center">
          <p className="text-[--color-muted]">
            Nog geen geziene films.{" "}
            <Link href="/import" className="text-[--color-accent] underline">
              Importeer je TV Time-historie
            </Link>{" "}
            om ze hier te zien.
          </p>
        </div>
      )}

      {watched.length > 0 && (
        <ul className="flex flex-col gap-3">
          {watched.map((w) => {
            const poster = posterUrl(w.movie.posterPath, "w154");
            const year = w.movie.releaseDate?.getFullYear();
            return (
              <li
                key={w.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-[--color-panel] p-3"
              >
                <div className="shrink-0">
                  {poster ? (
                    <Image
                      src={poster}
                      alt={w.movie.title}
                      width={48}
                      height={72}
                      className="h-18 w-12 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-18 w-12 items-center justify-center rounded-md bg-[--color-panel2]">
                      🎬
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {w.movie.title}
                    {year && <span className="text-[--color-muted]"> ({year})</span>}
                  </p>
                  <p className="text-sm text-[--color-muted]">
                    Gezien op{" "}
                    {w.watchedAt.toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
