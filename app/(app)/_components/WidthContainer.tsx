"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Het dashboard heeft een bredere, twee-koloms layout nodig; alle andere
// pagina's blijven op max-w-3xl. De breedte wordt per route gekozen.
export function WidthContainer({ children }: { children: ReactNode }) {
  const wide = usePathname() === "/dashboard";
  return (
    <div className={`mx-auto px-4 pb-24 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
      {children}
    </div>
  );
}
