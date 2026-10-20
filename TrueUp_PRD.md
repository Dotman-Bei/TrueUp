# PRD.md — TrueUp

## 1. Product Overview

**Product name:** TrueUp  
**Category:** Predictions / Prediction Markets  
**Target chain:** BOT Chain  
**Product type:** Shareable, two-outcome prediction pools for friends and communities  
**Working reference:** Callout — https://playcallout.vercel.app/  
**BOT Chain ecosystem:** https://www.botchain.ai/en/project-party/

### Product summary

TrueUp lets people create a clear, two-outcome question, set a fixed native-BOT stake per participant and a deadline, share the bet link with friends, and settle the result when the outcome is known. Stakes are held in a smart contract. Once settled, eligible winners claim their share of the pot. If the creator does not settle within the defined timeout, participants can recover their stakes through the refund path.

Example:

> “Will Maya finish the 5K on Saturday?”  
> Option A: “She finishes”  
> Option B: “She does not finish”  
> Stake per person: 0.2 BOT  
> Deadline: Saturday at 6:00 PM UTC

TrueUp is a social prediction-pool product, not a full order-book prediction exchange. The core loop should be easy to explain and simple to ship.

### Core user promise

> Put a little BOT behind a prediction, share it with your group, and settle the result transparently on-chain.

---

## 2. Reference Product Study and Scope Decisions

The public Callout app currently presents the following product mechanics:

- A two-option question with a fixed stake amount per participant and a deadline.
- Users connect an EVM wallet and stake native BOT.
- The contract holds the pool rather than the market creator holding funds.
- The creator settles the result after the deadline.
- Winning participants split the distributable pot equally.
- The product describes a 72-hour timeout after which anyone can open refunds if the market has not been settled.
- The public page describes a 0.1% protocol fee, with a 5% on-chain maximum, applied to settled pots; refunded/voided markets do not pay that fee.
- The creator does not join their own market automatically; they must join separately like any other participant.
- Shareable links are the primary way to bring friends into a market.
- The app has Home, Markets, Leaders, Create, and Portfolio sections, with a market-detail experience implied by browsing/participating.

TrueUp may use these publicly presented mechanics as product inspiration, but must implement its own code and brand. Do not assume Callout’s deployed contract address, ABI, deployment permissions, backend, or internal code is reusable or correct. If the existing contract is inspected for product understanding, verify any details independently and do not copy secrets or proprietary assets.

### Product decisions for TrueUp

1. **Native BOT only in MVP.** Do not add ERC-20 tokens, fiat rails, bridges, swaps, or multiple chains.
2. **Equal fixed stake per participant.** Everyone joining a market pays the configured stake amount.
3. **Creator-settled result.** The creator is the trusted resolver in the MVP. Make this limitation explicit to users.
4. **Automatic refund escape hatch.** If not settled within 72 hours after the market deadline, any account can activate the refund state and each participant can withdraw their principal.
5. **Winner claims.** After settlement, winners claim their payout. Claims are one-time and contract-enforced.
6. **No custom token.** TrueUp does not need a new project token.
7. **No complex arbitration in MVP.** Do not build a DAO, challenge court, juror market, or oracle network for the first version.
8. **Real-value readiness gate.** Test on BOT testnet first. Public real-stake mainnet use requires a review of applicable gambling, contests, consumer-protection, and jurisdiction requirements before launch.

---

## 3. BOT Chain and Incubation Strategy

The goal is a working, deployable product with real user activity, not a landing page or slide deck. TrueUp should fit the BOT ecosystem by bringing friend groups into native-BOT transactions and producing measurable, verifiable market creation, staking, settlement, payout, and refund activity.

### 3.1 Blockchain is load-bearing

Smart contracts must be the authority for:

- Market configuration and lifecycle state.
- Native-BOT stakes and escrow balance.
- Participation records.
- Market outcome once settled.
- Fee configuration captured for a market.
- Winner payout calculations and claims.
- Refund eligibility and refund claims.
- Replay/double-claim prevention.
- Public lifecycle events for indexing and analytics.

The frontend must not hold user funds, manufacture settlement state, or represent a pending transaction as complete.

