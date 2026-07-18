import Link from "next/link";
import { requireUser } from "@/lib/session";
import {
  getSeriesLibraryPage,
  getSeriesWatchProviderOptions,
  parseProviderIds,
  PAGE_SIZE,
  type FollowFilter,
} from "@/lib/library";
import { SeriesGrid } from "@/app/(app)/_components/SeriesGrid";
import { ProviderFilterChips } from "@/app/(app)/_components/ProviderFilterChips";

const FILTERS: { value: FollowFilter; label: string }[] = [
  { value: "all", label: "Alles" },
  { value: "watching", label: "Kijken" },
  { value: "finished", label: "Afgerond" },
];

export default async function SeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; provider?: string }>;
}) {
  const user = await requireUser();
  const { status, provider } = await searchParams;
  const filter: FollowFilter = FILTERS.some((f) => f.value === status)
    ? (status as FollowFilter)
    : "all";
  const providerIds = parseProviderIds(provider);

  const [initial, providerOptions] = await Promise.all([
    getSeriesLibraryPage(user.id, 0, PAGE_SIZE, filter, providerIds),
    getSeriesWatchProviderOptions(user.id),
  ]);

  return (
    <main>
      <h1 className="mb-4 text-xl font-semibold">Series</h1>

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.value === filter;
          const params = new URLSearchParams();
          if (f.value !== "all") params.set("status", f.value);
          if (providerIds.length > 0) params.set("provider", providerIds.join(","));
          const qs = params.toString();
          return (
            <Link
              key={f.value}
              href={qs ? `/series?${qs}` : "/series"}
              className={
                "rounded-full px-3 py-1.5 text-sm " +
                (active
                  ? "bg-(--color-accent) text-white"
                  : "border border-white/15 text-(--color-muted) hover:text-white")
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <ProviderFilterChips
        basePath="/series"
        options={providerOptions}
        active={providerIds}
        otherParams={filter !== "all" ? { status: filter } : {}}
      />

      {initial.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-(--color-panel) p-6 text-center">
          <p className="text-(--color-muted)">
            Nog geen series in deze weergave.{" "}
            <Link href="/search" className="text-(--color-accent) underline">
              Zoek er een
            </Link>{" "}
            of{" "}
            <Link href="/explore" className="text-(--color-accent) underline">
              verken tips
            </Link>
            .
          </p>
        </div>
      ) : (
        <SeriesGrid
          key={`${filter}-${providerIds.join(",")}`}
          initialItems={initial}
          filter={filter}
          providerIds={providerIds}
          pageSize={PAGE_SIZE}
        />
      )}
    </main>
  );
}
