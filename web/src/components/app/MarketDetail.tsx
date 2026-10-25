"use client";

import Link from "next/link";
import { useState } from "react";
import type { Address } from "viem";
import {
  keys,
  NotConfiguredError,
  payoutFor,
  phaseLabel,
  phaseOf,
  phaseTone,
  sideName,
  useMarket,
  useParticipants,
  usePosition,
  winningSide,
  type Market,
  type Participant,
  type Phase,
  type Side,
  type WalletPosition,
} from "@/lib/data";
import { explorerAddress, explorerTx, network } from "@/lib/config";
import { feePercent, formatBot, shortAddress } from "@/lib/money";
import { formatSpan, formatUtc, relative } from "@/lib/time";
import { useTx } from "@/lib/tx";
import { useNow } from "@/lib/useNow";
import { useViewer } from "@/lib/viewer";
import { useWallet } from "@/lib/wallet";
import { Rope } from "../Rope";
import { TopBar } from "./Shell";
import { TxStatus } from "./TxStatus";

const toneClass = { neutral: "", warning: "warn", positive: "pos", negative: "neg" } as const;

function CopyLink({ id }: { id: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="mslip__copy"
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.location.origin}/markets/${id}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? "Link copied" : "Copy link"}
    </button>
  );
}

function Slip({ m, phase, now, picked, onPick, canPick }: { m: Market; phase: Phase; now: number; picked: Side | null; onPick: (s: Side) => void; canPick: boolean }) {
  const won = winningSide(m);
  const pool = m.stake * BigInt(m.countA + m.countB);
  const closes = phase === "open" ? `closes ${formatUtc(m.deadline)} (${relative(m.deadline, now)})` : `closed ${formatUtc(m.deadline)}`;
  const stub = (side: Side) => {
    const count = side === 1 ? m.countA : m.countB;
    const cls = `stub-btn stub-btn--${side === 1 ? "a" : "b"}${won === side ? " stub-btn--won" : won && won !== side ? " stub-btn--lost" : ""}`;
    const body = (
      <>
        <span className="stub-btn__name">{sideName(m, side)}</span>
        <span className="stub-btn__count nums">
          <span>
            {count} {count === 1 ? "person" : "people"}
          </span>{" "}
          · <span>{formatBot(m.stake * BigInt(count), 2)} BOT</span>
        </span>
      </>
    );
    return canPick ? (
      <button type="button" className={cls} aria-pressed={picked === side} onClick={() => onPick(side)}>
        {body}
      </button>
    ) : (
      <div className={cls}>{body}</div>
    );
  };
  return (
    <section className="mslip" aria-labelledby="market-q">
      <div className="mslip__top">
        <div>
          <h1 id="market-q">{m.question}</h1>
          <p className="mslip__meta nums">
            Created by{" "}
            <a href={explorerAddress(m.creator)} target="_blank" rel="noreferrer">
              {shortAddress(m.creator)}
            </a>{" "}
            · {closes}
          </p>
        </div>
        <div className="mslip__tools">
          <span className={`pill ${toneClass[phaseTone[phase]]}`}>{phaseLabel[phase]}</span>
          <CopyLink id={m.id} />
        </div>
      </div>
      <div className="stubs">
        {stub(1)}
        {stub(2)}
      </div>
      <Rope countA={m.countA} countB={m.countB} label={`${m.countA} on ${m.optionA}, ${m.countB} on ${m.optionB}`} />
      <p className="mslip__pool nums">
        <span>
          <strong>{formatBot(pool, 2)} BOT</strong> in the pool · {m.stake === 0n ? "" : `${formatBot(m.stake, 4, { trim: true })} BOT each`}
        </span>
        <span>
          Fee {feePercent(m.feeBps)}, fixed when created · {m.countA + m.countB} {m.countA + m.countB === 1 ? "person" : "people"}
        </span>
      </p>
    </section>
  );
}