### 3.2 BOT-native positioning

TrueUp should demonstrate:

- Native BOT staking and contract-held pools.
- Low-friction repeat actions such as creating, joining, settling, claiming, and refunding pools.
- Shareable community markets that bring additional users to BOT Chain.
- Publicly verifiable transactions and market state.
- A simple use case that could be adopted by student groups, friend groups, creator communities, and Web3 communities.

Do not claim the chain makes outcomes objectively true. BOT Chain records deposits and settlement; in the MVP, the creator still reports the result.

### 3.3 BOT Labs incubation requirements

Plan and deliver for these criteria:

- **Technical capability:** tested smart contracts, working end-to-end product, verified deployment where supported.
- **Market potential:** clear user group and a repeatable sharing loop.
- **Ecosystem fit:** native-BOT activity and new users interacting with BOT Chain.
- **Milestone readiness:** achievable, measured milestones rather than a large speculative scope.
- **Community foundation:** real testers, public build updates, ecosystem participation, and feedback.

### 3.4 Evidence of real usage

Track real data from the beginning:

- Unique connected wallets.
- Markets created.
- Markets joined.
- Number of participants per market.
- Total BOT staked.
- Markets settled.
- Successful winner claims.
- Refunded markets and total refunds.
- Repeat creators and repeat participants.
- Share-link visits/conversions where collected with appropriate privacy.

Do not fake user counts, market activity, balances, transaction counts, winnings, or retention.

### 3.5 Token policy

No TrueUp token is required. Native BOT is the stake asset and gas token for MVP. Do not invent a reward token, governance token, or liquidity token.

---

## 4. Target Users

### 4.1 Friends and group chats

People who want to resolve informal questions with a little stake behind each side. They arrive by a direct link, understand the question and terms, and join with a wallet.

### 4.2 Community organisers

Organisers of Web3 communities, student groups, creator communities, game groups, or small events who want to create light prediction pools for their members.

### 4.3 Repeat participants

Users who want a simple history of joined markets, open positions, resolved markets, payouts, and refunds.

### 4.4 Important assumption

MVP markets are public on-chain transactions. “Friends-only” sharing is a distribution pattern, not privacy or access control. Do not describe the contents, participation, wallet addresses, or stakes as private.

---

## 5. MVP Goals

1. A user can create a two-outcome market using native BOT.
2. A creator can share a stable market link.
3. Other users can join before the deadline by staking the exact fixed amount.
4. Market funds remain in a smart contract.
5. The creator can settle the outcome after the deadline.
6. Winners can claim their share of the distributable pot.
7. If the creator does not settle by the timeout, any account can activate refunds and participants can recover their own stakes.
8. Each address can claim a payout/refund only as permitted by contract state, and never more than once for the same market participation.
9. Markets, standings, positions, payouts, and refunds are visible in the frontend and verifiable on BOT Chain.
10. The product is deployed to testnet and tested end-to-end before mainnet is considered.

### Non-goals

Do not build an order book, AMM, liquidity provider, leveraged positions, price oracle, global political/financial prediction marketplace, social feed, friend graph, chat system, or native mobile app in MVP.

---

## 6. Market Lifecycle

### 6.1 Main user journey

```text
Connect wallet
      ↓
Create a two-outcome question
      ↓
Set fixed stake and deadline
      ↓
Create market on-chain
      ↓
Share the link
      ↓
Friends choose Option A or B and stake native BOT
      ↓
Deadline passes; market closes to new entries
      ↓
Creator confirms the outcome
      ↓
Contract records final result and fees
      ↓
Winners claim equal shares of the distributable pool

Alternative:
No settlement within timeout
      ↓
Anyone activates refund state
      ↓
Each participant claims their principal back
```

### 6.2 Market fields

Each market must record:

- Market ID.
- Creator wallet.
- Question/title.
- Option A text.
- Option B text.
- Fixed stake per participant in wei.
- Creation timestamp.
- Participation deadline.
- Settlement timeout duration or the versioned global rule used.
- Market status.
- Final outcome if resolved.
- Option A and Option B participant counts.
- Total amount escrowed.
- Fee basis points captured when the market is created.
- Whether the creator has participated as a normal participant.
- Number/amount of claims and refunds, or enough events/state to derive them safely.

