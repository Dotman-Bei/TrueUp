"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LIMITS } from "@/lib/config";

/** The closing sentence with a blank in it: the blank is the question, the last words submit it. */
export function AskForm() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <section className="ask" aria-labelledby="ask-title">
      <form
        className="ask__form"
        action="/create"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(q.trim() ? `/create?q=${encodeURIComponent(q.trim())}` : "/create");
        }}
      >
        <div className="ask__sentence">
          <h2 id="ask-title" className="ask__lead">
            Ask the group
          </h2>{" "}
          <label className="sr-only" htmlFor="ask-q">
            Your question
          </label>
          <input
            id="ask-q"
            name="q"
            className="ask__blank"
            value={q}
            maxLength={LIMITS.question}
            onChange={(e) => setQ(e.target.value)}
            placeholder="will Maya finish?"
            autoComplete="off"
          />{" "}
          <button className="ask__go" type="submit">
            Put it up
          </button>
        </div>
      </form>
      <p className="ask__after">Opens the create form with your question filled in. Nothing happens on-chain until you confirm in your wallet.</p>
    </section>
  );
}
