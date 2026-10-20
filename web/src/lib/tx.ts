"use client";

import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useState } from "react";
import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError, type Hash, type TransactionReceipt } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { trueUpAbi } from "./abi";
import { network, useFixtures } from "./config";

export type TxState =
  | { status: "idle" }
  | { status: "switching" }
  | { status: "wallet" }
  | { status: "pending"; hash: Hash }
  | { status: "confirmed"; hash: Hash }
  | { status: "failed"; message: string; hash?: Hash };

type Call = {
  functionName: "createMarket" | "join" | "settle" | "openRefunds" | "claimWinnings" | "claimRefund";
  args: readonly unknown[];
  value?: bigint;
};

/** The contract's custom errors in words people use. */
const REASONS: Record<string, string> = {
  WrongStake: "The stake has to be exactly the market's amount.",
  EntriesClosed: "Entries have closed for this market.",
  AlreadyJoined: "This wallet already has a side in this market.",
  MarketNotOpen: "This market has already been settled or refunded.",
  NotCreator: "Only the market's creator can confirm the result.",
  TooEarly: "The deadline hasn't passed yet.",
  SettlementWindowOver: "The 72-hour window to settle has passed. Refunds can be opened instead.",
  OneSidedMarket: "Nobody took the other side, so this market can only be refunded.",
  RefundsNotAvailable: "Refunds aren't available yet.",
  NotResolved: "This market hasn't been settled.",
  NotRefundable: "This market isn't refundable.",
  NotAWinner: "This wallet wasn't on the winning side.",
  NotParticipant: "This wallet isn't in this market.",
  AlreadyClaimed: "Already claimed. Check your wallet's history.",
  InvalidText: "The question or a side is empty or too long.",
  SameOptions: "The two sides have to say different things.",
  StakeOutOfRange: "That stake is outside the allowed range.",
  DeadlineOutOfRange: "The deadline must be between 1 hour and 30 days away.",
  UnknownMarket: "There's no market with that number.",
  TransferFailed: "The payout couldn't be sent to this address.",
};

/** Plain-language reason for a failed write. Never shows a pending transaction as done. */
export function explain(error: unknown): string {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) return "Rejected in your wallet. Nothing was sent.";
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
    if (revert) {
      const name = revert.data?.errorName;
      return (name && REASONS[name]) || `The contract refused it: ${revert.reason ?? name ?? "no reason given"}.`;
    }
    if (/insufficient funds/i.test(error.message)) return "Not enough BOT for this and its gas.";
    if (/chain/i.test(error.shortMessage) && /mismatch|switch/i.test(error.shortMessage)) return `Switch your wallet to ${network.label} and try again.`;
    return error.shortMessage || "Couldn't reach BOT Chain. Nothing changed; try again.";
  }
  return "Couldn't reach BOT Chain. Nothing changed; try again.";
}

/**
 * One write to the TrueUp contract: switch to the right chain if needed, ask the wallet, wait for the
 * receipt, then refresh the reads it affects. State only moves to "confirmed" on a successful receipt.
 */
export function useTx() {
  const [state, setState] = useState<TxState>({ status: "idle" });
  const account = useAccount();
  const client = usePublicClient({ chainId: network.chain.id });
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();

  async function send(call: Call, invalidate: QueryKey[] = []): Promise<TransactionReceipt | null> {
    if (useFixtures) {
      setState({ status: "failed", message: "Fixture data is on screen, so transactions are switched off." });
      return null;
    }
    if (!network.contract) {
      setState({ status: "failed", message: `The TrueUp contract isn't deployed on ${network.label} yet.` });
      return null;
    }
    try {
      if (account.chainId !== network.chain.id) {
        setState({ status: "switching" });
        await switchChainAsync({ chainId: network.chain.id });
      }
      setState({ status: "wallet" });
      const hash = await writeContractAsync({
        address: network.contract,
        abi: trueUpAbi,
        functionName: call.functionName,
        args: call.args as never,
        value: call.value,
        chainId: network.chain.id,
      } as never);
      setState({ status: "pending", hash });
      const receipt = await client!.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        setState({ status: "failed", hash, message: "Reverted on BOT Chain. Nothing changed." });
        return null;
      }
      setState({ status: "confirmed", hash });
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      return receipt;
    } catch (error) {
      setState({ status: "failed", message: explain(error) });
      return null;
    }
  }

  const busy = state.status === "switching" || state.status === "wallet" || state.status === "pending";
  return { state, send, busy, reset: () => setState({ status: "idle" }) };
}