Do not store sensitive personal information or confidential group-chat content on-chain. Market text is public, so the UI should advise users not to enter private details.

### 6.3 Market states

Use explicit, tested states such as:

- `Open`: users may join until deadline.
- `AwaitingResolution`: deadline passed; no further entries accepted.
- `ResolvedA`: Option A won.
- `ResolvedB`: Option B won.
- `Refundable`: timeout reached or market void condition met.
- `Completed`: eligible payouts/refunds have been claimed or market is terminal according to contract design.

The exact Solidity enum can differ, but transitions must be explicit and monotonic. No market may return from a terminal state to `Open`.

### 6.4 Create market

Creator supplies:

- Question/title.
- Option A text.
- Option B text.
- Fixed stake amount in BOT.
- Deadline.

Validation:

- All text fields are non-empty and within documented length limits.
- The options are meaningfully distinct text fields and not identical strings after normalization.
- Stake is greater than zero and within a configurable safe maximum.
- Deadline is in the future and within allowed minimum/maximum durations.
- No arbitrary market state is accepted from the client.
- Fee is set by the protocol rules and captured per market; later fee configuration changes must not retroactively alter existing markets.

MVP default deadline choices can include 1 hour, 1 day, 3 days, and 1 week, with appropriate validation. If a custom deadline is offered, enforce the same contract bounds.

Creating a market does not automatically join the creator. The creator must enter their side and stake separately, like any other participant.

### 6.5 Join market

A participant chooses Option A or Option B and sends exactly the required stake amount in native BOT.

Requirements:

- Only open markets may be joined.
- Current block time must be before the deadline.
- The exact stake must be attached; underpayment and overpayment must revert or be safely rejected without trapping funds.
- One wallet may have at most one active position per market in MVP. If the same wallet should be able to add multiple entries in future, treat this as a separate product change.
- Record wallet, side, and stake amount on-chain.
- A wallet cannot choose both sides in the same market under the MVP one-position rule.
- Reject duplicate participation.
- Do not accept entries after the deadline even if the frontend countdown is stale.

### 6.6 Settlement by creator

After the deadline, only the market creator can set the final outcome in MVP.

Requirements:

- Settlement is impossible before the deadline.
- The creator selects exactly one of the two registered options.
- A market can be settled only once.
- Settlement starts the claim period and records the result permanently.
- The contract cannot verify real-world truth; it can only enforce authorised settlement rules.
- Explain this trust assumption on the create screen and market details.
- Do not allow the creator to change the outcome after settlement.

### 6.7 Creator dishonesty and timeout

The creator acting as resolver is an intentional MVP trade-off. Users should only stake in pools where they trust the creator. Do not describe creator settlement as trustless or oracle-verified.

If a market is not settled within 72 hours after its participation deadline, any address may call the timeout/refund transition. After it becomes refundable, each participant can withdraw their own principal. Refunded/voided markets do not pay the settlement fee.

The timeout trigger must be permissionless; it must not depend on the creator being online or on a central backend. The refund amount must be derived from on-chain stake records, and refunds must be protected against duplicate claims.

### 6.8 No-opposing-side / no viable market handling

A market with no participants on one of the two sides should not enter a normal winner-takes-pot settlement. After the deadline, it should be refundable to participants, without protocol fee, so users do not lose value merely because the other side had no participants. This rule must be enforced in the contract, not only in the UI.

### 6.9 Winner payout

After a valid settlement, the distributable pot is the sum of all stakes less the fee captured for that market.

The remaining pot is split equally among participants who chose the winning outcome. The contract must calculate claimable amounts safely and deterministically. If equal stakes are enforced, equal split should be straightforward; still ensure integer division dust cannot become unclaimable or be withdrawn unfairly. Document and test the dust-handling rule.

Losing participants have no payout claim for the settled market. Winner claims are individual pull-based claims; do not attempt to loop through all participants in one settlement transaction.

### 6.10 Fee model

