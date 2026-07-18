"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TMDB_IMG } from "@/lib/tmdb";
import type { WatchProviderOption } from "@/lib/library";

// Multi-select filterchips op streamingdienst voor /series en /movies (OR: "op
// Netflix óf Disney Plus"). Toont alleen diensten die daadwerkelijk in de
// bibliotheek van de gebruiker voorkomen; verbergt zich helemaal als er geen is.
// Inklapbaar voor overzicht: standaard dicht (de chiplijst neemt anders veel
// ruimte in); ingeklapt blijven geselecteerde diensten wel zichtbaar.
export function ProviderFilterChips({
  basePath,
  options,
  active,
  otherParams = {},
}: {
  basePath: string;
  options: WatchProviderOption[];
  active: number[];
  otherParams?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);

  if (options.length === 0) return null;

  // Href die weergeeft wat er gebeurt als je déze chip nu aanklikt: toggelt hem
  // aan/uit in de bestaande selectie (meerdere diensten tegelijk mogelijk).
  function hrefToggling(providerId: number) {
    const next = active.includes(providerId)
      ? active.filter((id) => id !== providerId)
      : [...active, providerId];
    return hrefFor(next);
  }

  function hrefFor(ids: number[]) {
    const params = new URLSearchParams(otherParams);
    if (ids.length > 0) params.set("provider", ids.join(","));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const pill = (isActive: boolean) =>
    "flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm " +
    (isActive
      ? "bg-(--color-accent) text-white"
      : "border border-white/15 text-(--color-muted) hover:text-white");

  const activeOptions = options.filter((o) => active.includes(o.id));

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mb-2 flex items-center gap-1.5 text-sm text-(--color-muted) hover:text-white"
      >
        <span className={"transition-transform " + (open ? "rotate-90" : "")}>▸</span>
        <span>Diensten{active.length > 0 ? ` (${active.length})` : ""}</span>
      </button>

      {open ? (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={hrefFor([])}
            className={
              "rounded-full px-3 py-1.5 text-sm " +
              (active.length === 0
                ? "bg-(--color-accent) text-white"
                : "border border-white/15 text-(--color-muted) hover:text-white")
            }
          >
            Alle diensten
          </Link>
          {options.map((p) => (
            <Link key={p.id} href={hrefToggling(p.id)} title={p.name} className={pill(active.includes(p.id))}>
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
          ))}
        </div>
      ) : (
        activeOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeOptions.map((p) => (
              <Link
                key={p.id}
                href={hrefToggling(p.id)}
                title={`${p.name} verwijderen`}
                className={pill(true)}
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
                <span aria-hidden="true">✕</span>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}
