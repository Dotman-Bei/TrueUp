"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { decodeEventLog } from "viem";
import { trueUpAbi } from "@/lib/abi";
import { DEFAULT_FEE_BPS, LIMITS, network } from "@/lib/config";
import { keys } from "@/lib/data";
import { feePercent, formatBot, parseBot, shortAddress } from "@/lib/money";
import { formatSpan, formatUtc, nowSeconds } from "@/lib/time";
import { useTx } from "@/lib/tx";
import { useNow } from "@/lib/useNow";
import { useWallet } from "@/lib/wallet";
import { Rope } from "../Rope";
import { TopBar } from "./Shell";
import { TxStatus } from "./TxStatus";

const PRESETS = [
  { key: "1h", label: "1 hour", seconds: 60 * 60 },
  { key: "1d", label: "1 day", seconds: 24 * 60 * 60 },
  { key: "3d", label: "3 days", seconds: 3 * 24 * 60 * 60 },
  { key: "1w", label: "1 week", seconds: 7 * 24 * 60 * 60 },
] as const;
type DeadlineKey = (typeof PRESETS)[number]["key"] | "custom";

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function Counter({ value, max }: { value: string; max: number }) {
  const left = max - value.length;
  return <span className={`counter nums${left < 0 ? " counter--over" : ""}`}>{left < 0 ? `${-left} over` : `${value.length} / ${max}`}</span>;
}

