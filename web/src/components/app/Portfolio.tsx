"use client";

import Link from "next/link";
import { useState } from "react";
import { useConnect } from "wagmi";
import type { Address } from "viem";
import { keys, NotConfiguredError, payoutFor, phaseOf, sideName, usePositions, winningSide, type Phase, type Position } from "@/lib/data";
import { explorerAddress, explorerTx, network } from "@/lib/config";
import { formatBot, shortAddress } from "@/lib/money";
import { formatIsoDate, formatSpan } from "@/lib/time";
import { useTx } from "@/lib/tx";
import { useNow } from "@/lib/useNow";
import { useViewer } from "@/lib/viewer";
import { useWallet } from "@/lib/wallet";
import { Rope } from "../Rope";
import { TopBar } from "./Shell";
import { TxStatus } from "./TxStatus";

type Row = Position & { phase: Phase; claimable: bigint; kind: "win" | "refund" | null; outcome: "won" | "lost" | "refunded" | null };

function classify(p: Position, now: number): Row {
  const phase = phaseOf(p.market, now);
  const won = winningSide(p.market);
  let claimable = 0n;
  let kind: Row["kind"] = null;
  let outcome: Row["outcome"] = null;
  if (phase === "resolved") {
    outcome = won === p.side ? "won" : "lost";
    if (outcome === "won" && !p.claimed) {
      claimable = payoutFor(p.market, p.side);
      kind = "win";
    }
  } else if (phase === "refundable" || phase === "one-sided") {
    outcome = "refunded";
    if (!p.claimed) {
      claimable = p.amount;
      kind = "refund";
    }
  }
  return { ...p, phase, claimable, kind, outcome };
}

function ClaimRow({ r, viewer }: { r: Row; viewer: Address }) {
  const tx = useTx();
  const wallet = useWallet();
  const invalidate = [keys.positions(viewer), keys.position(r.market.id, viewer), keys.market(r.market.id)];
  return (
    <li className="claim-row">
      <div className="claim-row__text">
        <Link href={`/markets/${r.market.id}`}>{r.market.question}</Link>
        <span className="muted">{r.kind === "win" ? `You won on “${sideName(r.market, r.side)}”` : r.phase === "one-sided" ? "Nobody took the other side" : "Refunds are open"}</span>
        <TxStatus state={tx.state} done={r.kind === "win" ? "Claimed." : "Refunded."} />
      </div>
      <span className="claim-row__amount nums">{formatBot(r.claimable, 6)} BOT</span>
      <button
        type="button"
        className="btn"
        disabled={tx.busy || !wallet.connected}
        onClick={() => tx.send({ functionName: r.kind === "win" ? "claimWinnings" : "claimRefund", args: [BigInt(r.market.id)] }, invalidate)}
      >
        {tx.busy ? "Waiting…" : r.kind === "win" ? "Claim" : "Refund"}
      </button>
    </li>
  );
}

