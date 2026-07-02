import Link from "next/link";
import Image from "next/image";
import { searchShows, posterUrl } from "@/lib/tmdb";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { FollowButton } from "@/app/(app)/_components/FollowButton";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const results = query ? await searchShows(query) : [];

  const followedTmdbIds = new Set(
    (
      await prisma.follow.findMany({
        where: { userId: user.id },
        include: { show: { select: { tmdbId: true } } },
      })
    ).map((f) => f.show.tmdbId)
  );

  return (
    <main>
      <h1 className="mb-4 text-xl font-semibold">Zoek een serie</h1>
      <form action="/search" method="get" className="mb-6 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Titel, bv. Severance"
          className="flex-1 rounded-lg border border-white/10 bg-[--color-panel] px-4 py-3 outline-none focus:border-[--color-accent]"
        />
        <button className="rounded-lg bg-[--color-accent] px-5 py-3 font-medium text-white">
          Zoek
        </button>
      </form>

      {query && results.length === 0 && (
        <p className="text-[--color-muted]">Geen resultaten voor “{query}”.</p>
      )}

      <ul className="flex flex-col gap-3">
        {results.map((r) => {
          const poster = posterUrl(r.poster_path, "w154");
          const year = r.first_air_date ? r.first_air_date.slice(0, 4) : "";
          return (
            <li
              key={r.id}
              className="flex gap-3 rounded-xl border border-white/10 bg-[--color-panel] p-3"
            >
              <Link href={`/show/${r.id}`} className="shrink-0">
                {poster ? (
                  <Image
                    src={poster}
                    alt={r.name}
                    width={64}
                    height={96}
                    className="h-24 w-16 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-16 items-center justify-center rounded-md bg-[--color-panel2] text-2xl">
                    📺
                  </div>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/show/${r.id}`} className="font-medium hover:underline">
                  {r.name} {year && <span className="text-[--color-muted]">({year})</span>}
                </Link>
                <p className="mt-1 line-clamp-3 text-sm text-[--color-muted]">
                  {r.overview || "Geen beschrijving."}
                </p>
              </div>
              <div className="flex items-center">
                <FollowButton tmdbId={r.id} following={followedTmdbIds.has(r.id)} />
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
