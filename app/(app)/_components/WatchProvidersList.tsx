import Image from "next/image";
import { TMDB_IMG, type WatchProvider, type WatchProviders } from "@/lib/tmdb";

function ProviderRow({ label, items }: { label: string; items: WatchProvider[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-2 last:mb-0">
      <p className="mb-1.5 text-[10px] uppercase tracking-wide text-(--color-muted)">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        {items.map((p) =>
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
    </div>
  );
}

// Toont de streamingdiensten ("Kijken via") op de serie- en filmdetails, met
// verplichte JustWatch-attributie (TMDB levert deze data via JustWatch aan).
// Naast abonnementen ook huren/kopen: veel films zijn in NL alleen zo te kijken.
export function WatchProvidersList({ providers }: { providers: WatchProviders | null }) {
  if (!providers) return null;
  const { flatrate, rent, buy } = providers;
  if (flatrate.length === 0 && rent.length === 0 && buy.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-(--color-muted)">Kijken via</p>
      <ProviderRow label="Abonnement" items={flatrate} />
      <ProviderRow label="Huren" items={rent} />
      <ProviderRow label="Kopen" items={buy} />
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
