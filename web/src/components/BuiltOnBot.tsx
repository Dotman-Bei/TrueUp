import { BOT_CHAIN_SITE, network } from "@/lib/config";

/** "Built on BOT Chain" with the chain's official website and the explorer for the network the app uses. */
export function BuiltOnBot({ className }: { className?: string }) {
  const explorer = network.chain.blockExplorers.default.url;
  return (
    <div className={`built-on ${className ?? ""}`}>
      <p className="built-on__name">
        Built on <strong>BOT Chain</strong>
      </p>
      <ul className="built-on__links">
        <li>
          <a href={BOT_CHAIN_SITE} target="_blank" rel="noreferrer">
            BOT Chain website
          </a>
        </li>
        <li>
          <a href={explorer} target="_blank" rel="noreferrer">
            BOT Chain Explorer{network.isTestnet ? ` (${network.label})` : ""}
          </a>
        </li>
      </ul>
    </div>
  );
}
