"use client";

import { useState, useTransition } from "react";
import { addMovieToWatchlist, markMovieWatchedByTmdb } from "@/app/(app)/actions";

type State = "none" | "watchlist" | "watched";

// Actie-knoppen voor een film-kaart (zoeken/Verken): op de watchlist zetten of
// meteen als gezien markeren. Werkt op TMDB-id en synct de film indien nodig.
//
// Houdt zelf de status bij, tenzij de ouder `value`/`onChange` meegeeft. Dat is
// nodig waar dezelfde film op twee plekken tegelijk staat (de kaart in het
// overzicht én de knop in de detailmodal): met losse state zou de ene knop nog
// "+ Watchlist" tonen nadat je via de andere hebt toegevoegd.
export function MovieActionButton({
  tmdbId,
  initial = "none",
  compact = false,
  value,
  onChange,
}: {
  tmdbId: number;
  initial?: State;
  compact?: boolean;
  value?: State;
  onChange?: (next: State) => void;
}) {
  const [ownState, setOwnState] = useState<State>(initial);
  const [pending, start] = useTransition();
  const state = value ?? ownState;
  const setState = (next: State) => {
    setOwnState(next);
    onChange?.(next);
  };

  // In de reeks-strook is de tegel maar ~96px breed; daar moeten de knoppen
  // echt kleiner, anders liggen ze over de hele poster heen.
  const base = compact
    ? "rounded-md px-1.5 py-0.5 text-[10px] font-medium disabled:opacity-50 backdrop-blur"
    : "rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:opacity-50 backdrop-blur";
  const row = compact ? "flex flex-col items-end gap-1" : "flex items-center gap-1";

  if (state === "watched") {
    return (
      <span className={`${base} bg-emerald-600/80 text-white`}>✓ Gezien</span>
    );
  }

  // Staat de film op de watchlist, toon dat ook als status. Alleen een knop
  // "✓ Gezien" tonen leest als "er is niets gebeurd" of zelfs als de verkeerde
  // actie, want dat is het label van de volgende stap, niet van de huidige staat.
  if (state === "watchlist") {
    return (
      <div className={row}>
        <span className={`${base} bg-(--color-accent) text-white`}>★ Wil ik zien</span>
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              await markMovieWatchedByTmdb(tmdbId);
              setState("watched");
            })
          }
          title="Markeer als gezien"
          className={`${base} bg-black/60 text-white hover:bg-black/80`}
        >
          {pending ? "…" : "✓ Gezien"}
        </button>
      </div>
    );
  }

  return (
    <div className={row}>
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            await addMovieToWatchlist(tmdbId);
            setState("watchlist");
          })
        }
        title="Op watchlist"
        className={`${base} bg-black/60 text-white hover:bg-black/80`}
      >
        {pending ? "…" : "+ Watchlist"}
      </button>
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            await markMovieWatchedByTmdb(tmdbId);
            setState("watched");
          })
        }
        title="Al gezien"
        className={`${base} bg-black/60 text-white hover:bg-black/80`}
      >
        {pending ? "…" : "✓ Gezien"}
      </button>
    </div>
  );
}
