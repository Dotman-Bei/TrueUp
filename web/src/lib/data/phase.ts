import { computeSplit } from "../money";
import type { Market, Phase, Side } from "./types";

export function phaseOf(m: Market, now: number): Phase {
  if (m.status === 1 || m.status === 2) return "resolved";
  if (m.status === 3) return "refundable";
  if (now < m.deadline) return "open";
  if (m.countA === 0 || m.countB === 0) return "one-sided";
  if (now >= m.deadline + m.settlementTimeout) return "refund-due";
  return "awaiting";
}

export function winningSide(m: Market): Side | null {
  return m.status === 1 ? 1 : m.status === 2 ? 2 : null;
}

export function sideName(m: Market, side: Side) {
  return side === 1 ? m.optionA : m.optionB;
}

/** Payout for one winning position, from the market's own captured fee. */
export function payoutFor(m: Market, side: Side): bigint {
  return computeSplit(m.stake, m.countA, m.countB, side, m.feeBps).each;
}

export const phaseLabel: Record<Phase, string> = {
  open: "Open",
  awaiting: "Awaiting result",
  "refund-due": "Refunds can open",
  "one-sided": "Refundable",
  resolved: "Resolved",
  refundable: "Refundable",
};

/** The pill pair each phase uses: tones are defined in app.css */
export const phaseTone: Record<Phase, "neutral" | "warning" | "positive" | "negative"> = {
  open: "neutral",
  awaiting: "warning",
  "refund-due": "warning",
  "one-sided": "neutral",
  resolved: "positive",
  refundable: "neutral",
};

/** The filter tabs on /markets map phases to the PRD's five filters */
export type MarketFilter = "all" | "open" | "awaiting" | "resolved" | "refundable";
export function filterOf(p: Phase): Exclude<MarketFilter, "all"> {
  if (p === "open") return "open";
  if (p === "awaiting" || p === "refund-due") return "awaiting";
  if (p === "resolved") return "resolved";
  return "refundable";
}
