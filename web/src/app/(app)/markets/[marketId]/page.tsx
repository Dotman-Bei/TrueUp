import type { Metadata } from "next";
import { MarketDetail } from "@/components/app/MarketDetail";
import { network, useFixtures } from "@/lib/config";
import { chainSource } from "@/lib/data/chain";
import { formatBot } from "@/lib/money";
import { formatUtc } from "@/lib/time";

type Props = { params: Promise<{ marketId: string }> };

function parseId(raw: string) {
  return /^\d{1,12}$/.test(raw) ? Number(raw) : NaN;
}

/** Link previews for chats use the public market title and terms, read from the contract. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).marketId);
  if (!Number.isFinite(id) || useFixtures || !network.contract) return { title: "Market" };
  try {
    const m = await chainSource.getMarket(id);
    if (!m) return { title: "Market not found" };
    const description = `${m.optionA} or ${m.optionB}. ${formatBot(m.stake, 6, { trim: true })} BOT each, closes ${formatUtc(m.deadline)}. A TrueUp pool on ${network.label}.`;
    return { title: m.question, description, openGraph: { title: m.question, description }, twitter: { card: "summary", title: m.question, description } };
  } catch {
    return { title: "Market" };
  }
}

export default async function MarketPage({ params }: Props) {
  const id = parseId((await params).marketId);
  return <MarketDetail id={id} />;
}
