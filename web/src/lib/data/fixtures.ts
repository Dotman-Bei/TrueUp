import { keccak256, toHex, type Address, type Hash } from "viem";
import { parseBot } from "../money";
import { nowSeconds } from "../time";
import { rankLeaders } from "./chain";
import { phaseOf, payoutFor } from "./phase";
import type { Market, MarketSource, Participant, Position, Side, Stats } from "./types";

/*
 * DEVELOPMENT ONLY. Layout-check data so screens can be judged at real density before the contract
 * is deployed. config.useFixtures refuses this in production builds, and every screen showing it
 * carries the "Fixture data" notice. Nothing here is on-chain and none of it may ship as real activity.
 */

const H = 3600;
const D = 24 * H;
const TIMEOUT = 72 * H;

const addr = (seed: string) => keccak256(toHex(seed)).slice(0, 42) as Address;
const tx = (seed: string) => keccak256(toHex(`tx:${seed}`)) as Hash;

/** The wallet the fixture portfolio belongs to */
export const FIXTURE_WALLET = addr("you");
const crowd = Array.from({ length: 24 }, (_, i) => addr(`friend-${i}`));

type Spec = {
  q: string;
  a: string;
  b: string;
  stake: string;
  countA: number;
  countB: number;
  /** deadline relative to now, seconds */
  closes: number;
  status?: Market["status"];
  creator?: number;
  you?: Side;
  youClaimed?: boolean;
};

const specs: Spec[] = [
  { q: "Will Maya finish the 5K on Saturday?", a: "She finishes", b: "She does not finish", stake: "0.2", countA: 4, countB: 3, closes: 2 * D + 4 * H, you: 1 },
  { q: "Will Dayo's flight land before 21:00?", a: "Lands before 21:00", b: "Lands later", stake: "0.1", countA: 5, countB: 6, closes: 7 * H },
  { q: "Does the study group finish the CS201 set by Friday?", a: "Done by Friday", b: "Not done", stake: "0.05", countA: 6, countB: 2, closes: D + 12 * H },
  { q: "Will it rain on the club picnic on Sunday?", a: "It rains", b: "It stays dry", stake: "0.1", countA: 3, countB: 5, closes: 3 * D + 2 * H },
  { q: "Will our Discord reach 500 members this week?", a: "Reaches 500", b: "Stays under", stake: "0.5", countA: 2, countB: 4, closes: 5 * D, creator: 3 },
  { q: "Will Tomi's team win the five-a-side final?", a: "Tomi's team wins", b: "They lose", stake: "0.2", countA: 7, countB: 4, closes: -5 * H, creator: 0, you: 1 },
  { q: "Will the hackathon demo run without crashing?", a: "Runs clean", b: "It crashes", stake: "0.1", countA: 4, countB: 4, closes: -80 * H, you: 2 },
  { q: "Will Ife beat her 10K personal best?", a: "Beats it", b: "Misses it", stake: "0.2", countA: 5, countB: 2, closes: -4 * D, status: 1, you: 1, youClaimed: false },
  { q: "Will the group agree on a restaurant before 20:00?", a: "Agreed by 20:00", b: "Still arguing", stake: "0.05", countA: 3, countB: 6, closes: -6 * D, status: 2, you: 1 },
  { q: "Will Kemi's sourdough rise overnight?", a: "It rises", b: "It stays flat", stake: "0.1", countA: 4, countB: 0, closes: -2 * D },
  { q: "Can Sam hold a plank for three minutes?", a: "Holds it", b: "Drops early", stake: "0.2", countA: 3, countB: 3, closes: -9 * D, status: 3, you: 2, youClaimed: true },
  { q: "Will the new campus café open before exams?", a: "Opens before exams", b: "Opens after", stake: "0.1", countA: 6, countB: 5, closes: -12 * D, status: 1, creator: 0 },
  { q: "Does Bayo ship the bot before the meetup?", a: "Ships it", b: "Misses the meetup", stake: "0.3", countA: 2, countB: 5, closes: -15 * D, status: 2, you: 2, youClaimed: true },
];

