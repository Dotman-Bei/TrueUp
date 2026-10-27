"use client";

import { useEffect, useState } from "react";
import { useConnect } from "wagmi";
import { formatBot, shortAddress } from "@/lib/money";
import { useWallet } from "@/lib/wallet";

/** True once mounted in a browser that has no injected EVM wallet. */
export function useNoWallet() {
  const [none, setNone] = useState(false);
  useEffect(() => setNone(!(window as { ethereum?: unknown }).ethereum), []);
  return none;
}

/**
 * Connect, or the connected wallet in short form. The app shell has its own richer version
 * (WalletMenu); this one is for the home page's plain nav.
 */
export function ConnectButton({ className }: { className?: string }) {
  const wallet = useWallet();
  const { connect, connectors, isPending, error } = useConnect();
  // every hook runs on every render, before any early return: the wallet can connect between renders
  const noWallet = useNoWallet();
  const injected = connectors[0];

  if (wallet.connected && wallet.address) {
    return (
      <a className={className} href="/portfolio">
        <span className="nums">{shortAddress(wallet.address)}</span>
        {wallet.balance !== undefined && <span className="nums"> · {formatBot(wallet.balance, 2)} BOT</span>}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      disabled={isPending}
      title={error ? error.message : noWallet ? "Install an EVM wallet such as MetaMask or Rabby to connect" : undefined}
      onClick={() => injected && connect({ connector: injected })}
    >
      {isPending ? "Check your wallet" : "Connect wallet"}
    </button>
  );
}