function ActionPanel({ m, phase, now, picked, setPicked, viewer, position }: { m: Market; phase: Phase; now: number; picked: Side | null; setPicked: (s: Side | null) => void; viewer?: Address; position: WalletPosition | null | undefined }) {
  const wallet = useWallet();
  const tx = useTx();
  const [settleSide, setSettleSide] = useState<Side | null>(null);
  const [confirming, setConfirming] = useState(false);
  const isCreator = viewer?.toLowerCase() === m.creator.toLowerCase();
  const refundsAt = m.deadline + m.settlementTimeout;
  const pool = m.stake * BigInt(m.countA + m.countB);
  const invalidate = [keys.market(m.id), keys.participants(m.id), keys.position(m.id, viewer), keys.positions(viewer), keys.markets, keys.stats];
  const stakeLabel = formatBot(m.stake, 6, { trim: true });

  // Open: pick a side, read the terms, stake
  if (phase === "open") {
    if (position) {
      return (
        <section className="panel action" aria-labelledby="act">
          <h2 id="act">Your position</h2>
          <p>
            You&rsquo;re on &ldquo;{sideName(m, position.side)}&rdquo; with {stakeLabel} BOT.
          </p>
          <p className="muted">Entries close {relative(m.deadline, now)}. The creator calls the result after that.</p>
          {position.joinTx && (
            <p>
              <a className="text-action" href={explorerTx(position.joinTx)} target="_blank" rel="noreferrer">
                View your stake on the explorer
              </a>
            </p>
          )}
          <TxStatus state={tx.state} done="Staked. You're in." />
        </section>
      );
    }
    const short = wallet.balance !== undefined && wallet.balance < m.stake;
    return (
      <section className="panel action" aria-labelledby="act">
        <h2 id="act">Pick a side</h2>
        {!picked ? (
          <p className="muted">Tap a side on the slip. Everyone stakes exactly {stakeLabel} BOT, and you can&rsquo;t switch later.</p>
        ) : (
          <>
            <p>
              You stake exactly <strong className="nums">{stakeLabel} BOT</strong> on &ldquo;{sideName(m, picked)}&rdquo;.
            </p>
            <ul className="terms">
              <li className="nums">The pool becomes {formatBot(pool + m.stake, 2)} BOT.</li>
              <li>If your side wins, you share the pot minus the {feePercent(m.feeBps)} fee with the others on your side.</li>
              <li>If it loses, your stake goes to the winners.</li>
              {!network.isTestnet && <li>This is real BOT on a contract that hasn&rsquo;t been independently audited. Only stake what you can afford to lose.</li>}
              <li>
                {isCreator ? "You" : shortAddress(m.creator)} decide{isCreator ? "" : "s"} the result after {formatUtc(m.deadline)}. If that doesn&rsquo;t happen within 72 hours, anyone can open refunds.
              </li>
            </ul>
            {!wallet.connected ? (
              <p className="muted">Connect a wallet (top right) to stake.</p>
            ) : short ? (
              <p className="tx tx--failed nums">Not enough BOT: you have {formatBot(wallet.balance!, 4)} BOT, and need {stakeLabel} plus gas.</p>
            ) : null}
            <button
              type="button"
              className="btn primary block"
              disabled={!wallet.connected || short || tx.busy}
              onClick={() => tx.send({ functionName: "join", args: [BigInt(m.id), picked], value: m.stake }, invalidate)}
            >
              {tx.busy ? "Waiting…" : `Stake ${stakeLabel} BOT`}
            </button>
            <p style={{ marginTop: 10 }}>
              <button type="button" className="text-action" onClick={() => setPicked(null)}>
                Choose again
              </button>
            </p>
          </>
        )}
        <TxStatus state={tx.state} done="Staked. You're in." />
      </section>
    );
  }

  // Deadline passed, creator decides
  if (phase === "awaiting") {
    return (
      <section className="panel action" aria-labelledby="act">
        <h2 id="act">{isCreator ? "Confirm the result" : "Waiting on the creator"}</h2>
        {isCreator ? (
          <>
            <p className="muted">Entries are closed. Pick what actually happened. This is final and can&rsquo;t be changed.</p>
            <div className="choice" role="group" aria-label="Winning side">
              {([1, 2] as const).map((s) => (
                <button key={s} type="button" aria-pressed={settleSide === s} onClick={() => { setSettleSide(s); setConfirming(false); }}>
                  {sideName(m, s)}
                </button>
              ))}
            </div>
            {settleSide && !confirming && (
              <button type="button" className="btn primary block" onClick={() => setConfirming(true)}>
                Settle as &ldquo;{sideName(m, settleSide)}&rdquo;
              </button>
            )}
            {settleSide && confirming && (
              <>
                <p className="notice">
                  {settleSide === 1 ? m.countA : m.countB} people win {formatBot(payoutFor(m, settleSide), 6)} BOT each. {settleSide === 1 ? m.countB : m.countA} lose their stake. You can&rsquo;t undo this.
                </p>
                <button
                  type="button"
                  className="btn primary block"
                  style={{ marginTop: 12 }}
                  disabled={tx.busy}
                  onClick={() => tx.send({ functionName: "settle", args: [BigInt(m.id), settleSide] }, invalidate)}
                >
                  {tx.busy ? "Waiting…" : "Confirm, this is final"}
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <p>
              Waiting on{" "}
              <a className="text-action nums" href={explorerAddress(m.creator)} target="_blank" rel="noreferrer">
                {shortAddress(m.creator)}
              </a>{" "}
              to confirm the result.
            </p>
            <p className="muted nums">
              If they don&rsquo;t, refunds open to anyone at {formatUtc(refundsAt)} ({relative(refundsAt, now)}).
            </p>
          </>
        )}
        <TxStatus state={tx.state} done="Settled. Winners can claim now." />
      </section>
    );
  }

  // Timeout passed, nobody settled: anyone opens refunds
  if (phase === "refund-due") {
    return (
      <section className="panel action" aria-labelledby="act">
        <h2 id="act">Open refunds</h2>
        <p>
          The creator didn&rsquo;t settle within 72 hours of the deadline ({formatSpan(now - refundsAt)} overdue). Anyone can now switch this market to refunds. Every participant then takes back exactly {stakeLabel} BOT, with no fee.
        </p>
        <button
          type="button"
          className="btn primary block"
          style={{ marginTop: 14 }}
          disabled={!wallet.connected || tx.busy}
          onClick={() => tx.send({ functionName: "openRefunds", args: [BigInt(m.id)] }, invalidate)}
        >
          {tx.busy ? "Waiting…" : "Open refunds"}
        </button>
        {!wallet.connected && <p className="muted" style={{ marginTop: 10 }}>Connect a wallet to send this.</p>}
        <TxStatus state={tx.state} done="Refunds are open." />
      </section>
    );
  }

  // Refund paths: one-sided pools after the deadline, or refunds opened
  if (phase === "one-sided" || phase === "refundable") {
    const why = phase === "one-sided" ? "Nobody took the other side, so there's no one to win from." : "Refunds are open because the result was never confirmed.";
    return (
      <section className="panel action" aria-labelledby="act">
        <h2 id="act">Refunds</h2>
        <p className="muted">{why} Everyone gets their stake back, and no fee is charged.</p>
        {position ? (
          position.claimed ? (
            <>
              <p className="action__figure nums">
                {formatBot(position.paid ?? m.stake, 6, { trim: true })}
                <small>BOT refunded</small>
              </p>
              {position.paidTx && (
                <a className="text-action" href={explorerTx(position.paidTx)} target="_blank" rel="noreferrer">
                  View your refund
                </a>
              )}
            </>
          ) : (
            <>
              <p className="action__figure nums">
                {stakeLabel}
                <small>BOT to refund</small>
              </p>
              <button type="button" className="btn primary block" disabled={tx.busy || !wallet.connected} onClick={() => tx.send({ functionName: "claimRefund", args: [BigInt(m.id)] }, invalidate)}>
                {tx.busy ? "Waiting…" : `Claim refund ${stakeLabel} BOT`}
              </button>
            </>
          )
        ) : (
          <p style={{ marginTop: 8 }}>{viewer ? "This wallet isn't in this market." : "Connect a wallet to see your refund."}</p>
        )}
        {!wallet.connected && position && !position.claimed && <p className="muted" style={{ marginTop: 10 }}>Connect this wallet to claim the refund.</p>}
        <TxStatus state={tx.state} done="Refunded." />
      </section>
    );
  }

  // Resolved
  const won = winningSide(m)!;
  const each = payoutFor(m, won);
  return (
    <section className="panel action" aria-labelledby="act">
      <h2 id="act">&ldquo;{sideName(m, won)}&rdquo; won</h2>
      <p className="muted nums">
        Confirmed by the creator. {won === 1 ? m.countA : m.countB} winners share {formatBot(pool - (pool * BigInt(m.feeBps)) / 10_000n, 4)} BOT after the {feePercent(m.feeBps)} fee.
      </p>
      {position ? (
        position.side !== won ? (
          <p style={{ marginTop: 12 }}>Your side lost. Your {stakeLabel} BOT went to the winners, so there&rsquo;s nothing to claim.</p>
        ) : position.claimed ? (
          <>
            <p className="action__figure nums">
              {formatBot(position.paid ?? each, 6)}
              <small>BOT claimed</small>
            </p>
            {position.paidTx && (
              <a className="text-action" href={explorerTx(position.paidTx)} target="_blank" rel="noreferrer">
                View your claim
              </a>
            )}
          </>
        ) : (
          <>
            <p className="action__figure nums">
              {formatBot(each, 6)}
              <small>BOT to claim</small>
            </p>
            <button type="button" className="btn primary block" disabled={tx.busy || !wallet.connected} onClick={() => tx.send({ functionName: "claimWinnings", args: [BigInt(m.id)] }, invalidate)}>
              {tx.busy ? "Waiting…" : `Claim ${formatBot(each, 6)} BOT`}
            </button>
          </>
        )
      ) : (
        <p style={{ marginTop: 12 }} className="nums">
          Each winner receives {formatBot(each, 6)} BOT.
        </p>
      )}
      {!wallet.connected && position && position.side === won && !position.claimed && <p className="muted" style={{ marginTop: 10 }}>Connect this wallet to claim.</p>}
      <TxStatus state={tx.state} done="Claimed. The BOT is in your wallet." />
    </section>
  );
}

function Terms({ m }: { m: Market }) {
  return (
    <section className="panel" aria-labelledby="terms">
      <header>
        <h2 id="terms">Terms</h2>
        <span className="meta">Fixed when created</span>
      </header>
      <dl className="kv">
        <div>
          <dt>Stake per person</dt>
          <dd>{formatBot(m.stake, 6, { trim: true })} BOT</dd>
        </div>
        <div>
          <dt>Deadline</dt>
          <dd>{formatUtc(m.deadline)}</dd>
        </div>
        <div>
          <dt>Settlement window</dt>
          <dd>{Math.round(m.settlementTimeout / 3600)} h after the deadline</dd>
        </div>
        <div>
          <dt>Protocol fee</dt>
          <dd>
            {feePercent(m.feeBps)} of settled pots ({m.feeBps} bps)
          </dd>
        </div>
        <div>
          <dt>Resolver</dt>
          <dd>The creator</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatUtc(m.createdAt)}</dd>
        </div>
        <div>
          <dt>Market</dt>
          <dd>
            #{m.id} on {network.label}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function People({ m, viewer }: { m: Market; viewer?: Address }) {
  const people = useParticipants(m.id);
  const [all, setAll] = useState(false);
  const rows = (people.data ?? []).slice().sort((a, b) => (b.time ?? 0) - (a.time ?? 0));
  const shown = all ? rows : rows.slice(0, 6);
  const total = m.countA + m.countB;
  return (
    <section className="panel" aria-labelledby="people">
      <header>
        <h2 id="people">Who&rsquo;s in</h2>
        <span className="meta nums">
          {m.countA} on &ldquo;{m.optionA}&rdquo; · {m.countB} on &ldquo;{m.optionB}&rdquo;
        </span>
      </header>
      {people.isLoading ? (
        <div style={{ display: "grid", gap: 14, paddingBlock: 8 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} className="skeleton" style={{ height: 20 }} />
          ))}
        </div>
      ) : people.error ? (
        <p className="empty">
          Couldn&rsquo;t load the participants.{" "}
          <button type="button" className="text-action" onClick={() => people.refetch()}>
            Retry
          </button>
        </p>
      ) : total === 0 || rows.length === 0 ? (
        <p className="empty">Nobody has joined yet. Share the link to bring people in.</p>
      ) : (
        <>
          <table className="people">
            <thead>
              <tr>
                <th>Wallet</th>
                <th>Side</th>
                <th className="n">Staked</th>
                <th className="n">Joined</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p: Participant) => (
                <tr key={p.txHash}>
                  <td className="nums">
                    <a href={explorerAddress(p.account)} target="_blank" rel="noreferrer">
                      {shortAddress(p.account)}
                    </a>
                    {viewer && p.account.toLowerCase() === viewer.toLowerCase() && <span className="you">you</span>}
                  </td>
                  <td>
                    <span className={`side-dot side-dot--${p.side}`} aria-hidden="true" />
                    {sideName(m, p.side)}
                  </td>
                  <td className="n nums">{formatBot(p.amount, 4, { trim: true })} BOT</td>
                  <td className="n nums">
                    <a href={explorerTx(p.txHash)} target="_blank" rel="noreferrer">
                      {p.time ? formatUtc(p.time).replace(" UTC", "") : "View"}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 6 && (
            <p style={{ marginTop: 12 }}>
              <button type="button" className="text-action" onClick={() => setAll((a) => !a)}>
                {all ? "Show fewer" : `Show all ${rows.length}`}
              </button>
            </p>
          )}
        </>
      )}
    </section>
  );
}

