import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getSeriesLibraryPage, PAGE_SIZE, type FollowFilter } from "@/lib/library";
import { SeriesGrid } from "@/app/(app)/_components/SeriesGrid";

const FILTERS: { value: FollowFilter; label: string }[] = [
  { value: "all", label: "Alles" },
  { value: "watching", label: "Kijken" },
  { value: "finished", label: "Afgerond" },
];

export default async function SeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  const { status } = await searchParams;
  const filter: FollowFilter = FILTERS.some((f) => f.value === status)
    ? (status as FollowFilter)
    : "all";

  const initial = await getSeriesLibraryPage(user.id, 0, PAGE_SIZE, filter);

  return (
    <main>
      <h1 className="mb-4 text-xl font-semibold">Series</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <Link
              key={f.value}
              href={f.value === "all" ? "/series" : `/series?status=${f.value}`}
              className={
                "rounded-full px-3 py-1.5 text-sm " +
                (active
                  ? "bg-[--color-accent] text-white"
                  : "border border-white/15 text-[--color-muted] hover:text-white")
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {initial.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[--color-panel] p-6 text-center">
          <p className="text-[--color-muted]">
            Nog geen series in deze weergave.{" "}
            <Link href="/search" className="text-[--color-accent] underline">
              Zoek er een
            </Link>{" "}
            of{" "}
            <Link href="/explore" className="text-[--color-accent] underline">
              verken tips
            </Link>
            .
          </p>
        </div>
      ) : (
        <SeriesGrid key={filter} initialItems={initial} filter={filter} pageSize={PAGE_SIZE} />
      )}
    </main>
  );
}
