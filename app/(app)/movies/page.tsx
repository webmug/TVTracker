import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { posterUrl } from "@/lib/tmdb";
import { WatchlistCheckButton } from "@/app/(app)/_components/WatchlistCheckButton";

type MovieMeta = {
  id: string;
  title: string;
  posterPath: string | null;
  releaseDate: Date | null;
};

export default async function MoviesPage() {
  const user = await requireUser();

  const [watched, watchlist] = await Promise.all([
    prisma.watchedMovie.findMany({
      where: { userId: user.id },
      orderBy: { watchedAt: "desc" },
      include: { movie: true },
    }),
    prisma.watchlistMovie.findMany({
      where: { userId: user.id },
      orderBy: { addedAt: "desc" },
      include: { movie: true },
    }),
  ]);

  return (
    <main>
      <h1 className="mb-4 text-xl font-semibold">Films</h1>

      {watched.length === 0 && watchlist.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-[--color-panel] p-6 text-center">
          <p className="text-[--color-muted]">
            Nog geen films.{" "}
            <Link href="/import" className="text-[--color-accent] underline">
              Importeer je TV Time-historie
            </Link>{" "}
            om ze hier te zien.
          </p>
        </div>
      )}

      {watchlist.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-medium text-[--color-muted]">
            Wil ik zien ({watchlist.length})
          </h2>
          <ul className="flex flex-col gap-3">
            {watchlist.map((w) => (
              <MovieItem key={w.id} movie={w.movie} showCheck />
            ))}
          </ul>
        </section>
      )}

      {watched.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-[--color-muted]">
            Gezien ({watched.length})
          </h2>
          <ul className="flex flex-col gap-3">
            {watched.map((w) => (
              <MovieItem key={w.id} movie={w.movie} watchedAt={w.watchedAt} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function MovieItem({
  movie,
  watchedAt,
  showCheck,
}: {
  movie: MovieMeta;
  watchedAt?: Date;
  showCheck?: boolean;
}) {
  const poster = posterUrl(movie.posterPath, "w154");
  const year = movie.releaseDate?.getFullYear();
  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-[--color-panel] p-3">
      <div className="shrink-0">
        {poster ? (
          <Image
            src={poster}
            alt={movie.title}
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
          {movie.title}
          {year && <span className="text-[--color-muted]"> ({year})</span>}
        </p>
        {watchedAt && (
          <p className="text-sm text-[--color-muted]">
            Gezien op{" "}
            {watchedAt.toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
      </div>
      {showCheck && <WatchlistCheckButton movieId={movie.id} />}
    </li>
  );
}
