import type { Metadata } from "next";
import { Leaders } from "@/components/app/Leaders";

export const metadata: Metadata = { title: "Leaders" };

export default function LeadersPage() {
  return <Leaders />;
}
