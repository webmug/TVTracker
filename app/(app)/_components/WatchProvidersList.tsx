import Image from "next/image";
import { TMDB_IMG, type WatchProviders } from "@/lib/tmdb";

// Toont de streamingdiensten ("Kijken via") op de serie- en filmdetails, met
// verplichte JustWatch-attributie (TMDB levert deze data via JustWatch aan).
export function WatchProvidersList({ providers }: { providers: WatchProviders | null }) {
  if (!providers || providers.flatrate.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-(--color-muted)">Kijken via</p>
      <div className="flex flex-wrap items-center gap-2">
        {providers.flatrate.map((p) =>
          p.logoPath ? (
            <Image
              key={p.id}
              src={`${TMDB_IMG}/w45${p.logoPath}`}
              alt={p.name}
              title={p.name}
              width={32}
              height={32}
              className="rounded-md"
            />
          ) : (
            <span
              key={p.id}
              className="rounded-md bg-(--color-panel2) px-2 py-1 text-xs text-(--color-muted)"
            >
              {p.name}
            </span>
          )
        )}
      </div>
      {providers.link && (
        <p className="mt-1.5 text-[10px] text-(--color-muted)">
          Data door{" "}
          <a
            href={providers.link}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-white/20 hover:text-white"
          >
            JustWatch
          </a>
        </p>
      )}
    </div>
  );
}
