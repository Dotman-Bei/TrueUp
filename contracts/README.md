# TrueUp contracts

One contract, [`src/TrueUp.sol`](src/TrueUp.sol), holds every stake and enforces the market lifecycle from
the PRD. Built and tested with Foundry.

```bash
forge build
forge test            # 35 tests, including fuzzed value conservation
forge coverage --report summary
```

## Rules the contract enforces

| Rule | How |
| --- | --- |
| Equal fixed stake | `join` reverts unless `msg.value` equals the market's stake exactly |
| One position per wallet | a second `join` from the same wallet reverts, on either side |
| No late entries | `join` reverts at or after the deadline, whatever the frontend shows |
| Creator doesn't auto-join | `createMarket` takes no value; the creator joins like anyone else |
| Creator-only, one-time settlement | `settle` only by the creator, only after the deadline, only once, only within 72 hours of it |
| One-sided pools refund | `settle` reverts if a side is empty; refunds open at the deadline with no fee |
| Permissionless timeout | after deadline + 72 h, anyone can call `openRefunds` (or `claimRefund`, which opens them first) |
| Monotonic status | Open → ResolvedA / ResolvedB, or Open → Refundable. Nothing returns to Open; settled can't refund and refunded can't settle |
| Fee | `fee = pot × feeBps / 10 000`, `feeBps` captured at creation, 5% hard cap, never charged on refunds |
| Dust | each winner gets `floor((pot − fee) / winners)`; the remainder (under `winners` wei) joins the fee balance, so nothing is stuck |
| Pull payments | each winner calls `claimWinnings`, each participant `claimRefund`, once; no loops over participants |
| Fee withdrawal | `withdrawFees` by the owner only, and only `accruedFees`, never stakes |
| Ownership | two-step: `transferOwnership` then `acceptOwnership` |

Text limits are in UTF-8 bytes (question 280, each side 96). Sides that match after trimming and
lower-casing ASCII are rejected. Stakes run from 0.001 BOT to `maxStake` (100 BOT by default, set by the
owner for new markets). Deadlines run from 1 hour to 30 days ahead.

## Trust model

The creator reports the result. The contract controls who may report it and when, and how the pot is paid.
It cannot know what happened in the real world. If the creator never reports, everyone gets their stake
back after 72 hours.

## Deploy

Network settings were checked on 2026-10-20 against
[the BOT Chain quick guide](https://dev-docs.botchain.ai/docs/Developers/quick-guide/) and the live RPCs:
Bohr testnet is chain 968 (`https://rpc.bohr.life`, explorer `https://scan.bohr.life`, faucet
`https://faucet.botchain.ai/basic`); mainnet is chain 677. Check them again before every deploy.
The contract is compiled for the `paris` EVM so it runs on any EVM chain.

Put the deployer's private key and the owner address in `contracts/.env` (copied from
`.env.example`; git ignores it). Use a wallet that only holds test BOT.

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url bohr --broadcast   --verify --verifier blockscout --verifier-url https://scan.bohr.life/api/
```

If you'd rather not keep a key in a file, leave `PRIVATE_KEY` empty, run
`cast wallet import trueup-deployer --interactive` once, and add `--account trueup-deployer` to the command.

`FEE_BPS` (default 10) and `MAX_STAKE` (wei, default 100 BOT) are optional. The script refuses any chain
other than 968, 677 and a local node. It prints the address and deploy block for the web app's
`NEXT_PUBLIC_BOHR_CONTRACT` and `NEXT_PUBLIC_DEPLOY_BLOCK`. Afterwards, copy the ABI to the web app:

```bash
node web/scripts/sync-abi.mjs
```

Mainnet waits on the PRD's legal, policy and independent security review.

## Local node

```bash
anvil                                 # separate terminal
bash contracts/script/seed-local.sh   # deploys and leaves markets in every lifecycle state
```

It prints the values to put in `web/.env.local` (`NEXT_PUBLIC_NETWORK=local`), which is development only.