For the MVP, use a small protocol fee applied only to successfully settled markets. A proposed starting default is 0.1% (10 basis points), subject to confirmation before implementation. The on-chain contract must enforce a hard maximum of 5% (500 basis points). The fee rate for a market is captured at creation and cannot be changed retroactively. Void/refunded markets pay no protocol fee.

The UI must show the fee rule before users stake. Document who may withdraw accrued fees and protect that function with access control and tests. Do not add a hidden or changeable fee.

---

## 7. Shareable Market Links

A market must have a stable URL that can be pasted into Telegram, Discord, WhatsApp, X, or other group chats.

Requirements:

- Share link opens the market details page.
- Unconnected visitors can read the question, options, stake, deadline, status, creator address, and pool overview before connecting.
- Joining requires wallet connection and a confirmation step.
- Link previews should use public market title/summary where supported.
- Do not expose private data because the design does not provide private markets.
- Copy-link action must copy the exact market URL.
- A malformed or unknown market ID should show a real not-found/error state.

Do not build a social feed, contacts list, group chat, or friend graph in the MVP. Sharing happens on the user's existing messaging platform.

---

## 8. Portfolio and History

The connected wallet should have a portfolio view with:

- Open positions.
- Settled markets and side chosen.
- Win/loss/refund state.
- Amount staked.
- Claimable amount.
- Claimed amount.
- Refundable amount.
- Claim/refund transaction hash and explorer link where applicable.
- Recent markets.

The portfolio must derive financial state from the contracts/events. Indexed data may make lists faster, but on-chain state remains authoritative for funds and claims.

A win/loss statistic is informational, not a guaranteed predictor of future performance. Do not present projected or hypothetical winnings as realised amounts.

---

## 9. Leaders / Statistics

The MVP includes a simple leaderboards page, matching the reference app's community/leaderboard concept.

Suggested ranking metrics:

- Most settled markets created.
- Most correct outcomes among markets where result is settled.
- Most markets participated in.
- Net realised payout minus stake, where the calculation is reliable and clearly defined.

Do not combine these metrics into an opaque score in MVP. Show separate rankings or a clearly described primary metric. Do not rank unresolved or refunded markets as wins/losses. Avoid showing sensitive data; wallet addresses and public market activity are already public on-chain.

---

## 10. Standard Pages and Routes

The MVP has **6 standard pages/routes**.

### 1. Home
**Route:** `/`

Purpose:
- Explain TrueUp in one clear sentence.
- Show example market and basic protocol mechanics.
- Show active market list/featured markets.
- Show real aggregate activity derived from actual data.
- Provide wallet connection and create-market actions.

### 2. Markets
**Route:** `/markets`

Purpose:
- List markets.
- Filter All / Open / Awaiting Resolution / Resolved / Refundable.
- Show question, stake, deadline, participant count, pool amount, and status.
- Open market details.

### 3. Market Detail
**Route:** `/markets/[marketId]`

Purpose:
- Display the full question, both options, creator, stake, deadline, counts, pool, fee, and lifecycle state.
- Join Option A/B while the market is open.
- Show existing position for the connected wallet.
- Allow creator settlement after the deadline.
- Allow anyone to activate refunds after the timeout.
- Let eligible users claim winnings/refunds.
- Display transaction and explorer links.

### 4. Create Market
**Route:** `/create`

Purpose:
- Create a two-option market.
- Configure stake/deadline within allowed bounds.
- Explain creator-settlement trust assumption and fee before submission.
- Connect wallet and confirm market-creation transaction.

### 5. Leaders
**Route:** `/leaders`

Purpose:
- Show participant/creator rankings from verifiable market activity.
- Filter or tab between clear ranking metrics.
- Link to public wallet activity or portfolio where appropriate.

### 6. Portfolio
**Route:** `/portfolio`

Purpose:
- Show the connected wallet's positions, outcomes, winnings, refunds, and transaction history.
- Provide claim/refund actions for eligible markets.

### Route summary

```text
/                     Home
/markets              Markets
/markets/[marketId]   Market Detail
/create               Create Market
/leaders              Leaders
/portfolio            Portfolio
```

**Total standard pages/routes: 6.**

