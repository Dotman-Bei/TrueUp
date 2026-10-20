"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NotConfiguredError, phaseOf, useMarkets, useStats, type Market } from "@/lib/data";
import { network } from "@/lib/config";
import { formatBot } from "@/lib/money";
import { formatSpan, nowSeconds } from "@/lib/time";

const TONES = ["paper", "paper-2", "tan"] as const;

function useNow(every = 30_000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(nowSeconds());
    const t = setInterval(() => setNow(nowSeconds()), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}

function Card({ m, tone, now, style, onFocus, spine, ahead }: { m: Market; tone: string; now: number; style?: React.CSSProperties; onFocus?: () => void; spine?: boolean; ahead?: boolean }) {
  const pooled = m.stake * BigInt(m.countA + m.countB);
  return (
    <article className={`deck-card deck-card--${tone}${spine ? " is-spine" : ""}${ahead ? " is-ahead" : ""}`} style={style} onFocus={onFocus}>
      <p className="deck-card__spine" aria-hidden="true">
        {m.question}
      </p>
      <p className="deck-card__title">{m.question}</p>
      <p className="deck-card__line nums">
        {m.optionA} {m.countA} · {m.optionB} {m.countB} · {formatBot(pooled, 2)} BOT pooled
      </p>
      <p className="deck-card__foot nums">
        <span>Closes in {formatSpan(m.deadline - now)}</span>
        <Link href={`/markets/${m.id}`}>Open market</Link>
      </p>
    </article>
  );
}

export function OpenNow() {
  const markets = useMarkets();
  const stats = useStats();
  const now = useNow();
  const wrap = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);

  const open =
    now === null || !markets.data
      ? []
      : markets.data
          .filter((m) => phaseOf(m, now) === "open")
          .sort((a, b) => a.deadline - b.deadline)
          .slice(0, 6);

  useEffect(() => {
    const mq = matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)");
    const update = () => setPinned(mq.matches && open.length >= 3);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [open.length]);

  useEffect(() => {
    if (!pinned) return;
    const onScroll = () => {
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const travel = r.height - innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, travel)));
      setActive(Math.round(p * (open.length - 1)));
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, [pinned, open.length]);

  const goTo = (i: number) => {
    const el = wrap.current;
    if (!el) return;
    const travel = el.offsetHeight - innerHeight;
    scrollTo({ top: el.offsetTop + (travel * i) / Math.max(1, open.length - 1), behavior: "smooth" });
  };

  let body: React.ReactNode;
  if (markets.error instanceof NotConfiguredError) {
    body = (
      <div className="deck-empty">
        <p className="deck-empty__title">Markets appear here once the TrueUp contract is live on {network.label}.</p>
        <p>Every open market will show its question, both sides, the pool and the time left, straight from the contract.</p>
      </div>
    );
  } else if (markets.error) {
    body = (
      <div className="deck-empty">
        <p className="deck-empty__title">Couldn&rsquo;t reach BOT Chain.</p>
        <p>
          The open markets will show again once the network answers.{" "}
          <button className="text-button" type="button" onClick={() => markets.refetch()}>
            Retry
          </button>
        </p>
      </div>
    );
  } else if (markets.isLoading || now === null) {
    body = <div className="deck deck--loading" aria-busy="true" aria-label="Loading open markets" />;
  } else if (open.length === 0) {
    body = (
      <div className="deck-empty">
        <p className="deck-empty__title">Nobody has an open question right now.</p>
        <p>
          <Link className="button button--ink" href="/create">
            Create a market
          </Link>
        </p>
      </div>
    );
  } else if (pinned) {
    body = (
      <div className="deck deck--pinned">
        {open.map((m, i) => {
          const x = i <= active ? i * 120 : active * 120 + (i - active) * 660;
          return (
            <Card
              key={m.id}
              m={m}
              now={now}
              tone={TONES[i % 3]}
              onFocus={() => goTo(i)}
              spine={i < active}
              ahead={i > active + 1}
              style={{ transform: `translateX(${x}px)`, zIndex: i + 1, cursor: i < active ? "pointer" : undefined }}
            />
          );
        })}
        {open.slice(0, active).map((m, i) => (
          <button key={m.id} className="deck-spine" style={{ left: i * 120 }} type="button" onClick={() => goTo(i)}>
            <span className="sr-only">Show {m.question}</span>
          </button>
        ))}
      </div>
    );
  } else {
    body = (
      <div className="deck deck--stack">
        {open.map((m, i) => (
          <Card key={m.id} m={m} now={now} tone={TONES[i % 3]} />
        ))}
      </div>
    );
  }

  const s = stats.data;
  return (
    <section className="open-now" aria-labelledby="open-title">
      <div ref={wrap} className="open-now__track" style={pinned ? { height: `calc(100svh + ${(open.length - 1) * 40}svh)` } : undefined}>
        <div className={pinned ? "open-now__stage open-now__stage--pinned" : "open-now__stage"}>
          <h2 id="open-title" className="open-now__heading" data-reveal>
            Open right now
          </h2>
          {body}
          <p className="open-now__totals nums">
            {s ? (
              <>
                {s.open} open · {s.created} created · {formatBot(s.staked, 2)} BOT staked · {s.settled} settled · {s.refunded} refunded
                {" · "}
              </>
            ) : null}
            <Link className="text-link" href="/markets">
              All markets
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
