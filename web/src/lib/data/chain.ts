import { createPublicClient, http, type Address, type Hash, type Log } from "viem";
import { trueUpAbi } from "../abi";
import { network } from "../config";
import { phaseOf } from "./phase";
import {
  NotConfiguredError,
  type LeaderMetric,
  type LeaderRow,
  type Market,
  type MarketSource,
  type Participant,
  type Position,
  type Side,
  type Stats,
} from "./types";

/*
 * Reads straight from the contract and its events. Fine for the MVP's scale (hundreds of markets);
 * an indexer can replace the event scans later without changing the MarketSource interface.
 */

const client = createPublicClient({ chain: network.chain, transport: http() });
const fromBlock = process.env.NEXT_PUBLIC_DEPLOY_BLOCK ? BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK) : 0n;

function contract(): Address {
  if (!network.contract) throw new NotConfiguredError();
  return network.contract;
}

type RawMarket = {
  creator: Address;
  question: string;
  optionA: string;
  optionB: string;
  stake: bigint;
  createdAt: bigint;
  deadline: bigint;
  settlementTimeout: bigint;
  status: number;
  countA: number;
  countB: number;
  totalEscrow: bigint;
  feeBps: number;
  creatorJoined: boolean;
};

function toMarket(id: number, r: RawMarket): Market {
  return {
    id,
    creator: r.creator,
    question: r.question,
    optionA: r.optionA,
    optionB: r.optionB,
    stake: r.stake,
    createdAt: Number(r.createdAt),
    deadline: Number(r.deadline),
    settlementTimeout: Number(r.settlementTimeout),
    status: r.status as Market["status"],
    countA: Number(r.countA),
    countB: Number(r.countB),
    totalEscrow: r.totalEscrow,
    feeBps: Number(r.feeBps),
    creatorJoined: r.creatorJoined,
  };
}

async function readMarket(id: number): Promise<Market | null> {
  const address = contract();
  try {
    const raw = (await client.readContract({ address, abi: trueUpAbi, functionName: "getMarket", args: [BigInt(id)] })) as RawMarket;
    if (raw.creator === "0x0000000000000000000000000000000000000000") return null;
    return toMarket(id, raw);
  } catch (error) {
    // An unknown id reverts; anything else (RPC down) must surface as an error, not as "not found".
    if (error instanceof Error && /revert/i.test(error.message)) return null;
    throw error;
  }
}

/** Decoded event args are read by name below; the event name decides which fields exist. */
type EventLog = Log & { args: Record<string, unknown> };

async function events(name: "ParticipantJoined" | "MarketSettled" | "RefundsOpened" | "WinningsClaimed" | "StakeRefunded", args?: Record<string, unknown>) {
  const logs = await client.getContractEvents({ address: contract(), abi: trueUpAbi, eventName: name, args: args as never, fromBlock, toBlock: "latest" });
  return logs as unknown as EventLog[];
}

async function blockTimes(logs: Log[]): Promise<Map<bigint, number>> {
  const numbers = [...new Set(logs.map((l) => l.blockNumber).filter((n): n is bigint => n !== null))];
  const blocks = await Promise.all(numbers.map((blockNumber) => client.getBlock({ blockNumber })));
  return new Map(blocks.map((b) => [b.number, Number(b.timestamp)]));
}

