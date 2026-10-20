"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";
import { useFixtures } from "./config";
import { FIXTURE_WALLET } from "./data/fixtures";
import { useWallet } from "./wallet";

/**
 * Whose positions a screen shows: the connected wallet. In fixture mode only, `?as=fixture` shows the
 * fixture wallet's view so layouts with positions can be checked; transactions stay switched off there.
 */
export function useViewer(): { address?: Address; isFixture: boolean } {
  const wallet = useWallet();
  const [asFixture, setAsFixture] = useState(false);
  useEffect(() => {
    if (useFixtures) setAsFixture(new URLSearchParams(window.location.search).get("as") === "fixture");
  }, []);
  if (asFixture && !wallet.address) return { address: FIXTURE_WALLET, isFixture: true };
  return { address: wallet.address, isFixture: false };
}
