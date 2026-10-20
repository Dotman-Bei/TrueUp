"use client";

import { useEffect, useState } from "react";
import { isAddress, type Address } from "viem";
import { network, useFixtures } from "./config";
import { FIXTURE_WALLET } from "./data/fixtures";
import { useWallet } from "./wallet";

/**
 * Whose positions a screen shows: the connected wallet. For layout checks only, with no wallet connected:
 * in fixture mode `?as=fixture` shows the fixture wallet, and on a local node `?as=0x…` shows any address.
 * Neither can send a transaction; that always needs the connected wallet.
 */
export function useViewer(): { address?: Address; isFixture: boolean } {
  const wallet = useWallet();
  const [override, setOverride] = useState<Address | null>(null);
  useEffect(() => {
    const as = new URLSearchParams(window.location.search).get("as");
    if (useFixtures && as === "fixture") setOverride(FIXTURE_WALLET);
    else if (network.key === "local" && as && isAddress(as)) setOverride(as);
  }, []);
  if (override && !wallet.address) return { address: override, isFixture: true };
  return { address: wallet.address, isFixture: false };
}
