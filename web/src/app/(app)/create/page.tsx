import type { Metadata } from "next";
import { CreateMarket } from "@/components/app/CreateMarket";

export const metadata: Metadata = { title: "New market" };

export default function CreatePage() {
  return <CreateMarket />;
}
