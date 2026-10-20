import type { Metadata } from "next";
import { MarketsList } from "@/components/app/MarketsList";

export const metadata: Metadata = { title: "Markets" };

export default function MarketsPage() {
  return <MarketsList />;
}
