"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { createConfig, http, useAccount, useBalance, WagmiProvider } from "wagmi";
import { injected } from "@wagmi/core";
import { network } from "./config";

export const wagmiConfig = createConfig({
  chains: [network.chain],
  connectors: [injected({ shimDisconnect: true })],
  transports: { [network.chain.id]: http() } as never,
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 10_000 } } }));
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

/** The wallet as the UI needs it: connected, on the right chain, and its BOT balance. */
export function useWallet() {
  const account = useAccount();
  const onChain = account.chainId === network.chain.id;
  const balance = useBalance({ address: account.address, chainId: network.chain.id, query: { enabled: Boolean(account.address) && onChain } });
  return {
    address: account.address,
    connected: account.isConnected,
    connecting: account.isConnecting || account.isReconnecting,
    wrongChain: account.isConnected && !onChain,
    balance: balance.data?.value,
  };
}