Wallet-connect prompts, transaction confirmations, network warnings, errors, claim/refund confirmations, loading states, and success receipts should live inside these routes rather than becoming unnecessary standalone pages.

---

## 11. Frontend Instructions

This PRD intentionally contains **no visual design requirements**.

When frontend implementation begins, the building agent MUST read and follow `frontend.md`. That file is the sole source of truth for visual design, layout, typography, spacing, components, responsive behavior, and interaction presentation.

Do not invent design rules in this PRD or override `frontend.md` with ad-hoc visual instructions. Functional behavior, content, route structure, contract interactions, and security rules are defined here.

---

## 12. Smart Contract Architecture

Keep the first contract architecture as small as possible.

### 12.1 Market escrow contract

A single primary contract should handle:

- Market creation and immutable terms.
- Joining with exact native-BOT stake.
- Deadline enforcement.
- Per-market participant records.
- Creator-only result settlement.
- Settlement timeout.
- Refund-state transition.
- Winner payout calculation and claim tracking.
- Refund claim tracking.
- Protocol fee capture and safe withdrawal.
- Events for market creation, joining, settlement, claim, timeout, and refund.

Use a factory/registry contract only if the implementation has a clear reason to separate market instances. Do not over-engineer with a separate contract per market unless required by the design and tested cost/security analysis.

### 12.2 Events

Emit sufficient events to support indexing and transparent activity, including:

- `MarketCreated`
- `ParticipantJoined`
- `MarketSettled`
- `RefundsOpened`
- `WinningsClaimed`
- `StakeRefunded`
- `ProtocolFeeWithdrawn`

Event names can differ, but every important transition must be indexable and include market ID and relevant wallet/amount data where safe.

### 12.3 Pull payments

Use individual claims/refunds rather than a push-payment loop over all participants. Avoid unbounded loops. A creator settling a market should not need to iterate through the full participant array.

### 12.4 Native BOT

The application accepts native BOT via payable transactions for staking. It does not need a token approval flow. All amounts must use integer wei values. Format only at the display boundary and use accurate unit conversion. Never use floating-point math for on-chain amounts.

---

## 13. Security Requirements

Follow standard Solidity/EVM security practices and the BOT Chain builder guidance.

### Contract security

- Checks-effects-interactions.
- Reentrancy protection where appropriate.
- Access control for fee withdrawal and protocol configuration.
- No unbounded loops.
- Exact stake value validation.
- Explicit lifecycle/state-transition validation.
- Deadline checks in contract logic.
- Settlement only by the creator in MVP.
- One-time settlement.
- Winner claims cannot be duplicated.
- Refunds cannot be duplicated.
- Settled markets cannot become refundable.
- Refunded markets cannot be settled.
- Refunded/voided markets do not pay protocol fees.
- Fee cap enforced in contract logic.
- Per-market fee immutability.
- No trapped funds on one-sided/no-participation edge cases.
- Safe accounting for division remainder/dust.
- No reliance on the frontend to enforce critical rules.

### Market and user safety

- Make clear that creator-settled outcomes rely on trust.
- Explain exact stake, total pool, fee, deadline, and refund rule before the join transaction.
- Do not imply that a prediction is objectively verified by the blockchain.
- Warn users that losing-side stakes can be lost when the market is validly settled.
- Do not expose private keys, seed phrases, or unnecessary personal details.
- Prevent market creation with blank/oversized questions, invalid options, zero stakes, or unrealistic deadlines.
- Handle wallet rejection, wrong chain, insufficient balance, pending transaction, revert, and RPC failure.

### Gambling / legal readiness gate

Because participants stake real digital assets and may lose them based on outcomes, do not assume that launch is permitted everywhere. Before mainnet launch with real BOT, conduct appropriate legal and policy review for the operator's intended jurisdictions, age restrictions, contests/gambling classification, consumer protection, sanctions screening if required, and disclosures. Do not claim TrueUp is licensed or compliant unless confirmed by qualified counsel. For a development/demo environment, use testnet BOT and clearly label it as non-mainnet test value.

---

## 14. BOT Chain Configuration and Deployment

