"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { useFixtures } from "../config";
import { chainSource } from "./chain";
import { fixtureSource } from "./fixtures";
import { NotConfiguredError, type LeaderMetric, type MarketSource } from "./types";

export const source: MarketSource = useFixtures ? fixtureSource : chainSource;

/** Contract reads refresh every 20 s; transactions invalidate the affected keys on receipt. */
const live = { refetchInterval: 20_000, retry: (n: number, e: Error) => !(e instanceof NotConfiguredError) && n < 2 };

export const keys = {
  markets: ["markets"] as const,
  market: (id: number) => ["market", id] as const,
  participants: (id: number) => ["participants", id] as const,
  stats: ["stats"] as const,
  leaders: (m: LeaderMetric) => ["leaders", m] as const,
  positions: (a?: string) => ["positions", a?.toLowerCase()] as const,
  position: (id: number, a?: string) => ["position", id, a?.toLowerCase()] as const,
};

export const useMarkets = () => useQuery({ queryKey: keys.markets, queryFn: () => source.listMarkets(), ...live });
export const useMarket = (id: number) =>
  useQuery({ queryKey: keys.market(id), queryFn: () => source.getMarket(id), enabled: Number.isSafeInteger(id) && id > 0, ...live });
export const useParticipants = (id: number) => useQuery({ queryKey: keys.participants(id), queryFn: () => source.getParticipants(id), ...live });
export const useStats = () => useQuery({ queryKey: keys.stats, queryFn: () => source.getStats(), ...live });
export const useLeaders = (m: LeaderMetric) => useQuery({ queryKey: keys.leaders(m), queryFn: () => source.getLeaders(m), ...live });
export const usePositions = (account?: Address) =>
  useQuery({ queryKey: keys.positions(account), queryFn: () => source.getPositions(account!), enabled: Boolean(account), ...live });

export const usePosition = (id: number, account?: Address) =>
  useQuery({ queryKey: keys.position(id, account), queryFn: () => source.getPosition(id, account!), enabled: Boolean(account) && id > 0, ...live });

export { NotConfiguredError };
export * from "./types";
export * from "./phase";
