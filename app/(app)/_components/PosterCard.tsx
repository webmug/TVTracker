import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { posterUrl } from "@/lib/tmdb";

// Grote poster-kaart (aspect 2:3) die op alle overzichten gebruikt wordt.
// - `href`   : maakt de poster klikbaar naar de detailpagina.
// - `badge`  : kleine overlay linksboven (bv. voortgang).
// - `action` : overlay rechtsonder (bv. volg-/watchlist-knop).
export function PosterCard({
  posterPath,
  title,
  subtitle,
  href,
  fallbackEmoji = "📺",
  badge,
  action,
}: {
  posterPath: string | null;
  title: string;
  subtitle?: string | null;
  href?: string;
  fallbackEmoji?: string;
  badge?: ReactNode;
  action?: ReactNode;
}) {
  const poster = posterUrl(posterPath, "w342");

  const image = (
    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/10 bg-[--color-panel2]">
      {poster ? (
        <Image
          src={poster}
          alt={title}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 180px"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-4xl">
          {fallbackEmoji}
        </div>
      )}
      {badge != null && <div className="absolute left-1.5 top-1.5">{badge}</div>}
      {action != null && <div className="absolute bottom-1.5 right-1.5">{action}</div>}
    </div>
  );

  return (
    <div className="flex flex-col gap-1.5">
      {href ? (
        <Link href={href} className="block">
          {image}
        </Link>
      ) : (
        image
      )}
      <div className="min-w-0 px-0.5">
        <p className="truncate text-sm font-medium" title={title}>
          {href ? (
            <Link href={href} className="hover:underline">
              {title}
            </Link>
          ) : (
            title
          )}
        </p>
        {subtitle && <p className="truncate text-xs text-[--color-muted]">{subtitle}</p>}
      </div>
    </div>
  );
}