export function Portfolio() {
  const { address: viewer, isFixture } = useViewer();
  const wallet = useWallet();
  const { connect, connectors, isPending } = useConnect();
  const positions = usePositions(viewer);
  const now = useNow();

  const top = <TopBar title="Portfolio" />;

  if (!viewer) {
    return (
      <>
        {top}
        <main className="canvas">
          <div className="title-row">
            <div>
              <h1>Portfolio</h1>
              <p className="sub">Your positions, results, claims and refunds, read from {network.label}.</p>
            </div>
          </div>
          <section className="panel connect-first">
            <h2>Connect a wallet to see your positions</h2>
            <p className="muted">TrueUp reads everything from the contract by wallet address. Nothing is stored about you anywhere else.</p>
            <button type="button" className="btn primary" disabled={isPending || !connectors[0]} onClick={() => connect({ connector: connectors[0] })}>
              {isPending ? "Check your wallet" : "Connect wallet"}
            </button>
          </section>
        </main>
      </>
    );
  }

  let body: React.ReactNode;
  if (positions.error instanceof NotConfiguredError) {
    body = <p className="empty">The TrueUp contract isn&rsquo;t deployed on {network.label} yet, so there are no positions to show.</p>;
  } else if (positions.error) {
    body = (
      <p className="empty">
        Couldn&rsquo;t reach BOT Chain to load your positions.{" "}
        <button type="button" className="text-action" onClick={() => positions.refetch()}>
          Retry
        </button>
      </p>
    );
  } else if (positions.isLoading || now === null) {
    body = (
      <div className="panel lead" aria-busy="true">
        <span className="skeleton" style={{ height: 14, width: 120 }} />
        <span className="skeleton" style={{ height: 36, width: 220, marginTop: 10 }} />
      </div>
    );
  } else {
    const rows = (positions.data ?? []).map((p) => classify(p, now));
    const needs = rows.filter((r) => r.kind);
    const open = rows.filter((r) => r.phase === "open" || r.phase === "awaiting" || r.phase === "refund-due").sort((a, b) => a.market.deadline - b.market.deadline);
    const history = rows.filter((r) => r.outcome).sort((a, b) => b.market.deadline - a.market.deadline);
    const claimable = needs.reduce((s, r) => s + r.claimable, 0n);
    const atStake = open.reduce((s, r) => s + r.amount, 0n);
    const wonPaid = rows.filter((r) => r.outcome === "won" && r.claimed).reduce((s, r) => s + (r.paid ?? 0n), 0n);
    const refunded = rows.filter((r) => r.outcome === "refunded" && r.claimed).reduce((s, r) => s + (r.paid ?? 0n), 0n);
    const won = rows.filter((r) => r.outcome === "won").length;
    const lost = rows.filter((r) => r.outcome === "lost").length;
    const refundedCount = rows.filter((r) => r.outcome === "refunded").length;

    body =
      rows.length === 0 ? (
        <section className="panel connect-first">
          <h2>No positions yet</h2>
          <p className="muted">This wallet hasn&rsquo;t joined a market on {network.label}. Pick a side on an open one, or ask your group something.</p>
          <p className="created__actions">
            <Link className="btn primary" href="/markets">
              Browse markets
            </Link>
            <Link className="text-action" href="/create">
              Create a market
            </Link>
          </p>
        </section>
      ) : (
        <div className="pgrid">
          <section className="panel lead span6" aria-labelledby="claimable">
            <div className="lead__main">
              <h2 id="claimable" className="lead__label">
                Claimable now
              </h2>
              <p className="lead__figure nums">
                {formatBot(claimable, 6)} <small>BOT</small>
              </p>
              <p className="muted">{needs.length === 0 ? "Nothing waiting. Results and refunds land here." : `From ${needs.length} ${needs.length === 1 ? "market" : "markets"}. Each one is its own claim.`}</p>
            </div>
            <dl className="lead__strip">
              <div>
                <dt>At stake in open markets</dt>
                <dd className="nums">{formatBot(atStake, 4)} BOT</dd>
              </div>
              <div>
                <dt>Winnings claimed</dt>
                <dd className="nums">{formatBot(wonPaid, 4)} BOT</dd>
              </div>
              <div>
                <dt>Refunds received</dt>
                <dd className="nums">{formatBot(refunded, 4)} BOT</dd>
              </div>
              <div>
                <dt title="Past results don't predict future ones">Record</dt>
                <dd className="nums">
                  {won} won · {lost} lost · {refundedCount} refunded
                </dd>
              </div>
            </dl>
          </section>

          <section className="panel span3" aria-labelledby="needs">
            <header>
              <h2 id="needs">Needs action</h2>
              <span className="meta nums">{needs.length}</span>
            </header>
            {needs.length === 0 ? (
              <p className="empty">Nothing to claim or refund right now.</p>
            ) : (
              <ul className="claims">
                {needs.map((r) => (
                  <ClaimRow key={r.market.id} r={r} viewer={viewer} />
                ))}
              </ul>
            )}
            {isFixture && <p className="faint" style={{ marginTop: 10 }}>Viewing the fixture wallet; claims are switched off.</p>}
            {!isFixture && !wallet.connected && needs.length > 0 && <p className="faint" style={{ marginTop: 10 }}>Connect this wallet to claim.</p>}
          </section>

          <section className="panel span3" aria-labelledby="open">
            <header>
              <h2 id="open">Open positions</h2>
              <span className="meta nums">{open.length}</span>
            </header>
            {open.length === 0 ? (
              <p className="empty">You&rsquo;re not in any open market.</p>
            ) : (
              <ul className="opens">
                {open.map((r) => (
                  <li key={r.market.id}>
                    <div className="opens__top">
                      <Link href={`/markets/${r.market.id}`}>{r.market.question}</Link>
                      <span className="nums">{formatBot(r.amount, 4, { trim: true })} BOT</span>
                    </div>
                    <Rope countA={r.market.countA} countB={r.market.countB} className="rope--thin" />
                    <p className="opens__meta nums">
                      <span className={`side-dot side-dot--${r.side}`} aria-hidden="true" />
                      You&rsquo;re on &ldquo;{sideName(r.market, r.side)}&rdquo; ·{" "}
                      {r.phase === "open" ? `closes in ${formatSpan(r.market.deadline - now)}` : r.phase === "awaiting" ? "waiting on the creator" : "refunds can open"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel span6" aria-labelledby="history">
            <header>
              <h2 id="history">History</h2>
              <span className="meta">Settled and refunded markets</span>
            </header>
            {history.length === 0 ? (
              <p className="empty">No settled or refunded markets yet.</p>
            ) : (
              <table className="mtable htable">
                <thead>
                  <tr>
                    <th>Market</th>
                    <th>Your side</th>
                    <th>Result</th>
                    <th className="n">Staked</th>
                    <th className="n">Paid to you</th>
                    <th className="n">Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((r) => (
                    <tr key={r.market.id}>
                      <td className="mtable__q">
                        <Link href={`/markets/${r.market.id}`}>{r.market.question}</Link>
                      </td>
                      <td>{sideName(r.market, r.side)}</td>
                      <td>
                        <span className={`pill ${r.outcome === "won" ? "pos" : r.outcome === "lost" ? "neg" : ""}`}>
                          {r.outcome === "won" ? "Won" : r.outcome === "lost" ? "Lost" : r.claimed ? "Refunded" : "Refund due"}
                        </span>
                      </td>
                      <td className="n nums">{formatBot(r.amount, 4)}</td>
                      <td className="n nums">
                        {r.paid !== null ? (
                          r.paidTx ? (
                            <a className="tx__hash" href={explorerTx(r.paidTx)} target="_blank" rel="noreferrer">
                              {formatBot(r.paid, 6)}
                            </a>
                          ) : (
                            formatBot(r.paid, 6)
                          )
                        ) : r.outcome === "lost" ? (
                          "0.000000"
                        ) : (
                          <span className="faint">unclaimed</span>
                        )}
                      </td>
                      <td className="n nums">{formatIsoDate(r.market.deadline)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      );
  }

  return (
    <>
      {top}
      <main className="canvas">
        <div className="title-row">
          <div>
            <h1>Portfolio</h1>
            <p className="sub nums">
              <a className="text-action" href={explorerAddress(viewer)} target="_blank" rel="noreferrer">
                {shortAddress(viewer)}
              </a>{" "}
              on {network.label}
            </p>
          </div>
        </div>
        {body}
      </main>
    </>
  );
}
