"use client";

import { useEffect, useState } from "react";
import { nowSeconds } from "./time";

/** The clock in unix seconds, null until mounted so server and client render the same first frame. */
export function useNow(every = 15_000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(nowSeconds());
    const t = setInterval(() => setNow(nowSeconds()), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}
