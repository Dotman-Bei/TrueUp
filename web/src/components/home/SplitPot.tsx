"use client";

import { useState } from "react";
import { DEFAULT_FEE_BPS } from "@/lib/config";
import { computeSplit, feePercent, formatBot, parseBot } from "@/lib/money";
import { zigzagFoot } from "@/lib/shape";

const STAKES = ["0.05", "0.1", "0.2", "0.5", "1"];
const A = "She finishes";
const B = "She does not finish";

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="stepper">
      <span className="stepper__label">{label}</span>
      <div className="stepper__controls">
        <button type="button" aria-label={`One fewer on “${label}”`} disabled={value <= 0} onClick={() => onChange(value - 1)}>
          −
        </button>
        <output className="nums" aria-live="polite">
          {value}
        </output>
        <button type="button" aria-label={`One more on “${label}”`} disabled={value >= 50} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={strong ? "receipt__row receipt__row--strong" : "receipt__row"}>
      <dt>{k}</dt>
      <dd className="nums">{v}</dd>
    </div>
  );
}

export function SplitPot() {
  const [stakeText, setStakeText] = useState("0.2");
  const [countA, setA] = useState(4);
  const [countB, setB] = useState(3);
  const [winner, setWinner] = useState<1 | 2>(1);
  const stake = parseBot(stakeText)!;
  const s = computeSplit(stake, countA, countB, winner, DEFAULT_FEE_BPS);
  const stakeLabel = formatBot(stake, 4, { trim: true });

  const big = s.refundable ? stakeLabel : formatBot(s.each, 4);
  const caption = s.refundable
    ? countA + countB === 0
      ? "Nobody has joined yet. Add people on each side."
      : `BOT back to each of ${countA + countB} people. Nobody took the other side, so no fee.`
    : `BOT to each of ${s.winners} ${s.winners === 1 ? "winner" : "winners"}, from a ${formatBot(s.pot, 2)} BOT pot.`;

  return (
    <section className="split" aria-labelledby="split-title">
      <div className="split__left">
        <div data-reveal>
          <h2 id="split-title" className="split__heading">
            Split the pot
          </h2>
          <p className="split__note">Set the stake and how your group splits. The receipt uses the contract&rsquo;s own arithmetic, down to the wei.</p>
        </div>

        <div className="split__controls" data-reveal>
          <fieldset className="chips">
            <legend>Stake per person</legend>
            {STAKES.map((v) => (
              <label key={v} className="chip">
                <input type="radio" name="stake" value={v} checked={stakeText === v} onChange={() => setStakeText(v)} />
                <span className="nums">{v} BOT</span>
              </label>
            ))}
          </fieldset>
          <div className="split__steppers">
            <Stepper label={A} value={countA} onChange={setA} />
            <Stepper label={B} value={countB} onChange={setB} />
          </div>
        </div>

        <div className="split__total">
          <p className="split__figure nums" aria-live="polite">
            {big}
          </p>
          <p className="split__caption">{caption}</p>
        </div>
      </div>

      <div className="receipt" style={{ clipPath: zigzagFoot(28, 10) }} data-reveal>
        <dl>
          <dt className="receipt__group">Stakes</dt>
          <Row k={`${A} · ${countA} × ${stakeLabel}`} v={formatBot(stake * BigInt(countA), 4)} />
          <Row k={`${B} · ${countB} × ${stakeLabel}`} v={formatBot(stake * BigInt(countB), 4)} />
          <Row k="Pot" v={formatBot(s.pot, 4)} strong />

          <dt className="receipt__group">Settlement</dt>
          {s.refundable ? (
            <>
              <Row k="An empty side means no winner" v="Refundable" />
              <Row k="Protocol fee" v="0.0000" />
            </>
          ) : (
            <>
              <Row k={`Protocol fee ${feePercent(DEFAULT_FEE_BPS)}`} v={formatBot(-s.fee, 4)} />
              <Row k="Distributable" v={formatBot(s.distributable, 4)} strong />
            </>
          )}

          <dt className="receipt__group">Split</dt>
          {s.refundable ? (
            <>
              <Row k="People refunded" v={String(countA + countB)} />
              <Row k="Each gets back" v={formatBot(stake, 6)} />
            </>
          ) : (
            <>
              <div className="receipt__row receipt__row--choice">
                <dt>Winning side</dt>
                <dd>
                  <fieldset className="receipt__toggle">
                    <legend className="sr-only">Who won?</legend>
                    {([1, 2] as const).map((side) => (
                      <label key={side}>
                        <input type="radio" name="winner" checked={winner === side} onChange={() => setWinner(side)} />
                        <span>{side === 1 ? A : B}</span>
                      </label>
                    ))}
                  </fieldset>
                </dd>
              </div>
              <Row k="Winners" v={String(s.winners)} />
              <Row k="Each winner" v={formatBot(s.each, 6)} />
              <Row k="Net gain per winner" v={formatBot(s.each - stake, 6, { sign: true })} />
              {s.dust > 0n && <Row k="Rounding remainder" v={`${s.dust} wei`} />}
            </>
          )}
        </dl>
        <p className="receipt__total nums">
          {s.refundable
            ? countA + countB === 0
              ? "Nothing staked yet"
              : `Everyone gets their ${stakeLabel} BOT back`
            : `Each winner claims ${formatBot(s.each, 6)} BOT`}
        </p>
      </div>
    </section>
  );
}
