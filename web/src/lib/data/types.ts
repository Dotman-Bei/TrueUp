import type { Address, Hash } from "viem";

export type Side = 1 | 2;

/** Raw contract status: 0 Open, 1 ResolvedA, 2 ResolvedB, 3 Refundable */
export type ContractStatus = 0 | 1 | 2 | 3;

export type Market = {
  id: number;
  creator: Address;
  question: string;
  optionA: string;
  optionB: string;
  stake: bigint;
  createdAt: number;
  deadline: number;
  settlementTimeout: number;
  status: ContractStatus;
  countA: number;
  countB: number;
  totalEscrow: bigint;
  feeBps: number;
  creatorJoined: boolean;
};

/**
 * What a person sees, derived from contract status and the clock. The contract stays the authority;
 * these only decide which words and which action to show.
 */
export type Phase =
  | "open" // before the deadline
  | "awaiting" // deadline passed, creator may settle
  | "refund-due" // timeout passed, anyone may open refunds
  | "one-sided" // deadline passed with an empty side: refundable without fee
  | "resolved" // settled: status 1 or 2
  | "refundable"; // status 3

export type Participant = {
  account: Address;
  side: Side;
  amount: bigint;
  txHash: Hash;
  time: number | null;
};

export type Stats = {
  created: number;
  open: number;
  staked: bigint;
  settled: number;
  refunded: number;
};

export type LeaderMetric = "correct" | "settled" | "joined" | "net";

export type LeaderRow = {
  account: Address;
  value: number | bigint;
  /** secondary figure, e.g. "of 9 settled" */
  detail: string;
};

export type Position = {
  market: Market;
  side: Side;
  amount: bigint;
  joinTx: Hash;
  claimed: boolean;
  /** amount paid out to this wallet (claim or refund), if any */
  paid: bigint | null;
  paidTx: Hash | null;
};

export interface MarketSource {
  readonly kind: "chain" | "fixtures";
  listMarkets(): Promise<Market[]>;
  getMarket(id: number): Promise<Market | null>;
  getParticipants(id: number): Promise<Participant[]>;
  getStats(): Promise<Stats>;
  getLeaders(metric: LeaderMetric): Promise<LeaderRow[]>;
  getPositions(account: Address): Promise<Position[]>;
}

export class NotConfiguredError extends Error {
  constructor() {
    super("The TrueUp contract address is not configured for this network.");
  }
}
