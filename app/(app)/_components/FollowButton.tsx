"use client";

import { useTransition } from "react";
import { followShow, unfollowShow } from "@/app/(app)/actions";

export function FollowButton({
  tmdbId,
  following,
}: {
  tmdbId: number;
  following: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (following) await unfollowShow(tmdbId);
          else await followShow(tmdbId);
        })
      }
      className={
        following
          ? "rounded-lg border border-white/15 px-4 py-2 text-sm text-[--color-muted] hover:text-white disabled:opacity-50"
          : "rounded-lg bg-[--color-accent] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      }
    >
      {pending ? "…" : following ? "Volg je" : "+ Volgen"}
    </button>
  );
}
