import Image from "next/image";
import Link from "next/link";
import { TMDB_IMG } from "@/lib/tmdb";
import type { WatchProviderOption } from "@/lib/library";

// Filterchips op streamingdienst voor /series en /movies. Toont alleen diensten
// die daadwerkelijk in de bibliotheek van de gebruiker voorkomen; verbergt zich
// helemaal als er geen (of maar één) dienst is.
export function ProviderFilterChips({
  basePath,
  options,
  active,
  otherParams = {},
}: {
  basePath: string;
  options: WatchProviderOption[];
  active?: number;
  otherParams?: Record<string, string>;
}) {
  if (options.length === 0) return null;

  function href(providerId?: number) {
    const params = new URLSearchParams(otherParams);
    if (providerId) params.set("provider", String(providerId));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <Link
        href={href()}
        className={
          "rounded-full px-3 py-1.5 text-sm " +
          (!active
            ? "bg-[--color-accent] text-white"
            : "border border-white/15 text-[--color-muted] hover:text-white")
        }
      >
        Alle diensten
      </Link>
      {options.map((p) => {
        const isActive = p.id === active;
        return (
          <Link
            key={p.id}
            href={href(p.id)}
            title={p.name}
            className={
              "flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm " +
              (isActive
                ? "bg-[--color-accent] text-white"
                : "border border-white/15 text-[--color-muted] hover:text-white")
            }
          >
            {p.logoPath ? (
              <Image
                src={`${TMDB_IMG}/w45${p.logoPath}`}
                alt=""
                width={20}
                height={20}
                className="rounded"
              />
            ) : null}
            {p.name}
          </Link>
        );
      })}
    </div>
  );
}
