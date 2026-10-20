"use client";

import { useState } from "react";
import { NotConfiguredError, useLeaders, type LeaderMetric, type LeaderRow } from "@/lib/data";
import { explorerAddress, network } from "@/lib/config";
import { formatBot, shortAddress } from "@/lib/money";
import { useViewer } from "@/lib/viewer";
import { TopBar } from "./Shell";

const METRICS: { key: LeaderMetric; tab: string; column: string; definition: string }[] = [
  { key: "correct", tab: "Correct calls", column: "Correct", definition: "Positions on the winning side of settled markets. The figure beside it is how many settled markets the wallet was in." },
  { key: "settled", tab: "Markets settled", column: "Settled", definition: "Markets this wallet created and then settled. A market that went to refunds doesn't count." },
  { key: "joined", tab: "Markets joined", column: "Joined", definition: "Every position taken, in any state. One per market, since a wallet can only join a market once." },
  { key: "net", tab: "Net result", column: "Net BOT", definition: "Winnings claimed minus stakes, in settled markets only. Unclaimed winnings and refunds aren't counted." },
];

const UNIT: Record<LeaderMetric, string> = { correct: "correct calls", settled: "markets settled", joined: "markets joined", net: "BOT net" };

function value(metric: LeaderMetric, r: LeaderRow) {
  if (metric === "net") return `${formatBot(r.value as bigint, 4, { sign: true })}`;
  return String(r.value);
}

export function Leaders() {
  const [metric, setMetric] = useState<LeaderMetric>("correct");
  const leaders = useLeaders(metric);
  const { address: viewer } = useViewer();
  const m = METRICS.find((x) => x.key === metric)!;
  const rows = leaders.data ?? [];
  const mine = viewer ? rows.findIndex((r) => r.account.toLowerCase() === viewer.toLowerCase()) : -1;

  let body: React.ReactNode;
  if (leaders.error instanceof NotConfiguredError) {
    body = <p className="empty">The TrueUp contract isn&rsquo;t deployed on {network.label} yet. Rankings start with the first settled market.</p>;
  } else if (leaders.error) {
    body = (
      <p className="empty">
        Couldn&rsquo;t reach BOT Chain to build the rankings.{" "}
        <button type="button" className="text-action" onClick={() => leaders.refetch()}>
          Retry
        </button>
      </p>
    );
  } else if (leaders.isLoading) {
    body = (
      <div aria-busy="true" style={{ display: "grid", gap: 18, paddingTop: 12 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="skeleton" style={{ height: 20 }} />
        ))}
      </div>
    );
  } else if (rows.length === 0) {
    body = <p className="empty">Nobody qualifies yet. This ranking fills in as markets are settled.</p>;
  } else {
    body = (
      <table className="ltable">
        <thead>
          <tr>
            <th className="ltable__rank">Rank</th>
            <th>Wallet</th>
            <th className="n">{m.column}</th>
            {(metric === "correct" || metric === "net") && <th className="n">Across</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.account} aria-current={i === mine ? "true" : undefined}>
              <td className="ltable__rank nums">{i + 1}.</td>
              <td className="nums">
                <a href={explorerAddress(r.account)} target="_blank" rel="noreferrer">
                  {shortAddress(r.account)}
                </a>
                {i === mine && <span className="you">you</span>}
              </td>
              <td className="n nums ltable__value">{value(metric, r)}</td>
              {(metric === "correct" || metric === "net") && <td className="n nums muted">{r.detail}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <>
      <TopBar title="Leaders" />
      <main className="canvas">
        <div className="title-row">
          <div>
            <h1>Leaders</h1>
            <p className="sub">From markets on this contract only. Refunded and open markets never count as wins or losses.</p>
          </div>
        </div>
        <div className="tabs" role="tablist" aria-label="Ranking">
          {METRICS.map((x) => (
            <button key={x.key} type="button" role="tab" aria-selected={metric === x.key} onClick={() => setMetric(x.key)}>
              {x.tab}
            </button>
          ))}
        </div>
        <div className="lgrid">
          <section className="panel" aria-labelledby="ranking">
            <header>
              <h2 id="ranking">{m.tab}</h2>
              <span className="meta nums">{rows.length > 0 ? `Top ${rows.length}` : ""}</span>
            </header>
            {viewer && !leaders.isLoading && !leaders.error && (
              <p className="lyou nums">
                {mine >= 0 ? (
                  <>
                    Your wallet ranks <strong>{mine + 1}</strong> of {rows.length}: {value(metric, rows[mine])} {UNIT[metric]}
                  </>
                ) : (
                  "Your wallet isn't on this ranking yet."
                )}
              </p>
            )}
            {body}
          </section>
          <aside className="panel" aria-labelledby="how">
            <h2 id="how">How each ranking is counted</h2>
            <dl className="ldefs">
              {METRICS.map((x) => (
                <div key={x.key}>
                  <dt>{x.tab}</dt>
                  <dd className="muted">{x.definition}</dd>
                </div>
              ))}
            </dl>
            <p className="faint" style={{ marginTop: 14 }}>
              Wallets and results are public on {network.label}. A good record doesn&rsquo;t predict the next result.
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}