The building agent MUST verify current network settings from official BOT Chain docs immediately before deployment. Do not treat this PRD as the permanent source of truth for RPC endpoints or chain configuration.

The current official developer quick guide lists:

### Bohr Testnet
- Chain ID: `968`
- RPC: `https://rpc.bohr.life`
- Native gas/stake asset: BOT (test BOT on testnet)
- Explorer: `https://scan.bohr.life/`
- Faucet: linked from official developer docs

### BOT Mainnet
- Chain ID: `677`
- RPC: `https://rpc.botchain.ai`
- Native asset: BOT
- Explorer: `https://scan.botchain.ai`

Official reference: https://dev-docs.botchain.ai/docs/Developers/quick-guide/

Deployment rules:

- Start on Bohr Testnet.
- Store network settings in environment/config files, not scattered hard-coded constants.
- Validate chain ID before every write transaction.
- Separate testnet and mainnet contract addresses.
- Do not silently fall back from mainnet configuration to testnet.
- Never commit deployer private keys or secrets.
- Verify contracts on the correct explorer where supported.
- Mainnet launch requires full test coverage and legal/security readiness gates.

---

## 15. Technology Expectations

Use ordinary EVM tooling; the coding agent can choose equivalent tools if they are simple, current, testable, and maintainable.

Suggested stack:

- Solidity.
- Foundry or Hardhat.
- TypeScript.
- React/Next.js or equivalent frontend framework.
- viem/wagmi or a maintained EVM wallet connector.
- Indexing/read service for scalable market lists, if needed.
- Lightweight database only for non-authoritative cache/index/search data; on-chain state remains authoritative for stakes and settlement.

Do not add a central backend requirement for basic market creation/settlement if it can be handled on-chain. A backend/indexer may improve read performance, but the product must remain verifiable through contract state/events.

---

## 16. Data and Read Architecture

On-chain data is the financial source of truth. The frontend may cache indexed views for:

- Market discovery.
- Leaderboards.
- User portfolios.
- Market counts and totals.
- Recent activity.

Requirements:

- Read/write transactions against the correct chain and deployed contract.
- Refresh or reconcile state after transaction confirmations.
- Treat indexer delays as pending/stale read data, not proof that the transaction failed.
- Never update final claim or refund state only from a client event before receipt confirmation.
- Provide explorer links from actual transaction hashes.
- Show clear unavailable/error states when RPC/indexing is unavailable.

---

## 17. MVP Non-Goals

Do not implement in the first version:

- Multiple chains.
- ERC-20 stake assets.
- Fiat onramps/offramps.
- AMM or order book.
- Liquidity pools or liquidity providers.
- Odds trading or selling positions.
- Leverage or margin.
- Automated oracle resolution.
- AI-created or AI-resolved markets.
- DAO governance.
- Complex dispute arbitration.
- Chat, followers, or friend graph.
- Private bets marketed as confidential.
- New TrueUp token.
- Referral tokenomics.
- Market categories requiring specialized data or extensive oracle support.
- NFT rewards.
- Native mobile apps.

The MVP should execute the core loop reliably: **create → share → stake → close → settle or refund → claim**.

---

## 18. Milestone Plan

### M1 — Foundation and verification

Deliver:
- Inspect Callout's public flows and current TrueUp requirements.
- Initialize repository and standard EVM/frontend tooling.
- Verify BOT Chain settings from official docs.
- Define Solidity market state model and payout/refund accounting.
- Establish build, lint, format, test, and CI commands.
- Read `frontend.md` before beginning frontend implementation.

### M2 — Escrow and lifecycle contracts

Deliver:
- Market creation.
- Exact native-BOT stake and join logic.
- Deadline enforcement.
- Creator-only settlement.
- 72-hour timeout/refund state.
- Winner payout claim.
- Refund claim.
- Fee config/cap/immutability.
- Unit and fuzz tests for state transitions, amounts, dust, and edge cases.

### M3 — Core frontend flows

Deliver:
- Wallet connection and network switching.
- Markets list.
- Market detail/share page.
- Create flow.
- Join flow.
- Settlement action for creator.
- Refund activation and claims.
- Winner claims.
- Transaction states and explorer links.