let cache: { markets: Market[]; joins: (Participant & { marketId: number })[]; claims: { marketId: number; account: Address; amount: bigint }[] } | null = null;

function build() {
  if (cache) return cache;
  const now = nowSeconds();
  const markets: Market[] = [];
  const joins: (Participant & { marketId: number })[] = [];
  const claims: { marketId: number; account: Address; amount: bigint }[] = [];

  specs.forEach((s, i) => {
    const id = 4396 + i;
    const stake = parseBot(s.stake)!;
    const deadline = now + s.closes;
    const market: Market = {
      id,
      creator: s.creator !== undefined ? crowd[s.creator] : crowd[(i * 5 + 7) % crowd.length],
      question: s.q,
      optionA: s.a,
      optionB: s.b,
      stake,
      createdAt: deadline - (Math.abs(s.closes) > 3 * D ? 6 * D : 3 * D),
      deadline,
      settlementTimeout: TIMEOUT,
      status: s.status ?? 0,
      countA: s.countA,
      countB: s.countB,
      totalEscrow: stake * BigInt(s.countA + s.countB),
      feeBps: 10,
      creatorJoined: false,
    };
    markets.push(market);

    // seat the crowd: the fixture wallet takes its side first, the rest rotate through the crowd
    let seat = i * 3;
    const take = (side: Side, n: number) => {
      for (let k = 0; k < n; k++) {
        const isYou = s.you === side && k === 0;
        const account = isYou ? FIXTURE_WALLET : crowd[seat++ % crowd.length];
        joins.push({ marketId: id, account, side, amount: stake, txHash: tx(`${id}-${side}-${k}`), time: market.createdAt + (k + 1) * 1800 * side });
      }
    };
    take(1, s.countA);
    take(2, s.countB);

    if (market.status === 1 || market.status === 2) {
      const won = market.status as Side;
      const each = payoutFor(market, won);
      for (const j of joins.filter((j) => j.marketId === id && j.side === won)) {
        const isYou = j.account === FIXTURE_WALLET;
        if (isYou && s.youClaimed === false) continue;
        claims.push({ marketId: id, account: j.account, amount: each });
      }
    }
    if (market.status === 3) {
      for (const j of joins.filter((j) => j.marketId === id)) {
        if (j.account === FIXTURE_WALLET && !s.youClaimed) continue;
        claims.push({ marketId: id, account: j.account, amount: stake });
      }
    }
  });

  cache = { markets, joins, claims };
  return cache;
}

const later = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 250));

export const fixtureSource: MarketSource = {
  kind: "fixtures",
  listMarkets: () => later(build().markets),
  getMarket: (id) => later(build().markets.find((m) => m.id === id) ?? null),
  getParticipants: (id) => later(build().joins.filter((j) => j.marketId === id)),
  getStats: () => {
    const now = nowSeconds();
    const s = build().markets.reduce<Stats>(
      (acc, m) => {
        const p = phaseOf(m, now);
        acc.created += 1;
        if (p === "open") acc.open += 1;
        if (p === "resolved") acc.settled += 1;
        if (p === "refundable") acc.refunded += 1;
        acc.staked += m.totalEscrow;
        return acc;
      },
      { created: 0, open: 0, staked: 0n, settled: 0, refunded: 0 },
    );
    return later(s);
  },
  getLeaders: (metric) => {
    const { markets, joins, claims } = build();
    return later(rankLeaders(metric, markets, joins.map((j) => ({ marketId: j.marketId, account: j.account, side: j.side, amount: j.amount })), claims));
  },
  getPositions: (account) => {
    const { markets, joins, claims } = build();
    const mine = joins.filter((j) => j.account.toLowerCase() === account.toLowerCase());
    return later(
      mine.map<Position>((j) => {
        const market = markets.find((m) => m.id === j.marketId)!;
        const paid = claims.find((c) => c.marketId === j.marketId && c.account === j.account);
        return { market, side: j.side, amount: j.amount, joinTx: j.txHash, claimed: Boolean(paid), paid: paid?.amount ?? null, paidTx: paid ? tx(`claim-${j.marketId}`) : null };
      }),
    );
  },
};
