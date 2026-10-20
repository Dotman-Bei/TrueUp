"use client";

import Link from "next/link";
import { useState } from "react";
import { Rope } from "../Rope";

type Ending = {
  key: string;
  tab: string;
  title: string;
  body: string;
  pill: { tone: "positive" | "neutral"; text: string };
  countA: number;
  countB: number;
  rows: [string, string][];
  action: string;
};

const endings: Ending[] = [
  {
    key: "settled",
    tab: "Settled",
    title: "The creator calls it",
    body: "After the deadline, only the person who created the market can pick the winning side, and only once. The contract can't check the real world, so join pools made by people you trust.",
    pill: { tone: "positive", text: "Resolved" },
    countA: 4,
    countB: 3,
    rows: [
      ["Result", "She finishes"],
      ["Confirmed by", "the creator, Sat 18:42 UTC"],
      ["Fee taken", "0.0014 BOT"],
      ["Each winner", "0.349650 BOT"],
    ],
    action: "Claim 0.349650 BOT",
  },
  {
    key: "refunded",
    tab: "Refunded",
    title: "Nobody calls it",
    body: "If the creator hasn't settled 72 hours after the deadline, anyone can open refunds. Each person takes back exactly what they staked, and no fee is charged.",
    pill: { tone: "neutral", text: "Refundable" },
    countA: 4,
    countB: 3,
    rows: [
      ["Deadline", "Sat 18:00 UTC"],
      ["Refunds opened", "Tue 18:05 UTC, by a participant"],
      ["Fee taken", "0 BOT"],
      ["Your refund", "0.2 BOT"],
    ],
    action: "Claim refund 0.2 BOT",
  },
  {
    key: "one-sided",
    tab: "One-sided",
    title: "Nobody took the other side",
    body: "If everyone picked the same side, there is nobody to win from. The pool becomes refundable at the deadline, without a fee, and the contract enforces it.",
    pill: { tone: "neutral", text: "Refundable" },
    countA: 7,
    countB: 0,
    rows: [
      ["She finishes", "7 people"],
      ["She does not finish", "nobody"],
      ["Fee taken", "0 BOT"],
      ["Your refund", "0.2 BOT"],
    ],
    action: "Claim refund 0.2 BOT",
  },
];

export function Endings() {
  const [active, setActive] = useState(0);
  const e = endings[active];

  return (
    <section className="endings" aria-labelledby="endings-title">
      <div className="endings__plate" data-reveal>
        <div className="fragment" data-ui aria-label={`The market screen when a pool is ${e.tab.toLowerCase()}`}>
          <div className="fragment__head">
            <p className="fragment__q">Will Maya finish the 5K on Saturday?</p>
            <span className={`pill pill--${e.pill.tone}`}>{e.pill.text}</span>
          </div>
          <div className="fragment__sides nums">
            <span>She finishes · {e.countA}</span>
            <span>She does not finish · {e.countB}</span>
          </div>
          <Rope countA={e.countA} countB={e.countB} />
          <dl className="fragment__rows nums">
            {e.rows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <span className="fragment__button">{e.action}</span>
        </div>
      </div>

      <div className="endings__text">
        <h2 id="endings-title" className="endings__heading" data-reveal>
          How a pool ends
        </h2>
        <div className="endings__tabs" role="tablist" aria-label="Endings">
          {endings.map((x, i) => (
            <button
              key={x.key}
              role="tab"
              id={`ending-tab-${x.key}`}
              aria-selected={i === active}
              aria-controls="ending-panel"
              className="endings__tab"
              onClick={() => setActive(i)}
            >
              {x.tab}
            </button>
          ))}
        </div>
        <div id="ending-panel" role="tabpanel" aria-labelledby={`ending-tab-${e.key}`} className="endings__panel" key={e.key}>
          <h3 className="endings__title">{e.title}</h3>
          <p className="endings__body">{e.body}</p>
        </div>
        <div className="endings__cells">
          <Link className="cell cell--ink" href="/create">
            Create a market
          </Link>
          <a className="cell cell--step" href="#questions">
            Read the questions
          </a>
        </div>
      </div>
    </section>
  );
}