### M4 — Portfolio and leaders

Deliver:
- Portfolio positions and history.
- Derived claimable/refundable state.
- Leaders/rankings based on actual resolved markets.
- Indexing/read optimisation if needed.
- Empty/loading/error states for data and wallet operations.

### M5 — Security and testnet release

Deliver:
- Comprehensive contract tests.
- Adversarial tests for double claims, false state transitions, deadlines, exact payment, fee cap, and stuck funds.
- Testnet deployment and verification.
- Full create/join/settle/claim and create/join/timeout/refund end-to-end flows.
- Wallet and wrong-network testing.
- Public test instructions and known-limitations documentation.

### M6 — Real-user pilot

Deliver:
- Invite a small group of real testers to run a series of testnet pools.
- Gather feedback about clarity, settlement trust, deadline choice, and refunds.
- Track transaction volume, user return rate, and success/failure states.
- Publish a genuine build log and short demo.
- Fix high-severity issues before any mainnet consideration.

### M7 — Mainnet readiness and ecosystem launch

Deliver only after readiness gates pass:
- Legal/policy review for intended launch jurisdictions.
- Independent code review and remediation of critical findings.
- Verify deployment and explorer configuration.
- Deploy mainnet contracts and verify them where supported.
- Run a small capped launch and monitor refund/settlement paths.
- Publish user-facing terms, risk disclosure, contract address, and known limitations.
- Share a tutorial/build update with BOT Chain builders.

BOT Labs support is milestone-based; report evidence for each milestone rather than claiming future features or metrics prematurely.

---

## 19. Metrics

Track only values backed by actual events or analytics.

### Activation
- Unique wallet connections.
- Market creation completion rate.
- Share-link opens where measurable.
- Visitor-to-participant conversion.

### Engagement
- Markets created.
- Markets joined.
- Average participants per market.
- Repeat creator/participant rate.
- Resolved markets.
- Median time from deadline to settlement.

### Financial / on-chain
- Total BOT staked.
- Active escrow volume.
- Successful payout claims.
- Total BOT paid to winners.
- Number and total amount of refunds.
- Protocol fees accrued/withdrawn.
- Failed transaction/revert rate.

### Trust and reliability
- Markets entering timeout/refund state.
- Markets not settled by creators.
- Support reports about disputed outcomes.
- Duplicate claim/refund attempts blocked.
- Contract errors and RPC/indexer availability.

Do not use staked volume alone as a vanity success metric. Healthy activity and repeat use matter more than encouraging larger stakes.

---

## 20. Definition of Done

The MVP is complete only when:

- [ ] The frontend is deployed to a working URL.
- [ ] Contracts are deployed to BOT Chain testnet and verified where supported.
- [ ] Wallet connection works.
- [ ] Wrong-chain and insufficient-balance states work.
- [ ] Users can create valid two-option markets.
- [ ] Market creator does not automatically join.
- [ ] Users can join a market with the exact stake before deadline.
- [ ] Joining after deadline is rejected by contract.
- [ ] Market stake is held in contract escrow.
- [ ] Creator can settle only after deadline and only once.
- [ ] Winning positions can claim the calculated payout once.
- [ ] A market with one empty side enters refundable state after deadline.
- [ ] Timeout/refund transition can be triggered permissionlessly after the deadline plus 72 hours.
- [ ] Each participant can refund their principal at most once.
- [ ] Refunded/voided markets do not pay protocol fees.
- [ ] Protocol fee cap and per-market fee capture are enforced on-chain.
- [ ] Dust/remainder behavior is documented and tested.
- [ ] Portfolio displays actual positions and settlement/claim status.
- [ ] Leaders page excludes unresolved/refunded outcomes from win metrics.
- [ ] Market links can be shared and opened by disconnected users.
- [ ] All six standard routes work.
- [ ] Critical contract paths have automated tests.
- [ ] The README includes the one-sentence pitch, problem, architecture, setup/run steps, deploy instructions, threat model, and limitations.
- [ ] Demo video is prepared (2–4 minutes).
- [ ] Real test users have exercised both settlement and refund flows.
- [ ] No fake balances, markets, users, transactions, or usage metrics are present.
- [ ] Mainnet readiness and legal/policy gates are documented before public real-stake launch.
- [ ] Git history reflects genuine, continuous progress.

