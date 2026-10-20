import type { ReactNode } from "react";
import { BottomBar, Sidebar } from "@/components/app/Shell";
import "./app.css";

/** The ruled T-frame shared by the five working routes. docs/FRONTEND.md §3.2 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <Sidebar />
      <div className="app__main">{children}</div>
      <BottomBar />
    </div>
  );
}
