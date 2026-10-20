/*
 * All amounts are integer wei (bigint). Formatting happens only at the display boundary,
 * with integer arithmetic: no floating point ever touches an amount.
 */

const WEI = 10n ** 18n;

/** Parse a decimal BOT string ("0.2") to wei. Returns null for anything that is not a plain decimal. */
export function parseBot(input: string): bigint | null {
  const s = input.trim();
  if (!/^\d+(\.\d{0,18})?$/.test(s) && !/^\.\d{1,18}$/.test(s)) return null;
  const [whole = "0", frac = ""] = s.split(".");
  return BigInt(whole || "0") * WEI + BigInt((frac + "0".repeat(18)).slice(0, 18));
}

/**
 * Format wei as BOT with a fixed number of decimals, rounding toward zero so a payout is never overstated.
 * `trim` drops trailing zeros (for stakes like "0.2"); figures in columns keep fixed decimals.
 */
export function formatBot(wei: bigint, decimals = 4, opts: { trim?: boolean; sign?: boolean } = {}): string {
  const negative = wei < 0n;
  const abs = negative ? -wei : wei;
  const scale = 10n ** BigInt(18 - decimals);
  const units = abs / scale;
  const base = 10n ** BigInt(decimals);
  const whole = (units / base).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  let frac = decimals > 0 ? (units % base).toString().padStart(decimals, "0") : "";
  if (opts.trim) frac = frac.replace(/0+$/, "");
  const body = frac ? `${whole}.${frac}` : whole;
  const sign = negative ? "−" : opts.sign && wei > 0n ? "+" : "";
  return sign + body;
}

export type Split = {
  pot: bigint;
  fee: bigint;
  distributable: bigint;
  winners: number;
  each: bigint;
  dust: bigint;
  refundable: boolean;
};

/**
 * The settlement arithmetic the contract performs (PRD 6.9, 6.10, 6.8):
 * pot = stake × participants; fee = pot × feeBps / 10 000 on settled pools only;
 * each winner = floor(distributable / winners); the remainder (dust, under `winners` wei) joins the fee;
 * a pool with an empty side is refunded with no fee.
 */
export function computeSplit(stake: bigint, countA: number, countB: number, winningSide: 1 | 2, feeBps: number): Split {
  const pot = stake * BigInt(countA + countB);
  if (countA === 0 || countB === 0) {
    return { pot, fee: 0n, distributable: pot, winners: 0, each: stake, dust: 0n, refundable: true };
  }
  const fee = (pot * BigInt(feeBps)) / 10_000n;
  const distributable = pot - fee;
  const winners = winningSide === 1 ? countA : countB;
  const each = distributable / BigInt(winners);
  return { pot, fee, distributable, winners, each, dust: distributable - each * BigInt(winners), refundable: false };
}

export function feePercent(bps: number): string {
  const whole = Math.floor(bps / 100);
  const frac = (bps % 100).toString().padStart(2, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}%` : `${whole}%`;
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
