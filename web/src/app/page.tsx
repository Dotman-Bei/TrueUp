import Image from "next/image";
import Link from "next/link";
import { AskForm } from "@/components/home/AskForm";
import { Endings } from "@/components/home/Endings";
import { HomeNav } from "@/components/home/HomeNav";
import { OpenNow } from "@/components/home/OpenNow";
import { Reveal } from "@/components/home/Reveal";
import { SplitPot } from "@/components/home/SplitPot";
import { explorerAddress, network } from "@/lib/config";
import { archive } from "@/lib/credits";
import { zigzagFoot } from "@/lib/shape";
import "./home.css";

const itinerary: { when: string; rows: [string, string][] }[] = [
  {
    when: "Before the deadline",
    rows: [
      ["Write the question and its two sides", "under a minute"],
      ["Set the stake and the deadline", "1 hour to 1 week"],
      ["Create it on BOT Chain", "one transaction"],
      ["Paste the link in your group chat", "any app"],
      ["Friends pick a side and stake", "the exact amount"],
    ],
  },
  {
    when: "At the deadline",
    rows: [
      ["Entries close", "enforced by the contract"],
      ["A pool with an empty side turns refundable", "no fee"],
    ],
  },
  {
    when: "After the deadline",
    rows: [
      ["The creator confirms the result", "once, final"],
      ["The 0.1% fee leaves the pot", "settled pools only"],
      ["Winners claim equal shares", "whenever they like"],
    ],
  },
  {
    when: "72 hours on, if nobody settled",
    rows: [
      ["Anyone opens refunds", "no permission needed"],
      ["Everyone takes their stake back", "in full"],
    ],
  },
];

const questions = [
  ["Who decides the result?", "The person who created the market. TrueUp records their decision on BOT Chain, but the chain can’t check whether it is true. Only stake in pools where you trust the creator."],
  ["What if they never settle?", "Seventy-two hours after the deadline, anyone can open refunds. Every participant then takes back exactly what they staked."],
  ["What does it cost?", "A 0.1% protocol fee on the pot of settled markets. It is fixed when the market is created, the contract caps it at 5%, and refunded markets pay nothing. You also pay network gas in BOT."],
  ["What if nobody takes the other side?", "There is no one to win from, so the market turns refundable at the deadline, with no fee."],
  ["Can I lose my stake?", "Yes. If the market is settled and your side lost, your stake goes to the winners."],
  ["Can I switch sides or join twice?", "No. One wallet holds one position per market, chosen once."],
  ["Does the creator join their own market?", "Not automatically. They pick a side and stake like anyone else."],
  ["Can I join after the deadline?", "No. The contract rejects late entries even if a countdown on your screen is behind."],
  ["Is my market private?", "No. The question, the sides, every wallet and every stake are public on BOT Chain. Keep names and private details out of the question."],
  ["What happens to rounding dust?", "Payouts are calculated in wei. Any remainder that can’t be split equally is handled by a documented contract rule. It is never left stuck in the pool."],
  network.isTestnet
    ? ["Is this real money?", `Not here. This copy of TrueUp runs on ${network.label}, where test BOT has no value.`]
    : ["Is this real money?", "Yes. Stakes are real BOT on BOT Chain, and you can lose them. The contract hasn’t had an independent audit yet, so stakes are capped per person. Only stake what you can afford to lose."],
  ["Which wallet do I need?", `Any EVM wallet that can add a network. TrueUp asks to switch to ${network.label} (chain ${network.chain.id}) before every transaction.`],
  ["Is there a TrueUp token?", "No. Stakes, payouts and gas are all native BOT."],
] as [string, string][];

const menu = [
  { href: "/markets", label: "Markets" },
  { href: "/create", label: "Create" },
  { href: "/leaders", label: "Leaders" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "#how", label: "How it works" },
  { href: "#questions", label: "Questions" },
];