---

## 21. Git Commit Rules

Git commits are a required part of the development process.

During the build, commit changes continuously instead of waiting until the entire project is finished.

### Commit Frequency

For a normal build, aim for **50+ meaningful commits** across the development process.

Do NOT create 50 meaningless commits just to reach the number. Every commit should represent a real, completed development step.

Make a commit whenever you complete a logical unit of work, such as:

- Creating a new page
- Creating or modifying a component
- Adding a feature
- Implementing an API endpoint
- Adding database functionality
- Adding authentication logic
- Adding validation
- Adding error handling
- Connecting frontend to backend
- Adding a utility/helper
- Adding a configuration
- Refactoring a specific section
- Fixing a bug
- Improving an existing feature
- Adding tests
- Fixing failing tests
- Improving responsiveness
- Fixing accessibility issues
- Updating documentation
- Completing a route
- Completing a major UI section
- Integrating an external service

### Commit Process

After completing each logical development unit:

1. Check the current changes.
2. Verify that the changes work.
3. Stage only the relevant files.
4. Create a descriptive commit.
5. Continue building from the committed state.

Use conventional commit messages where appropriate:

- `feat: add market creation`
- `feat: add wallet connection`
- `feat: implement BOT escrow contract`
- `feat: add winner claims and refunds`
- `fix: reject entries after deadline`
- `refactor: simplify market state transitions`
- `test: add refund timeout tests`
- `style: improve mobile market details` 
- `docs: update setup instructions`

### Important Rules

- Do NOT wait until the end of the project to commit everything.
- Do NOT make one giant commit containing the entire project.
- Do NOT create fake changes solely to increase the commit count.
- Do NOT repeatedly modify and commit the same thing without a meaningful reason.
- Keep commits small, focused, and logically separated.
- Before moving to the next major feature, make sure the previous feature has been committed.
- If a task contains several independent steps, commit each completed step separately.
- If you encounter and fix a bug during development, commit the fix separately.
- If you make a meaningful refactor, commit it separately.

### Target

For a substantial project, aim for **50+ meaningful commits by the time the build is complete**, distributed naturally throughout development.

The commit history should clearly show the progression of the project from initial setup → individual features → integrations → fixes → testing → polish → final state.

At the end of the build, run `git log` and verify that the history accurately reflects the development process.

---

## 22. Build Rules for the Coding Agent

1. Read this PRD completely before coding.
2. Review the publicly accessible Callout user flows for inspiration, but implement TrueUp under its own branding and codebase.
3. Read `frontend.md` before frontend implementation and follow it as the sole source of truth for design.
4. Do not add design requirements to this PRD.
5. Verify BOT Chain configuration from official developer documentation before deployment.
6. Keep the MVP focused on the core two-outcome market lifecycle.
7. Do not assume Callout's existing contract or address should be reused. Deploy and verify TrueUp's contracts independently.
8. Never fake market volume, users, balances, claims, fees, or leaderboard activity.
9. Test every financial edge case, including fee handling, a one-sided market, division dust, expired deadlines, timeout refunds, and duplicate claims.
10. Make clear that the creator is the MVP outcome resolver and that this design relies on participant trust.
11. Do not launch real-stake mainnet pools until relevant legal/policy and security readiness has been reviewed.
12. Follow the Git Commit Rules throughout development.
13. Document trust assumptions, security limitations, and deployment configuration.
14. Before completion, check every Definition of Done item.
15. Run `git log` at the end and verify that commit history reflects real development progress.

---

## 23. Final Positioning

> **TrueUp is a simple, on-chain way for friends to put BOT behind a two-outcome prediction, settle the result, and split the pot transparently.**

The first release should prove one complete loop:

**Create → Share → Join → Deadline → Settle or Refund → Claim.**

TrueUp should compete through clarity, reliability, shareability, and fair contract behavior—not through complicated market mechanics or speculative token features.