export function CreateMarket() {
  const wallet = useWallet();
  const now = useNow(30_000);
  const tx = useTx();
  const [question, setQuestion] = useState("");
  const [optionA, setA] = useState("");
  const [optionB, setB] = useState("");
  const [stakeText, setStake] = useState("0.2");
  const [deadlineKey, setDeadlineKey] = useState<DeadlineKey>("1d");
  const [custom, setCustom] = useState("");
  const [touched, setTouched] = useState(false);
  const [created, setCreated] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuestion(q.slice(0, LIMITS.question));
  }, []);

  const stake = parseBot(stakeText);
  const deadline = useMemo(() => {
    if (now === null) return null;
    if (deadlineKey === "custom") {
      if (!custom) return null;
      const t = Math.floor(new Date(custom).getTime() / 1000);
      return Number.isFinite(t) ? t : null;
    }
    return now + PRESETS.find((p) => p.key === deadlineKey)!.seconds;
  }, [deadlineKey, custom, now]);

  const errors = useMemo(() => {
    const e: Partial<Record<"question" | "a" | "b" | "stake" | "deadline", string>> = {};
    if (!question.trim()) e.question = "Write the question people will bet on.";
    else if (question.length > LIMITS.question) e.question = `Keep it to ${LIMITS.question} characters.`;
    if (!optionA.trim()) e.a = "Name the first side.";
    else if (optionA.length > LIMITS.option) e.a = `Keep it to ${LIMITS.option} characters.`;
    if (!optionB.trim()) e.b = "Name the second side.";
    else if (optionB.length > LIMITS.option) e.b = `Keep it to ${LIMITS.option} characters.`;
    else if (optionA.trim() && norm(optionA) === norm(optionB)) e.b = "The two sides have to say different things.";
    const min = parseBot(LIMITS.minStake)!;
    const max = parseBot(LIMITS.maxStake)!;
    if (stake === null) e.stake = "Enter an amount like 0.2.";
    else if (stake < min) e.stake = `The smallest stake is ${LIMITS.minStake} BOT.`;
    else if (stake > max) e.stake = `The largest stake is ${LIMITS.maxStake} BOT.`;
    if (deadline === null) e.deadline = "Pick when entries close.";
    else if (now !== null && deadline - now < LIMITS.minDurationSeconds) e.deadline = "Entries have to stay open for at least an hour.";
    else if (now !== null && deadline - now > LIMITS.maxDurationSeconds) e.deadline = "Entries can stay open for 30 days at most.";
    return e;
  }, [question, optionA, optionB, stake, deadline, now]);
  const valid = Object.keys(errors).length === 0;
  const show = (k: keyof typeof errors, filled: boolean) => (touched || filled) && errors[k];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid || stake === null || deadline === null) return;
    // presets are measured from the moment of sending, so a form left open never sends a deadline in the past
    const sendDeadline = deadlineKey === "custom" ? deadline : nowSeconds() + PRESETS.find((p) => p.key === deadlineKey)!.seconds;
    const receipt = await tx.send(
      { functionName: "createMarket", args: [question.trim(), optionA.trim(), optionB.trim(), stake, BigInt(sendDeadline)] },
      [keys.markets, keys.stats],
    );
    if (!receipt) return;
    for (const log of receipt.logs) {
      try {
        const ev = decodeEventLog({ abi: trueUpAbi, data: log.data, topics: log.topics });
        if (ev.eventName === "MarketCreated") setCreated(Number((ev.args as { marketId: bigint }).marketId));
      } catch {
        /* not ours */
      }
    }
  }

  const minCustom = now === null ? undefined : toLocalInput(now + LIMITS.minDurationSeconds);
  const maxCustom = now === null ? undefined : toLocalInput(now + LIMITS.maxDurationSeconds);

  if (created !== null) {
    const url = typeof window === "undefined" ? `/markets/${created}` : `${window.location.origin}/markets/${created}`;
    return (
      <>
        <TopBar title="New market" />
        <main className="canvas">
          <section className="panel created" aria-labelledby="done">
            <h1 id="done">Market #{created} is live</h1>
            <p className="muted">Paste the link in your group chat. Nobody, including you, has staked yet.</p>
            <div className="linkbox">
              <input readOnly value={url} aria-label="Market link" onFocus={(e) => e.currentTarget.select()} />
              <button
                type="button"
                className="btn primary"
                onClick={async () => {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
              >
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
            <p className="created__actions">
              <Link className="btn" href={`/markets/${created}`}>
                Open market
              </Link>
              <Link className="text-action" href={`/markets/${created}`}>
                Pick your side
              </Link>
            </p>
            <TxStatus state={tx.state} done="Created on BOT Chain." />
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title="New market" />
      <main className="canvas">
        <div className="title-row">
          <div>
            <h1>New market</h1>
            <p className="sub">Creating doesn&rsquo;t stake for you. Join your own market afterwards if you want a side.</p>
          </div>
        </div>

        <form className="create" onSubmit={submit} noValidate>
          <div className="create__form panel">
            <div className="field">
              <div className="field__top">
                <label htmlFor="q">Question</label>
                <Counter value={question} max={LIMITS.question} />
              </div>
              <textarea id="q" rows={2} value={question} placeholder="Will Maya finish the 5K on Saturday?" onChange={(e) => setQuestion(e.target.value)} aria-invalid={Boolean(show("question", question !== ""))} aria-describedby="q-hint" />
              <p id="q-hint" className={show("question", question !== "") ? "field__error" : "field__hint"}>
                {show("question", question !== "") || "Public on BOT Chain. Leave out private details about anyone."}
              </p>
            </div>
            <div className="field__pair">
              <div className="field">
                <div className="field__top">
                  <label htmlFor="a">Side A</label>
                  <Counter value={optionA} max={LIMITS.option} />
                </div>
                <input id="a" value={optionA} placeholder="She finishes" onChange={(e) => setA(e.target.value)} aria-invalid={Boolean(show("a", optionA !== ""))} />
                {show("a", optionA !== "") && <p className="field__error">{errors.a}</p>}
              </div>
              <div className="field">
                <div className="field__top">
                  <label htmlFor="b">Side B</label>
                  <Counter value={optionB} max={LIMITS.option} />
                </div>
                <input id="b" value={optionB} placeholder="She does not finish" onChange={(e) => setB(e.target.value)} aria-invalid={Boolean(show("b", optionB !== ""))} />
                {show("b", optionB !== "") && <p className="field__error">{errors.b}</p>}
              </div>
            </div>
            <div className="field">
              <label htmlFor="stake">Stake per person</label>
              <div className="suffix">
                <input id="stake" inputMode="decimal" value={stakeText} onChange={(e) => setStake(e.target.value)} aria-invalid={Boolean(show("stake", true))} aria-describedby="stake-hint" />
                <span>BOT</span>
              </div>
              <p id="stake-hint" className={show("stake", true) ? "field__error" : "field__hint"}>
                {show("stake", true) || `Everyone who joins pays exactly this. ${LIMITS.minStake} to ${LIMITS.maxStake} BOT.`}
              </p>
            </div>
            <fieldset className="field">
              <legend>Entries close</legend>
              <div className="chips-row">
                {PRESETS.map((p) => (
                  <button key={p.key} type="button" className="chip-btn" aria-pressed={deadlineKey === p.key} onClick={() => setDeadlineKey(p.key)}>
                    {p.label}
                  </button>
                ))}
                <button type="button" className="chip-btn" aria-pressed={deadlineKey === "custom"} onClick={() => setDeadlineKey("custom")}>
                  Custom
                </button>
              </div>
              {deadlineKey === "custom" && (
                <input type="datetime-local" aria-label="Custom deadline, your local time" value={custom} min={minCustom} max={maxCustom} onChange={(e) => setCustom(e.target.value)} />
              )}
              <p className={show("deadline", deadlineKey === "custom" && custom !== "") ? "field__error" : "field__hint nums"}>
                {show("deadline", deadlineKey === "custom" && custom !== "") ||
                  (deadline && now !== null ? `${formatUtc(deadline)}, in ${formatSpan(deadline - now)}. Settle within 72 hours after that.` : "Your local time; shown here in UTC.")}
              </p>
            </fieldset>
          </div>

          <div className="create__side">
            <section className="mslip create__preview" aria-label="Preview of the market">
              <p className="create__q">{question.trim() || "Your question"}</p>
              <p className="mslip__meta nums">
                Created by {wallet.address ? shortAddress(wallet.address) : "you"} · {deadline ? `closes ${formatUtc(deadline)}` : "deadline not set"}
              </p>
              <div className="stubs">
                <div className="stub-btn stub-btn--a">
                  <span className="stub-btn__name">{optionA.trim() || "Side A"}</span>
                  <span className="stub-btn__count">0 people</span>
                </div>
                <div className="stub-btn stub-btn--b">
                  <span className="stub-btn__name">{optionB.trim() || "Side B"}</span>
                  <span className="stub-btn__count">0 people</span>
                </div>
              </div>
              <Rope countA={0} countB={0} label="Nobody has joined yet" />
              <p className="mslip__pool nums">
                <span>
                  <strong>0 BOT</strong> in the pool · {stake && !errors.stake ? `${formatBot(stake, 6, { trim: true })} BOT each` : "stake not set"}
                </span>
                <span>Fee {feePercent(DEFAULT_FEE_BPS)}</span>
              </p>
            </section>

            <section className="panel">
              <h2>Before you create it</h2>
              <ul className="create__terms">
                <li>You decide the result after the deadline, and participants have to trust you to report it honestly.</li>
                <li>If you don&rsquo;t settle within 72 hours of the deadline, anyone can refund everyone.</li>
                <li>A {feePercent(DEFAULT_FEE_BPS)} fee comes out of settled pots. Refunded markets pay nothing.</li>
                <li>Everything you type is public on {network.label}, permanently.</li>
              </ul>
              {!wallet.connected && <p className="muted" style={{ marginTop: 12 }}>Connect a wallet (top right) to create the market. You pay gas in BOT.</p>}
              <button type="submit" className="btn primary block" style={{ marginTop: 16 }} disabled={!wallet.connected || tx.busy || (touched && !valid)}>
                {tx.busy ? "Waiting…" : "Create market"}
              </button>
              <TxStatus state={tx.state} />
            </section>
          </div>
        </form>
      </main>
    </>
  );
}

function toLocalInput(seconds: number) {
  const d = new Date(seconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
