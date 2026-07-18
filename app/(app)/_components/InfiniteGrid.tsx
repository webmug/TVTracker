"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

// Responsief, scherm-vullend kaarten-grid met infinite scroll.
// Houdt de al geladen items bij; een IntersectionObserver-sentinel onderaan
// roept `loadMore(offset)` (server-action) aan en appendt de volgende pagina.
// Stopt zodra een pagina minder dan `pageSize` teruggeeft.
export function InfiniteGrid<T>({
  initialItems,
  loadMore,
  renderItem,
  itemKey,
  pageSize,
}: {
  initialItems: T[];
  loadMore: (offset: number) => Promise<T[]>;
  renderItem: (item: T) => ReactNode;
  itemKey: (item: T) => string | number;
  pageSize: number;
}) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [done, setDone] = useState(initialItems.length < pageSize);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const fetchMore = useCallback(async () => {
    if (loadingRef.current || done) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const next = await loadMore(items.length);
      setItems((prev) => [...prev, ...next]);
      if (next.length < pageSize) setDone(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [done, items.length, loadMore, pageSize]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || done) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchMore();
      },
      { rootMargin: "600px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchMore, done]);

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
        {items.map((item) => (
          <div key={itemKey(item)}>{renderItem(item)}</div>
        ))}
      </div>
      {!done && (
        <div ref={sentinelRef} className="py-8 text-center text-sm text-(--color-muted)">
          {loading ? "Laden…" : ""}
        </div>
      )}
    </>
  );
}
