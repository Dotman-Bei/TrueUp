import { defineChain, type Address } from "viem";

/*
 * Network settings live here and in the environment, nowhere else.
 * Verify them against https://dev-docs.botchain.ai/docs/Developers/quick-guide/ before every deploy.
 * There is deliberately no fallback from mainnet to testnet: an unknown or half-configured
 * network leaves the app read-only with an explicit message.
 */

export const bohrTestnet = defineChain({
  id: 968,
  name: "Bohr testnet",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_BOHR_RPC || "https://rpc.bohr.life"] } },
  blockExplorers: { default: { name: "Bohr scan", url: "https://scan.bohr.life" } },
  testnet: true,
});

export const botMainnet = defineChain({
  id: 677,
  name: "BOT Chain",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_MAINNET_RPC || "https://rpc.botchain.ai"] } },
  blockExplorers: { default: { name: "BOT scan", url: "https://scan.botchain.ai" } },
});

/** Development only: a local Anvil node, for running the real contract before testnet. */
export const localNode = defineChain({
  id: 31337,
  name: "Local node",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_LOCAL_RPC || "http://127.0.0.1:8545"] } },
  blockExplorers: { default: { name: "none", url: "https://scan.bohr.life" } },
  testnet: true,
});

export type NetworkKey = "bohr" | "mainnet" | "local";

const requested = process.env.NEXT_PUBLIC_NETWORK;
if (requested === "local" && process.env.NODE_ENV === "production") {
  throw new Error("NEXT_PUBLIC_NETWORK=local is for development only.");
}
const networkKey: NetworkKey = requested === "mainnet" ? "mainnet" : requested === "local" ? "local" : "bohr";

const contracts: Record<NetworkKey, string | undefined> = {
  bohr: process.env.NEXT_PUBLIC_BOHR_CONTRACT,
  mainnet: process.env.NEXT_PUBLIC_MAINNET_CONTRACT,
  local: process.env.NEXT_PUBLIC_LOCAL_CONTRACT,
};

function asAddress(value: string | undefined): Address | null {
  return value && /^0x[0-9a-fA-F]{40}$/.test(value) ? (value as Address) : null;
}

export const network = {
  key: networkKey,
  chain: networkKey === "mainnet" ? botMainnet : networkKey === "local" ? localNode : bohrTestnet,
  contract: asAddress(contracts[networkKey]),
  isTestnet: networkKey !== "mainnet",
  /** Short name used in copy: "Bohr testnet" / "BOT Chain" */
  label: networkKey === "mainnet" ? "BOT Chain" : networkKey === "local" ? "a local node" : "Bohr testnet",
};

/** BOT Chain's official website, linked in every footer. */
export const BOT_CHAIN_SITE = "https://www.botchain.ai";

/** Proposed default fee (PRD 6.10). The live value is read from each market, captured at creation. */
export const DEFAULT_FEE_BPS = 10;
export const MAX_FEE_BPS = 500;
export const SETTLEMENT_TIMEOUT_SECONDS = 72 * 60 * 60;

/** Create-form bounds. The contract enforces its own; these keep the form from offering what it would reject. */
export const LIMITS = {
  question: 140,
  option: 48,
  /** the contract's limits are in UTF-8 bytes */
  questionBytes: 280,
  optionBytes: 96,
  minStake: "0.001",
  maxStake: "100",
  minDurationSeconds: 60 * 60,
  maxDurationSeconds: 30 * 24 * 60 * 60,
};

/**
 * Fixture data exists only so layouts can be checked at real density during development.
 * It is refused in production builds, and every screen that shows it says so.
 */
export const useFixtures =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DATA_SOURCE === "fixtures";

export function explorerTx(hash: string) {
  return `${network.chain.blockExplorers.default.url}/tx/${hash}`;
}
export function explorerAddress(address: string) {
  return `${network.chain.blockExplorers.default.url}/address/${address}`;
}
