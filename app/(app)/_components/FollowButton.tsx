"use client";

import { useState, useTransition } from "react";
import { followShow, unfollowShow } from "@/app/(app)/actions";

export function FollowButton({
  tmdbId,
  following,
}: {
  tmdbId: number;
  following: boolean;
}) {
  // Lokale (optimistische) status: de acties revalideren bewust niet (om reflow
  // op Verken/Zoeken te voorkomen), dus de knop houdt zelf de status bij.
  const [followed, setFollowed] = useState(following);
  const [pending, start] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const next = !followed;
          setFollowed(next);
          try {
            if (next) await followShow(tmdbId);
            else await unfollowShow(tmdbId);
          } catch {
            setFollowed(!next); // terugdraaien bij fout
          }
        })
      }
      className={
        followed
          ? "rounded-lg border border-white/15 px-4 py-2 text-sm text-[--color-muted] hover:text-white disabled:opacity-50"
          : "rounded-lg bg-[--color-accent] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      }
    >
      {pending ? "…" : followed ? "Volg je" : "+ Volgen"}
    </button>
  );
}
