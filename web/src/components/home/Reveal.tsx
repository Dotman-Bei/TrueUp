"use client";

import { useEffect } from "react";

/**
 * Plays each [data-reveal] element's entrance once as it enters the viewport.
 * Hidden states only exist under html.js and prefers-reduced-motion: no-preference (home.css),
 * so content is never lost if this never runs.
 */
export function Reveal() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );
    targets.forEach((el) => io.observe(el));
    const safety = window.setTimeout(() => {
      targets.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) el.classList.add("is-in");
      });
    }, 2500);
    return () => {
      io.disconnect();
      clearTimeout(safety);
    };
  }, []);
  return null;
}
