import { explorerTx } from "@/lib/config";
import type { TxState } from "@/lib/tx";

/** The one line under an action: wallet → pending (with its hash) → confirmed, or why it failed. */
export function TxStatus({ state, done }: { state: TxState; done?: string }) {
  if (state.status === "idle") return null;
  const link = (hash: string) => (
    <a className="tx__hash" href={explorerTx(hash)} target="_blank" rel="noreferrer">
      View transaction
    </a>
  );
  return (
    <p className={`tx tx--${state.status}`} role="status" aria-live="polite">
      {state.status === "switching" && "Switch to Bohr testnet in your wallet."}
      {state.status === "wallet" && "Confirm in your wallet."}
      {state.status === "pending" && (
        <>
          Pending, waiting for BOT Chain. {link(state.hash)}
        </>
      )}
      {state.status === "confirmed" && (
        <>
          {done ?? "Confirmed on BOT Chain."} {link(state.hash)}
        </>
      )}
      {state.status === "failed" && (
        <>
          {state.message} {state.hash && link(state.hash)}
        </>
      )}
    </p>
  );
}
