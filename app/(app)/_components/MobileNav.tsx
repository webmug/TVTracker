"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { NavLink } from "@/app/(app)/_components/NavLink";

// Links en volgorde matchen de desktop-nav in layout.tsx.
const LINKS = [
  { href: "/dashboard", label: "Up Next" },
  { href: "/series", label: "Series" },
  { href: "/movies", label: "Films" },
  { href: "/explore", label: "Verken" },
  { href: "/import", label: "Import" },
  { href: "/settings", label: "Instellingen" },
];

// Uitklapbaar linker-menu voor mobiel (zoals in native iOS-apps), i.p.v. een
// inline dropdown onder de header. Alleen zichtbaar onder het sm-breakpoint;
// de desktop-header rendert zijn eigen horizontale nav ernaast.
export function MobileNav({
  isAdmin,
  signOutAction,
}: {
  isAdmin: boolean;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  // Portal-target pas na mount beschikbaar (document bestaat niet server-side);
  // voorkomt ook een hydration-mismatch.
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sluit pas zodra de navigatie daadwerkelijk is voltooid (pathname wisselt),
  // niet meteen bij de tik. Zo blijft de pending-indicator op de link zichtbaar
  // op een trage verbinding, i.p.v. dat het menu meteen dichtklapt.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="-ml-2 rounded-lg px-2 py-1.5 text-lg leading-none text-(--color-muted) hover:text-white"
      >
        ☰
      </button>

      {mounted &&
        createPortal(
          <>
            {/* Portal naar document.body: de header heeft backdrop-blur, wat in
                de meeste browsers een containing block vormt voor position:fixed
                nakomelingen. Zonder portal zit het menu daardoor vastgeklemd in
                de (kleine) header-box i.p.v. het volledige scherm. */}
            <div
              onClick={() => setOpen(false)}
              aria-hidden="true"
              className={
                "fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 " +
                (open ? "opacity-100" : "pointer-events-none opacity-0")
              }
            />

            <nav
              aria-label="Hoofdmenu"
              className={
                "fixed inset-y-0 left-0 z-40 flex w-72 max-w-[80vw] flex-col border-r border-white/10 bg-(--color-ink) px-4 py-4 shadow-xl transition-transform duration-300 ease-in-out " +
                (open ? "translate-x-0" : "-translate-x-full")
              }
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-semibold">📺 TV Tracker</span>
                <button
                  type="button"
                  aria-label="Sluiten"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2 py-1 text-lg leading-none text-(--color-muted) hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form action="/search" method="get" className="mb-3">
                <input
                  name="q"
                  placeholder="Zoek series & films…"
                  aria-label="Zoeken"
                  className="w-full rounded-lg border border-white/10 bg-(--color-panel) px-3 py-1.5 text-sm outline-none focus:border-(--color-accent)"
                />
              </form>

              <div className="flex flex-1 flex-col gap-1 overflow-y-auto text-sm">
                {LINKS.map((l) => (
                  <NavLink
                    key={l.href}
                    href={l.href}
                    className="rounded-lg px-2 py-2 hover:bg-white/5"
                    activeClassName="bg-white/10 font-medium text-white"
                    inactiveClassName="text-(--color-muted) hover:text-white"
                  >
                    {l.label}
                  </NavLink>
                ))}
                {isAdmin && (
                  <NavLink
                    href="/admin/invites"
                    className="rounded-lg px-2 py-2 hover:bg-white/5"
                    activeClassName="bg-white/10 font-medium text-white"
                    inactiveClassName="text-(--color-muted) hover:text-white"
                  >
                    Uitnodigen
                  </NavLink>
                )}
              </div>

              <form action={signOutAction} className="border-t border-white/10 pt-3">
                <button className="w-full rounded-lg px-2 py-2 text-left text-sm text-(--color-muted) hover:bg-white/5 hover:text-white">
                  Uitloggen
                </button>
              </form>
            </nav>
          </>,
          document.body
        )}
    </div>
  );
}
