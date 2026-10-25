"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { filterOf, NotConfiguredError, phaseLabel, phaseOf, phaseTone, useMarkets, type Market, type MarketFilter } from "@/lib/data";
import { network } from "@/lib/config";
import { formatBot } from "@/lib/money";
import { formatSpan, formatUtc } from "@/lib/time";
import { useNow } from "@/lib/useNow";
import { Rope } from "../Rope";
import { TopBar } from "./Shell";

const toneClass = { neutral: "", warning: "warn", positive: "pos", negative: "neg" } as const;

const TABS: { key: MarketFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "awaiting", label: "Awaiting result" },
  { key: "resolved", label: "Resolved" },
  { key: "refundable", label: "Refundable" },
];

const EMPTY: Record<MarketFilter, string> = {
  all: "No markets yet. The first one could be yours.",
  open: "Nothing is open right now.",
  awaiting: "No market is waiting on a result.",
  resolved: "No market has been settled yet.",
  refundable: "No refundable markets. Good news for everyone.",
};

type Sort = "closing" | "newest" | "pool";
const PAGE = 25;

function deadlineText(m: Market, now: number) {
  const d = m.deadline - now;
  return d > 0 ? `in ${formatSpan(d)}` : formatUtc(m.deadline).replace(" UTC", "");
}

export function MarketsList() {
  const markets = useMarkets();
  const now = useNow();
  const [tab, setTab] = useState<MarketFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("closing");
  const [limit, setLimit] = useState(PAGE);

  const withPhase = useMemo(
    () => (now === null || !markets.data ? [] : markets.data.map((m) => ({ m, phase: phaseOf(m, now) }))),
    [markets.data, now],
  );
  const counts = useMemo(() => {
    const c: Record<MarketFilter, number> = { all: withPhase.length, open: 0, awaiting: 0, resolved: 0, refundable: 0 };
    for (const x of withPhase) c[filterOf(x.phase)] += 1;
    return c;
  }, [withPhase]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = withPhase.filter((x) => (tab === "all" || filterOf(x.phase) === tab) && (!q || `${x.m.question} ${x.m.optionA} ${x.m.optionB}`.toLowerCase().includes(q)));
    const pool = (m: Market) => m.stake * BigInt(m.countA + m.countB);
    list.sort((a, b) => {
      if (sort === "newest") return b.m.createdAt - a.m.createdAt;
      if (sort === "pool") return pool(b.m) > pool(a.m) ? 1 : pool(b.m) < pool(a.m) ? -1 : 0;
      // closing soonest: open ones by deadline first, then the closed ones, most recent first
      const ao = a.phase === "open", bo = b.phase === "open";
      if (ao !== bo) return ao ? -1 : 1;
      return ao ? a.m.deadline - b.m.deadline : b.m.deadline - a.m.deadline;
    });
    return list;
  }, [withPhase, tab, query, sort]);

  const ready = markets.isSuccess && now !== null;
  const sub =
    counts.all === 0
      ? `Markets on ${network.label}`
      : [`${counts.open} open`, counts.awaiting ? `${counts.awaiting} waiting on a result` : null, counts.refundable ? `${counts.refundable} refundable` : null].filter(Boolean).join(", ");

  let body: React.ReactNode;
  if (markets.error instanceof NotConfiguredError) {
    body = <p className="empty">The TrueUp contract isn&rsquo;t deployed on {network.label} yet. Markets will list here once it is.</p>;
  } else if (markets.error) {
    body = (
      <p className="empty">
        Couldn&rsquo;t reach BOT Chain to list markets.{" "}
        <button type="button" className="text-action" onClick={() => markets.refetch()}>
          Retry
        </button>
      </p>
    );
  } else if (markets.isLoading || now === null) {
    body = (
      <div className="mtable" aria-busy="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="mrow mrow--loading">
            <span className="skeleton" style={{ height: 20, width: "60%" }} />
            <span className="skeleton" style={{ height: 20, width: 64 }} />
          </div>
        ))}
      </div>
    );
  } else if (rows.length === 0) {
    body = (
      <p className="empty">
        {query ? `No markets match “${query}”.` : EMPTY[tab]}{" "}
        {!query && (tab === "all" || tab === "open") && (
          <Link className="text-action" href="/create">
            Create a market
          </Link>
        )}
      </p>
    );
  } else {
    body = (
      <>
        <table className="mtable">
          <thead>
            <tr>
              <th>Question</th>
              <th className="n">Stake</th>
              <th className="n">People</th>
              <th className="n">Pool</th>
              <th className="n">Deadline</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map(({ m, phase }) => (
              <tr key={m.id}>
                <td className="mtable__q">
                  <Link href={`/markets/${m.id}`}>{m.question}</Link>
                  <Rope countA={m.countA} countB={m.countB} className="rope--thin" label={`${m.countA} on ${m.optionA}, ${m.countB} on ${m.optionB}`} />
                  <span className="mtable__line nums">
                    {[
                      `${formatBot(m.stake, 4, { trim: true })} BOT`,
                      `${m.countA + m.countB} people`,
                      `${formatBot(m.stake * BigInt(m.countA + m.countB), 2)} BOT pool`,
                      m.deadline > now ? `closes ${deadlineText(m, now)}` : `closed ${deadlineText(m, now)}`,
                    ].map((part, i) => (
                      <span key={i}>
                        {i > 0 && " · "}
                        <span className="nowrap">{part}</span>
                      </span>
                    ))}
                  </span>
                </td>
                <td className="n nums">{formatBot(m.stake, 4, { trim: true })} BOT</td>
                <td className="n nums">{m.countA + m.countB}</td>
                <td className="n nums">{formatBot(m.stake * BigInt(m.countA + m.countB), 2)} BOT</td>
                <td className="n nums">{deadlineText(m, now)}</td>
                <td>
                  <span className={`pill ${toneClass[phaseTone[phase]]}`}>{phaseLabel[phase]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mtable__more nums">
          <span className="muted">
            1–{Math.min(limit, rows.length)} of {rows.length}
          </span>
          {rows.length > limit && (
            <button type="button" className="btn" onClick={() => setLimit((l) => l + PAGE)}>
              Load {Math.min(PAGE, rows.length - limit)} more
            </button>
          )}
        </p>
      </>
    );
  }

  return (
    <>
      <TopBar title="Markets">
        <label className="search">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <circle cx="9" cy="9" r="6" />
            <path d="M14 14l4 4" />
          </svg>
          <span className="sr-only">Search markets</span>
          <input type="search" placeholder="Search questions" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }} />
        </label>
      </TopBar>
      <main className="canvas">
        <div className="title-row">
          <div>
            <h1>Markets</h1>
            <p className="sub nums">{now === null || markets.isLoading ? " " : sub}</p>
          </div>
          <Link className="btn primary" href="/create">
            Create a market
          </Link>
        </div>
        <div className="tabs" role="tablist" aria-label="Filter markets">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => { setTab(t.key); setLimit(PAGE); }}>
              {t.label}
              {ready && <span className="count nums">{counts[t.key]}</span>}
            </button>
          ))}
        </div>
        <div className="toolbar">
          <span className="muted nums">{ready ? `${rows.length} ${rows.length === 1 ? "market" : "markets"}` : " "}</span>
          <label className="sort">
            <span className="muted">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="closing">Closing soonest</option>
              <option value="newest">Newest</option>
              <option value="pool">Largest pool</option>
            </select>
          </label>
        </div>
        {body}
      </main>
    </>
  );
}