export const chainSource: MarketSource = {
  kind: "chain",

  async listMarkets() {
    const address = contract();
    const count = Number(await client.readContract({ address, abi: trueUpAbi, functionName: "marketCount" }));
    const ids = Array.from({ length: count }, (_, i) => i + 1);
    const markets = await Promise.all(ids.map(readMarket));
    return markets.filter((m): m is Market => m !== null);
  },

  getMarket: readMarket,

  async getParticipants(id) {
    const logs = await events("ParticipantJoined", { marketId: BigInt(id) });
    const times = await blockTimes(logs);
    return logs.map((l) => ({
      account: l.args.account as Address,
      side: Number(l.args.side) as Side,
      amount: l.args.amount as bigint,
      txHash: l.transactionHash as Hash,
      time: l.blockNumber !== null ? times.get(l.blockNumber) ?? null : null,
    }));
  },

  async getStats() {
    const markets = await this.listMarkets();
    const now = Math.floor(Date.now() / 1000);
    return markets.reduce<Stats>(
      (s, m) => {
        const phase = phaseOf(m, now);
        s.created += 1;
        if (phase === "open") s.open += 1;
        if (phase === "resolved") s.settled += 1;
        if (phase === "refundable") s.refunded += 1;
        s.staked += m.stake * BigInt(m.countA + m.countB);
        return s;
      },
      { created: 0, open: 0, staked: 0n, settled: 0, refunded: 0 },
    );
  },

  async getLeaders(metric: LeaderMetric) {
    const [markets, joins, claims] = await Promise.all([this.listMarkets(), events("ParticipantJoined"), events("WinningsClaimed")]);
    return rankLeaders(metric, markets, joins.map((l) => ({ marketId: Number(l.args.marketId), account: l.args.account as Address, side: Number(l.args.side) as Side, amount: l.args.amount as bigint })), claims.map((l) => ({ marketId: Number(l.args.marketId), account: l.args.account as Address, amount: l.args.amount as bigint })));
  },

  async getPosition(id, account) {
    const [side, claimed] = (await client.readContract({ address: contract(), abi: trueUpAbi, functionName: "positionOf", args: [BigInt(id), account] })) as readonly [number, boolean];
    if (side !== 1 && side !== 2) return null;
    const [joins, claims, refunds] = await Promise.all([
      events("ParticipantJoined", { marketId: BigInt(id), account }),
      claimed ? events("WinningsClaimed", { marketId: BigInt(id), account }) : Promise.resolve([] as EventLog[]),
      claimed ? events("StakeRefunded", { marketId: BigInt(id), account }) : Promise.resolve([] as EventLog[]),
    ]);
    const paid = [...claims, ...refunds][0];
    return {
      side: side as Side,
      claimed,
      paid: paid ? (paid.args.amount as bigint) : null,
      paidTx: paid ? (paid.transactionHash as Hash) : null,
      joinTx: joins[0] ? (joins[0].transactionHash as Hash) : null,
    };
  },

  async getPositions(account) {
    const [joins, claims, refunds] = await Promise.all([
      events("ParticipantJoined", { account }),
      events("WinningsClaimed", { account }),
      events("StakeRefunded", { account }),
    ]);
    const paid = new Map<number, { amount: bigint; tx: Hash }>();
    for (const l of [...claims, ...refunds]) paid.set(Number(l.args.marketId), { amount: l.args.amount as bigint, tx: l.transactionHash as Hash });
    const positions = await Promise.all(
      joins.map(async (l) => {
        const id = Number(l.args.marketId);
        const market = await readMarket(id);
        if (!market) return null;
        const p = paid.get(id);
        return {
          market,
          side: Number(l.args.side) as Side,
          amount: l.args.amount as bigint,
          joinTx: l.transactionHash as Hash,
          claimed: Boolean(p),
          paid: p?.amount ?? null,
          paidTx: p?.tx ?? null,
        } satisfies Position;
      }),
    );
    return positions.filter((p): p is Position => p !== null);
  },
};

type Join = { marketId: number; account: Address; side: Side; amount: bigint };
type Claim = { marketId: number; account: Address; amount: bigint };

/** Separate rankings, never blended (PRD 9). Only settled markets count toward results. */
export function rankLeaders(metric: LeaderMetric, markets: Market[], joins: Join[], claims: Claim[]): LeaderRow[] {
  const byId = new Map(markets.map((m) => [m.id, m]));
  const settled = (id: number) => {
    const s = byId.get(id)?.status;
    return s === 1 || s === 2;
  };
  const tally = new Map<Address, { a: number | bigint; b: number }>();
  const bump = (acct: Address, a: number | bigint, b = 0) => {
    const key = acct.toLowerCase() as Address;
    const cur = tally.get(key) ?? { a: typeof a === "bigint" ? 0n : 0, b: 0 };
    tally.set(key, { a: (cur.a as never) + (a as never), b: cur.b + b });
  };

  if (metric === "correct") {
    for (const j of joins) if (settled(j.marketId)) bump(j.account, byId.get(j.marketId)!.status === j.side ? 1 : 0, 1);
  } else if (metric === "settled") {
    for (const m of markets) if (m.status === 1 || m.status === 2) bump(m.creator, 1);
  } else if (metric === "joined") {
    for (const j of joins) bump(j.account, 1);
  } else {
    for (const j of joins) if (settled(j.marketId)) bump(j.account, -j.amount, 1);
    for (const c of claims) if (settled(c.marketId)) bump(c.account, c.amount);
  }

  const detail = (b: number) =>
    metric === "correct" ? `of ${b} settled` : metric === "net" ? `${b} settled ${b === 1 ? "market" : "markets"}` : "";

  return [...tally.entries()]
    .map(([account, t]) => ({ account, value: t.a, detail: detail(t.b) }))
    .filter((r) => (typeof r.value === "bigint" ? true : r.value > 0))
    .sort((x, y) => (x.value > y.value ? -1 : x.value < y.value ? 1 : 0))
    .slice(0, 50);
}