export default function Home() {
  return (
    <main className="home">
      <Reveal />

      {/* Hero: the slip over the field */}
      <header className="hero">
        <figure className="hero__photo">
          <Image src={archive.hero.src} alt={archive.hero.alt} fill priority sizes="100vw" />
        </figure>
        <HomeNav />
        <div className="slip hero__slip">
          <h1 className="slip__title">
            <span data-rise style={{ "--i": 0 } as React.CSSProperties}>Bets</span>{" "}
            <span data-rise style={{ "--i": 1 } as React.CSSProperties}>between</span>{" "}
            <span data-rise style={{ "--i": 2 } as React.CSSProperties}>friends</span>
          </h1>
          <p className="slip__lead" data-rise style={{ "--i": 3 } as React.CSSProperties}>
            TrueUp is a two-outcome prediction pool on BOT Chain. Everyone stakes the same amount, the creator calls the result, and the winners split the pot.
          </p>
          <div className="slip__facts" data-rise style={{ "--i": 4 } as React.CSSProperties}>
            <p className="slip__question">Will Maya finish the 5K on Saturday?</p>
            <div className="slip__stubs">
              <span className="stub stub--a">She finishes</span>
              <span className="stub stub--b">She does not finish</span>
            </div>
            <p className="slip__terms nums">0.2 BOT each · closes Saturday 18:00 UTC</p>
          </div>
          <div className="slip__foot">
            <span className="slip__credit">Example slip · {network.isTestnet ? `${network.label}, test BOT only` : "BOT Chain"}</span>
            <Link className="button button--ink" href="/create">
              Create a market
            </Link>
            <Link className="slip__link" href="/markets">
              Browse markets
            </Link>
          </div>
        </div>
      </header>

      {/* 1. Itinerary on a slip */}
      <section id="how" className="itinerary" aria-labelledby="how-title">
        <div className="itinerary__text">
          <div data-reveal>
            <h2 id="how-title" className="section-heading">
              Question to payout
            </h2>
            <p className="itinerary__para">One contract holds every stake from the moment someone joins. Nobody can move the pot, the creator included, except by these rules.</p>
          </div>
          <figure className="itinerary__photo photo" data-reveal>
            <Image src={archive.rope.src} alt={archive.rope.alt} width={archive.rope.width} height={archive.rope.height} sizes="(min-width: 900px) 40vw, 100vw" />
            <figcaption>New York Athletic Club against Milwaukee Athletic Club, St. Louis, 1904.</figcaption>
          </figure>
        </div>
        <div className="receipt receipt--itinerary" style={{ clipPath: zigzagFoot(26, 10) }} data-reveal>
          {itinerary.map((g) => (
            <dl key={g.when} className="receipt__block">
              <dt className="receipt__group">{g.when}</dt>
              {g.rows.map(([what, when]) => (
                <div key={what} className="receipt__row">
                  <dt>{what}</dt>
                  <dd>{when}</dd>
                </div>
              ))}
            </dl>
          ))}
          <p className="receipt__total">You end with a winner&rsquo;s share or your stake back</p>
        </div>
      </section>

      {/* 2. How a pool ends */}
      <Endings />

      {/* 3. Open right now */}
      <OpenNow />

      {/* 4. Split the pot: the live thing */}
      <SplitPot />

      {/* 5. Fair questions */}
      <section id="questions" className="faq" aria-labelledby="faq-title">
        <div className="faq__side">
          <h2 id="faq-title" className="section-heading">
            Fair questions
          </h2>
          <figure className="faq__photo photo" data-reveal>
            <Image src={archive.champions.src} alt={archive.champions.alt} width={archive.champions.width} height={archive.champions.height} sizes="(min-width: 900px) 28vw, 100vw" />
            <figcaption>The 1904 winners, Milwaukee Athletic Club.</figcaption>
          </figure>
        </div>
        <div className="faq__text">
          {questions.map(([q, a]) => (
            <p key={q} data-reveal>
              <strong>{q}</strong> {a}
            </p>
          ))}
        </div>
      </section>

      {/* 6. A sentence with a blank */}
      <AskForm />

      {/* Footer: photograph half, menu half */}
      <footer className="footer">
        <figure className="footer__photo">
          <Image src={archive.anchor.src} alt={archive.anchor.alt} fill sizes="(min-width: 900px) 50vw, 100vw" />
        </figure>
        <div className="footer__side">
          <span className="footer__mark">TrueUp</span>
          <nav aria-label="Footer">
            <ul className="footer__menu">
              {menu.map((m) => (
                <li key={m.href}>
                  <Link href={m.href}>{m.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="footer__facts">
            <p>
              Network: {network.label}, chain {network.chain.id}, explorer{" "}
              <a href={network.chain.blockExplorers.default.url}>{network.chain.blockExplorers.default.url.replace("https://", "")}</a>
            </p>
            <p>
              Contract:{" "}
              {network.contract ? (
                <a className="nums" href={explorerAddress(network.contract)}>
                  {network.contract}
                </a>
              ) : (
                "not deployed yet"
              )}
            </p>
          </div>
          <p className="footer__credits">
            Photographs of the 1904 Olympic tug-of-war in St. Louis, public domain, via Wikimedia Commons:{" "}
            {[archive.hero, archive.rope, archive.champions, archive.anchor].map((p, i) => (
              <span key={p.src}>
                <a href={p.page}>{["the judges", "the pull", "the winners", "the anchor"][i]}</a>
                {i < 3 ? ", " : "."}
              </span>
            ))}
          </p>
          <p className="footer__legal">
            {network.isTestnet
              ? "Testnet only. Test BOT has no value."
              : "Stakes are real BOT and can be lost. TrueUp is unaudited software, isn’t licensed anywhere, and makes no promise that prediction pools are legal where you are. Check your local rules and only take part if you’re of legal age."}
          </p>
        </div>
      </footer>
    </main>
  );
}