function Trust({ m }: { m: Market }) {
  return (
    <section className="panel" aria-labelledby="trust">
      <h2 id="trust">Who decides</h2>
      <p className="muted" style={{ marginTop: 6 }}>
        The creator, {shortAddress(m.creator)}, reports the result. BOT Chain records it and pays out by the rules, but it can&rsquo;t check what really happened. Only stake if you trust them. If they never report, everyone can take their stake back 72 hours after the deadline.
      </p>
    </section>
  );
}

export function MarketDetail({ id }: { id: number }) {
  const market = useMarket(id);
  const now = useNow();
  const { address: viewer } = useViewer();
  const position = usePosition(id, viewer);
  const [picked, setPicked] = useState<Side | null>(null);
  const valid = Number.isSafeInteger(id) && id > 0;

  const top = (
    <TopBar title="Market">
      <Link className="topbar__back" href="/markets">
        ← Markets
      </Link>
      {market.data && <span className="topbar__object">{market.data.question}</span>}
    </TopBar>
  );

  let body: React.ReactNode;
  if (!valid || (market.isSuccess && market.data === null)) {
    body = (
      <div className="panel" style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: 24, lineHeight: "30px", fontWeight: 600 }}>No market here</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          There&rsquo;s no market {valid ? `#${id}` : `“${String(id)}”`} on this contract. Check the link, or browse the open markets.
        </p>
        <p style={{ marginTop: 16 }}>
          <Link className="btn primary" href="/markets">
            Browse markets
          </Link>
        </p>
      </div>
    );
  } else if (market.error) {
    body = (
      <div className="panel" style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: 24, lineHeight: "30px", fontWeight: 600 }}>Market #{id}</h1>
        {market.error instanceof NotConfiguredError ? (
          <p className="muted" style={{ marginTop: 8 }}>
            The TrueUp contract isn&rsquo;t deployed on {network.label} yet, so this link can&rsquo;t open a market. Once it is live, the question, both sides and the pool will show here.
          </p>
        ) : (
          <p className="muted" style={{ marginTop: 8 }}>
            Couldn&rsquo;t reach BOT Chain to load this market. Nothing has changed on-chain.{" "}
            <button type="button" className="text-action" onClick={() => market.refetch()}>
              Retry
            </button>
          </p>
        )}
      </div>
    );
  } else if (!market.data || now === null) {
    body = (
      <div className="grid6" aria-busy="true">
        <div className="span4 mslip" style={{ minHeight: 300 }}>
          <span className="skeleton" style={{ height: 32, width: "70%", background: "var(--paper-2)" }} />
        </div>
        <div className="span2 panel" style={{ minHeight: 300 }} />
      </div>
    );
  } else {
    const m = market.data;
    const phase = phaseOf(m, now);
    const canPick = phase === "open" && !position.data;
    body = (
      <div className="detail">
        <div className="stack">
          <Slip m={m} phase={phase} now={now} picked={picked} onPick={setPicked} canPick={canPick} />
          <div className="detail__action-phone">
            <ActionPanel m={m} phase={phase} now={now} picked={picked} setPicked={setPicked} viewer={viewer} position={position.data} />
          </div>
          <People m={m} viewer={viewer} />
        </div>
        <div className="stack">
          <div className="detail__action-wide">
            <ActionPanel m={m} phase={phase} now={now} picked={picked} setPicked={setPicked} viewer={viewer} position={position.data} />
          </div>
          <Trust m={m} />
          <Terms m={m} />
        </div>
      </div>
    );
  }

  return (
    <>
      {top}
      <main className="canvas">{body}</main>
    </>
  );
}
