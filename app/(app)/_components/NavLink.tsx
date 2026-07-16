"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Kleine pulserende stip die alléén verschijnt zolang de navigatie van déze
// link nog bezig is (Next's useLinkStatus) — feedback op een trage verbinding
// dat een tik wél is geregistreerd, i.p.v. een stille wachttijd.
function PendingIndicator() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden="true"
      className="ml-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-(--color-accent) align-middle"
    />
  );
}

// Nav-link die de huidige pagina markeert (usePathname) én laat zien wanneer
// een klik onderweg is (useLinkStatus), voor gebruik in zowel de desktop- als
// de mobiele nav.
export function NavLink({
  href,
  children,
  className = "",
  activeClassName = "text-white font-medium",
  inactiveClassName = "text-(--color-muted) hover:text-white",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${className} ${active ? activeClassName : inactiveClassName}`}
    >
      {children}
      <PendingIndicator />
    </Link>
  );
}
