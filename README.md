# TrueUp

**A simple, on-chain way for friends to put BOT behind a two-outcome prediction, settle the result, and
split the pot transparently.**

Someone asks the group chat "Will Maya finish the 5K on Saturday?". TrueUp turns that into a market with two
sides, a fixed stake per person and a deadline. Everyone who joins sends exactly the same amount of native
BOT to a smart contract. After the deadline the creator confirms what happened, and the winners each claim an
equal share of the pot. If the creator never confirms, everyone takes their stake back.

Live on **Bohr testnet** (chain 968). Test BOT only; not deployed to mainnet.

| | |
| --- | --- |
| Contract | [`0xc46E080279C5d3637a41d5B30fF8bD0a24FF0B04`](https://scan.bohr.life/address/0xc46e080279c5d3637a41d5b30ff8bd0a24ff0b04), source verified |
| Deployed | 2026-10-20, block 27529370 |
| Protocol fee | 0.1% of settled pots (10 bps), 5% hard cap in the contract, nothing on refunds |

## The problem

Friends make small bets all the time, and they settle them on trust and memory: who was in, for how much,
who won, who still owes. Someone holds the money, or nobody does and half the group never pays.

TrueUp keeps the friendly part and moves the money part on-chain. The contract holds every stake from the
moment someone joins, records who picked which side, and pays out by fixed rules. The shareable link is the
whole distribution channel: paste it in Telegram, Discord, WhatsApp or X, and anyone can read the terms
before connecting a wallet.

## How a market works

```text
Create (question, two sides, stake, deadline)  →  share the link  →  friends pick a side and stake
        ↓ deadline: entries close
Creator confirms the result (once, within 72 h)  →  winners claim equal shares of the pot minus 0.1%
        or
Nobody confirms within 72 h, or one side is empty  →  anyone opens refunds  →  everyone claims their stake back
```

- Every participant stakes exactly the same amount. One position per wallet per market; no switching sides.
- Creating a market doesn't join it. The creator picks a side and stakes like anyone else.
- Each winner receives `floor((pot − fee) / winners)`. The rounding remainder (fewer wei than there are
  winners) joins the fee balance, so no wei is ever stuck.
- Payouts are pulled: each winner or refunded participant claims their own, once.

## Architecture

```text
contracts/   Solidity + Foundry. One escrow contract: src/TrueUp.sol
web/         Next.js 15, React 19, TypeScript, wagmi + viem. Reads the contract and its events directly.
docs/        FRONTEND.md, the design and interface spec
```

**On-chain is the authority.** The contract holds stakes, records positions and outcomes, captures the fee
rate per market, enforces deadlines, settlement and refund rules, and blocks double claims. It emits
`MarketCreated`, `ParticipantJoined`, `MarketSettled`, `RefundsOpened`, `WinningsClaimed`, `StakeRefunded`
and `ProtocolFeeWithdrawn` for indexing.

**The frontend holds no money and no state of its own.** It reads markets with `getMarket`, positions with
`positionOf`, and history from contract events, scanned in one-million-block windows. A write only shows as
done once its receipt confirms on BOT Chain. There is no backend: an indexer can be added later for speed
without changing the trust model.

**Six routes:** `/` home, `/markets`, `/markets/[id]` (the link you share), `/create`, `/leaders`,
`/portfolio`.

## Run it locally

Requires Node 22+ and, for the contracts, [Foundry](https://book.getfoundry.sh/).

```bash
cd web
cp .env.example .env.local     # already points at the Bohr testnet deployment
npm install
npm run dev                    # http://localhost:3000
```

Use any EVM wallet (MetaMask, Rabby). The app asks to switch to Bohr testnet (chain 968, RPC
`https://rpc.bohr.life`) before every transaction. Get test BOT from the
[faucet](https://faucet.botchain.ai/basic).

Development options in `web/.env.local`, both refused by production builds:

- `NEXT_PUBLIC_DATA_SOURCE=fixtures` fills every screen with sample data for layout work, under a permanent
  "Nothing here is on-chain" notice. Transactions are switched off.
- `NEXT_PUBLIC_NETWORK=local` runs against a local Anvil node. `anvil`, then
  `bash contracts/script/seed-local.sh`, deploys the contract and leaves markets in every lifecycle state.

## Contracts

```bash
cd contracts
forge build
forge test                       # 35 tests, including 1,000-run fuzzing of payouts and refunds
forge coverage --report summary  # 100% of lines and functions in TrueUp.sol
```

The tests cover exact-stake and duplicate joins, late entries, creator-only one-time settlement, the
settlement window, one-sided markets, permissionless timeout refunds, settled markets that can't refund and
refunded markets that can't settle, fee capture and the cap, owner-only fee withdrawal, dust, value
conservation and a reentrant double-claim attempt. [contracts/README.md](contracts/README.md) lists every rule
the contract enforces.

## Deploy

Network settings were checked against the
[BOT Chain quick guide](https://dev-docs.botchain.ai/docs/Developers/quick-guide/) and the live RPCs on
2026-10-20. Check them again before each deploy.

| Network | Chain ID | RPC | Explorer |
| --- | --- | --- | --- |
| Bohr testnet | 968 | `https://rpc.bohr.life` | https://scan.bohr.life |
| BOT mainnet | 677 | `https://rpc.botchain.ai` | https://scan.botchain.ai |

1. Copy `contracts/.env.example` to `contracts/.env` (git-ignored). Fill in `PRIVATE_KEY` for a wallet that
   only holds test BOT, and `OWNER`. Or leave the key empty and use a Foundry keystore with `--account`.
2. Deploy and verify:
   ```bash
   cd contracts
   forge script script/Deploy.s.sol --rpc-url bohr --broadcast \
     --verify --verifier blockscout --verifier-url https://scan.bohr.life/api/
   ```
   The script refuses any chain other than 968, 677 and a local node.
3. Put the printed address and deploy block in `web/.env.local` as `NEXT_PUBLIC_BOHR_CONTRACT` and
   `NEXT_PUBLIC_DEPLOY_BLOCK`, then run `node web/scripts/sync-abi.mjs` if the contract changed.
4. For the frontend: `cd web && npm run build && npm start`, or deploy the `web/` folder to any Next.js host
   with the same environment variables. Testnet and mainnet addresses are kept in separate variables, and
   the app never falls back from one network to the other.

## Threat model

**Trusted:** the market creator, to report the true outcome. The contract enforces who may report and when,
but it can't know what happened in the real world. A creator can lie. The app says so on the create screen,
on every market page and before every stake. Only join markets made by people you trust.

**Not trusted, and enforced by the contract instead:**

| Risk | Mitigation |
| --- | --- |
| Creator disappears | After deadline + 72 h, anyone can open refunds; the creator can no longer settle |
| Nobody took the other side | Refundable at the deadline, no fee; settlement is blocked |
| Late entry with a stale countdown | `join` reverts at or after the deadline, whatever the UI shows |
| Wrong amount | `join` reverts unless the value equals the stake exactly; nothing is trapped |
| Double claim, double refund | Each position is marked claimed before paying; tested, including reentrancy |
| Changing the result after settlement | Status only moves forward; settled and refunded are final |
| Fee raised on existing markets | The fee rate is captured at creation; changes only affect new markets; 5% cap |
| Owner draining stakes | `withdrawFees` can only move `accruedFees`, never escrowed stakes or unclaimed payouts |
| Funds stuck by rounding | The remainder joins the fee balance; fuzz tests check payouts plus fee equal the pot |
| Wrong network | The app checks the chain before every write and asks to switch |

**Owner powers:** set the fee for new markets (up to 5%), set the maximum stake for new markets, withdraw
accrued fees, and transfer ownership in two steps. The owner can't touch stakes, outcomes or existing
markets. The current owner is the deployer wallet.

**Privacy:** none, by design. Questions, sides, wallets, stakes and outcomes are public on BOT Chain
permanently. Sharing a link in a private chat doesn't make a market private. The create form asks people to
keep personal details out of questions.

## Limitations

- The creator is the oracle. There is no dispute process, appeal or oracle network in this version.
- One fixed stake per market and one position per wallet. No adding to a position, no selling it.
- Native BOT only. No tokens, no other chains, no fiat.
- History comes from scanning contract events from the deploy block. That's fine at testnet scale; a busy
  deployment will want an indexer.
- Leaderboards count settled markets only, by wallet. Wallets can be cheaply created, so rankings are
  informational, not reputation.
- Not audited. The contract has a full test suite but no independent review yet.
- **Testnet only.** Participants can lose stakes in a validly settled market. Running it with real BOT needs
  a legal and policy review for the target jurisdictions (gambling and contest rules, age limits, consumer
  protection, disclosures) and an independent security review first. TrueUp makes no claim to be licensed
  or compliant anywhere.

## Status

| | |
| --- | --- |
| Contract written, tested (35 tests) and deployed to Bohr testnet, source verified | done |
| All six routes built, reading the live contract | done |
| End-to-end flows with real wallets (settle and claim; timeout and refund) | next |
| Real-user testnet pilot and feedback | planned |
| Independent review, legal and policy review, mainnet | not started |

## Credits

Photographs on the home page are from the 1904 Olympic tug-of-war competition in St. Louis, public domain, via
Wikimedia Commons. Each is linked from the site's footer. Typeface: Switzer by Indian Type Foundry, via
Fontshare.
