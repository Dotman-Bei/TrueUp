"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConnectButton } from "../ConnectButton";

const links = [
  { href: "/markets", label: "Markets" },
  { href: "/leaders", label: "Leaders" },
  { href: "/portfolio", label: "Portfolio" },
];

export function HomeNav() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav className="nav" aria-label="Main">
      <Link className="nav__mark" href="/">
        TrueUp
      </Link>
      <ul className="nav__links">
        {links.map((l) => (
          <li key={l.href}>
            <Link className="nav__link" href={l.href}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      <ConnectButton className="nav__action" />
      <button className="nav__menu" type="button" aria-expanded={open} aria-controls="menu-sheet" onClick={() => setOpen(true)}>
        Menu
      </button>
      <div id="menu-sheet" className="sheet" data-open={open} hidden={!open}>
        <div className="sheet__top">
          <span className="nav__mark">TrueUp</span>
          <button className="nav__menu" type="button" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
        <ul className="sheet__links">
          {[...links, { href: "/create", label: "Create a market" }].map((l) => (
            <li key={l.href}>
              <Link href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <ConnectButton className="button button--paper sheet__action" />
      </div>
    </nav>
  );
}
