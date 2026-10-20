# FRONTEND.md — TrueUp

The PRD names this file as the only source of truth for visual design, layout, type, spacing, components,
responsive behaviour and interaction presentation. Functional behaviour, contract rules and routes stay
in `TrueUp_PRD.md`. Where the two seem to disagree on behaviour, the PRD wins. On how something looks,
this file wins.

The decisions below come from the `design-taste-frontend` skill. It dealt the direction
**"The page is the object"** (seed 166688980) for the home page and the app style **"True-black flat"**
(seed 1538893221) for the five working routes. Both keep one palette and one typeface.
The full sheets are in `.taste-skill/direction.json` and `.taste-skill/app/direction.json`.

---

## 1. Who it is for, and what each page drives

TrueUp is for people in a group chat who want a small amount of BOT behind a two-sided question.
They are friends, student groups, creator and Web3 communities, and small event organisers. Most arrive
from a pasted link, on a phone, already holding the question in their head. They usually know
roughly what a wallet is. They do not want to learn what a prediction market is.

| Route | Who opens it | The one action it drives |
| --- | --- | --- |
| `/` Home | A first-time visitor, often from a builder update or a shared link | **Create a market** |
| `/markets/[id]` Market detail | A friend who tapped the link in a chat | **Pick a side and stake** (creator: **Confirm the result**; anyone after timeout: **Open refunds**; winner: **Claim**) |
| `/markets` Markets | A repeat participant looking for open pools | **Open a market** |
| `/create` Create | An organiser with a question | **Create market** (one transaction) |
| `/portfolio` Portfolio | A participant after a deadline | **Claim** what is claimable |
| `/leaders` Leaders | A curious community member | **Open a wallet's record** |

---

## 2. Visual direction

### 2.1 Thesis

**TrueUp is printed on the slip.** "True up" is the bookkeeping term for the last reconciliation, the
slip that settles who owes whom. A bet between friends has its own paper form: the question, two sides,
the stake, the deadline. Every TrueUp surface is cut from that stationery. The home page opens on the
slip itself, the process is printed as an itinerary, and the payout is a receipt that adds up. On the
market page the slip carries the question with its two tear-off stubs, one per side. The slips are
bone-coloured paper with walnut ink. They lie on a dark walnut table, beside archival photographs of
1904 Olympic tug-of-war matches: two teams on one rope, with judges standing in the middle to call
the result. That picture is the product and its trust model. Two sides, one rope, and someone you
trust calling it.

**The idea sentence.** On this page, *the true-up slip, the reconciliation that settles who owes whom*
becomes *the stationery every section is printed on*.

**The live thing (home).** *Split the pot*. The visitor sets the stake and how many friends are on each
side, and picks the side that wins. The receipt recomputes the stakes, the 0.1% fee, the
distributable pot and the share each winner claims, using the contract's integer arithmetic. If either
side has nobody on it, the receipt turns into a refund with no fee.

**The signature element (app).** *The rope.* A market's participants are drawn as one horizontal bar
split between Side A and Side B, with a small flag at the split point. It shows how a pool leans at a
glance, on the market page, in list rows and in the portfolio.

### 2.2 Palette

Two flat inks and the table they lie on: a two-colour print job. No gradients, no glows. The tan is
the only accent.

**Page tokens (home):**

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#2b2216` | Walnut table: the page ground |
| `--surface` | `#382d1e` | One tone step up: notes, quiet fields |
| `--ink` | `#e4e2da` | Bone: running text on walnut |
| `--muted` | `#a39a8b` | Secondary text on walnut (never under 16px for body) |
| `--accent` | `#bda38b` | Tan: the one button fill on walnut, Side B |
| `--accent-ink` | `#2b2216` | Text on tan |
| `--paper` | `#e4e2da` | The slip: paper colour |
| `--paper-ink` | `#2b2216` | Walnut ink printed on the slip |
| `--paper-muted` | `#5c4f3e` | Secondary ink on the slip (≥ 6:1 on paper) |
| `--field-1` / `--field-1-ink` | `#bda38b` / `#1c150d` | The one tan section field (the showcase) |

**App tokens (the five routes).** Elevation comes from lightness alone: no borders on cards, no shadows.

| Token | Value | Use |
| --- | --- | --- |
| `--ground` | `#241c12` | Shell, sidebar, top bar and canvas: one ground |
| `--surface` | `#30261a` | Cards (one lightness step) |
| `--raised` | `#3d3122` | Nested panels, hover rows, the selected side |
| `--rule` | `#3a2e20` | 1px structural rules (top bar, sidebar edge, table rows) |
| `--control` | `#6a5a45` | Input and outlined-button borders |
| `--text` | `#ece9e1` | Primary text |
| `--muted` | `#c2b8a6` | Secondary text |
| `--faint` | `#ab9f8b` | Meta (≥ 4.5:1 on `--raised`) |
| `--primary` / `--primary-ink` | `#ece9e1` / `#241c12` | The primary action, by inversion: bone fill, walnut label |
| `--side-a` | `#ece9e1` | Side A data marks (bone) |
| `--side-b` | `#bda38b` | Side B data marks (tan): the one data hue |
| `--positive` | `#a8cf8e` on pill `#2c3520` | Won, claimed, confirmed |
| `--negative` | `#f0a08a` on pill `#47251b` | Lost, reverted, failed |
| `--warning` | `#e8c46e` on pill `#40331a` | Wrong network, waiting on creator, timeout near |
| `--neutral pill` | `#3d3122` / `#ece9e1` | Open, refunded, awaiting |

Colour budget on app screens: under 3% of pixels. Tan appears on Side B marks and the rope's flag,
never on buttons, tabs or nav. The primary button is bone, by inversion.

### 2.3 Type

One family, **Switzer** (Fontshare, weights 400/500/600), loaded with `display=swap` and a system
fallback. No second face, no monospace (addresses and hashes use Switzer with tabular figures).

Home steps (five sizes, nothing in between):

| Step | Size | Setting |
| --- | --- | --- |
| display | `clamp(2.75rem, 1rem + 5.4vw, 6rem)` | 600, −0.04em, leading 0.95. Slip title, stats total uses its own giant figure size `clamp(7rem, 16vw, 17rem)` |
| head | `clamp(2rem, 1.3rem + 3.2vw, 4rem)` | 600, −0.035em, leading 1.0 |
| lead | `clamp(1.25rem, 1.1rem + 0.7vw, 1.625rem)` | 500, −0.01em, leading 1.3 |
| body | `clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)` | 400, −0.005em, leading 1.5 |
| small | `clamp(0.8125rem, 0.79rem + 0.1vw, 0.875rem)` | 400, leading 1.45 |

App scale: 12 / 14 / 16 / 24, plus 32 for the one answer figure per screen. Title 24/600, card title
16/600, body 14/20, meta 12. Tabular figures on every number.

### 2.4 Spacing

A 4px base: `4 8 12 16 24 32 48 64 96 128 192`.

- Page margin: `clamp(16px, 2.2vw, 32px)`, the same on both sides at every width. The app shell uses
  29px canvas padding on desktop and 16px on phones.
- Grid: 12 columns, gutter `clamp(12px, 1.4vw, 24px)`.
- Section gap on home: 128–192px desktop, 80–96px phone.
- App: one gap value of **16px** horizontally and vertically, card padding 20px, rows 52px
  (single-line) and 72px (two-line), controls 36px tall (44px on phones).
- Radius: **0** on the home page (slips have cut edges, not rounded ones). On app screens, 4px on cards
  and controls. The skill's style deals a pill primary button. TrueUp overrides this so the product has
  one button shape, and states that override here.

### 2.5 Motion

- Tokens from the skill: `--ease-out` `cubic-bezier(.22,1,.36,1)`, `--ease-expo`
  `cubic-bezier(.16,1,.3,1)`, `--ease-in-out` `cubic-bezier(.76,0,.24,1)`, press 140ms, hover 180ms,
  UI 240ms, reveal 800ms.
- **Signature (home): the pinned slip.** The hero slip sits over the photograph. As you scroll, the
  photograph darkens and drifts (under 8% travel) while the slip rises and settles. The *Open right
  now* deck holds its heading for at most two screens while market cards slide in and fold into
  spines.
- Home entrances: inside each section, the heading arrives first, then the text, then the slip or the
  picture. Each rises 16–28px with opacity, staggered 70–90ms, and plays once. The slip rows print
  one by one (50ms apart). The total on the receipt counts once.
- App screens: no entrances. Motion is feedback only: press (scale .97), hover tone step, a menu or
  sheet opening (240ms), a row arriving after a confirmed transaction, and a pending transaction's
  status changing.
- Every move has a `prefers-reduced-motion` fallback that keeps the final state. Content is visible
  without JavaScript: hidden states apply only under `html.js`.

---

## 3. Pages and sections, in build order

Build order: **Home → Market detail → Markets → Create → Portfolio → Leaders**. The app shell is
built with Market detail and shared after that.

All financial figures come from the contract or its events. When the contract address is not
configured, every data block shows its frame and one honest sentence. It never shows numbers. A
development-only fixture source (`NEXT_PUBLIC_DATA_SOURCE=fixtures`, refused in production builds) exists so
layouts can be checked at real density. It prints a permanent notice: "Fixture data for layout checks.
Nothing here is on-chain."

### 3.1 Home `/`

**Nav (plain bar on the photograph, page margins):** wordmark `TrueUp` · Markets · Leaders ·
Portfolio · [Connect wallet]. On a phone: wordmark and *Menu*. Menu opens a full-screen sheet.

**Hero: the slip over the field.** The tug-of-war photograph fills the first screen, darkened. Centred
on it is the slip: bone paper, walnut ink, about 55% of the width. A notch is cut into each side
(`clip-path`) and a perforation of round dots runs above the bottom strip.

- h1, spread along the slip's top edge: **Bets · between · friends**
- Supporting sentence, under it: *TrueUp is a two-outcome prediction pool on BOT Chain. Everyone stakes
  the same amount, the creator calls the result, and the winners split the pot.*
- The facts, set like the slip's body. This is the PRD's example market:
  - *Will Maya finish the 5K on Saturday?*
  - *She finishes / She does not finish*
  - *0.2 BOT each · closes Saturday 18:00 UTC*
- Bottom strip, left: *Example slip · Bohr testnet, test BOT only*. Centre: **Create a market**
  (button). Right: *Browse markets* (link).

**Section 1. Itinerary on a slip: "Question to payout"**
Paragraph: *One contract holds every stake from the moment someone joins. Nobody can move the pot, the
creator included, except by these rules.*

The slip, grouped under time headings, with what happens on the left and when or what on the right:

- **Before the deadline**
  - Write the question and its two sides ··· under a minute
  - Set the stake and the deadline ··· 1 hour to 1 week
  - Create it on BOT Chain ··· one transaction
  - Paste the link in your group chat ··· any app
  - Friends pick a side and stake ··· the exact amount
- **At the deadline**
  - Entries close ··· enforced by the contract
  - A pool with an empty side turns refundable ··· no fee
- **After the deadline**
  - The creator confirms the result ··· once, final
  - The 0.1% fee leaves the pot ··· settled pools only
  - Winners claim equal shares ··· whenever they like
- **72 hours on, if nobody settled**
  - Anyone opens refunds ··· no permission needed
  - Everyone takes their stake back ··· in full
- Inverted last row: **You end with a winner's share or your stake back**

**Section 2. Square plate, spare text: "How a pool ends"** (tan field)
Left: a square, cropped piece of the real market interface (`data-ui`) showing the state of the
selected tab. It is drawn on a slip with a notch. Right: tabs **Settled · Refunded · One-sided**.

- *Settled.* **The creator calls it.** After the deadline, only the person who created the market can
  pick the winning side, and only once. The contract can't check the real world, so join pools made by
  people you trust.
- *Refunded.* **Nobody calls it.** If the creator hasn't settled 72 hours after the deadline, anyone
  can open refunds. Each person takes back exactly what they staked, and no fee is charged.
- *One-sided.* **Nobody took the other side.** If everyone picked the same side, there is nobody to win
  from. The pool becomes refundable at the deadline, without a fee, and the contract enforces it.

Action cells: **Create a market** (walnut) · **Read the questions** (one tone off the field, links to the FAQ).

**Section 3. Cards that fold into spines: "Open right now"**
The open markets, read from the contract and sorted by soonest deadline (up to 6). Each card shows the
question (title), the line *She finishes 4 · She does not finish 3 · 1.40 BOT pooled*, and along the
foot *Closes in 2 d 4 h* with *Open market* on the right. Under the band is a line of real aggregates:
*{open} open · {created} created · {staked} BOT staked · {settled} settled · {refunded} refunded*, then
*All markets*.

- 0 open markets: *Nobody has an open question right now.* with **Create a market**.
- Contract not configured: *Markets appear here once the TrueUp contract is live on Bohr testnet.*
- RPC failure: *Couldn't reach BOT Chain. Retry.*

**Section 4. Total and its receipt: "Split the pot"** (the live thing)
Note: *Set the stake and how your group splits. The receipt uses the contract's own arithmetic.*
Controls: stake (0.05 / 0.1 / 0.2 / 0.5 / 1 BOT), *On “She finishes”* stepper, *On “She does not
finish”* stepper, and *Who won?* (She finishes / She does not finish). The giant figure is each
winner's payout (*0.3497*). Caption: *BOT to each of 4 winners, from a 1.40 BOT pot.*
Receipt rows:
- **Stakes**: She finishes · 4 × 0.2 → 0.8000; She does not finish · 3 × 0.2 → 0.6000; Pot → 1.4000
- **Settlement**: Protocol fee 0.1% → −0.0014; Distributable → 1.3986
- **Split**: Winning side → She finishes; Winners → 4; Each winner → 0.349650; Net gain per winner → +0.149650
- Inverted: **Each winner claims 0.349650 BOT**

If either side is at 0: the Settlement group reads *Refundable · no fee*, and the inverted row reads
**Everyone gets their 0.2 BOT back**.

**Section 5. Answers as reading text: "Fair questions"**
Each answer runs straight on from its question, in two columns:

- **Who decides the result?** The person who created the market. TrueUp records their decision on BOT
  Chain, but the chain can't check whether it is true. Only stake in pools where you trust the creator.
- **What if they never settle?** Seventy-two hours after the deadline, anyone can open refunds. Every
  participant then takes back exactly what they staked.
- **What does it cost?** A 0.1% protocol fee on the pot of settled markets. It is fixed when the market
  is created, the contract caps it at 5%, and refunded markets pay nothing. You also pay network gas in BOT.
- **What if nobody takes the other side?** There is no one to win from, so the market turns refundable
  at the deadline, with no fee.
- **Can I lose my stake?** Yes. If the market is settled and your side lost, your stake goes to the
  winners.
- **Can I switch sides or join twice?** No. One wallet holds one position per market, chosen once.
- **Does the creator join their own market?** Not automatically. They pick a side and stake like
  anyone else.
- **Can I join after the deadline?** No. The contract rejects late entries even if a countdown on your
  screen is behind.
- **Is my market private?** No. The question, the sides, every wallet and every stake are public on
  BOT Chain. Keep names and private details out of the question.
- **What happens to rounding dust?** Payouts are calculated in wei. Any remainder that can't be split
  equally is handled by a documented contract rule. It is never left stuck in the pool.
- **Is this real money?** Not yet. TrueUp runs on Bohr testnet, and test BOT has no value. Mainnet
  waits on a legal and security review.
- **Which wallet do I need?** Any EVM wallet that can add a network. TrueUp asks to switch to Bohr
  testnet (chain 968) before every transaction.
- **Is there a TrueUp token?** No. Stakes, payouts and gas are all native BOT.

**Section 6. A sentence with a blank**
*Ask the group* [ will Maya finish the 5K? ] **Put it up**
Under it: *Opens the create form with your question filled in. Nothing happens on-chain until you
confirm in your wallet.*

**Footer. Photograph half, menu half**
Left: a hard crop of the rope and the pullers. Right, on walnut: wordmark, then the menu at large size:
Markets · Create · Leaders · Portfolio · How it works · Questions. Two blocks:
*Network: Bohr testnet, chain 968, explorer scan.bohr.life* and *Contract: {address linked to the
explorer, or "Not deployed yet"}*. Picture credits on one line. Legal line: *Testnet only. Test BOT
has no value. TrueUp is not licensed for real-stake use, and mainnet waits on legal and security review.*

### 3.2 App shell (shared by the five routes)

Ruled T-frame on one walnut ground:

- **Sidebar, 224px:** the TrueUp mark (a slip notch drawn in bone, with the wordmark), then nav on a
  34px pitch: Markets, Create, Leaders, Portfolio. The active item's label goes from muted to bone. At
  the bottom: *Home* and the network line *Bohr testnet · 968*.
- **Top bar, 64px, 1px rule under it.** Left: the back link and object name on detail pages, or a
  market search on lists. Right, behind a full-height divider, the wallet: *Connect wallet* (primary),
  or `0x3f…9a2c · 4.82 BOT` with a menu (Copy address, View on explorer, Disconnect).
- **Network states** sit in the top bar beside the wallet. Wrong network shows a warning pill *Wrong
  network* and a **Switch to Bohr** button. No contract shows a quiet notice in each data block.
- **Phone:** a 56px top bar with the mark, the page name and the wallet's short form, plus a bottom
  bar of four destinations (Markets, Create, Leaders, Portfolio) with labels.

### 3.3 Market detail `/markets/[marketId]`

**Question:** *Can I trust this, and which side am I on?*
- **The slip header:** bone paper on walnut, with notches. The h1 is the question at 24–32px. Meta:
  *Created by 0x3f…9a2c · closes Sat 25 Oct, 18:00 UTC (in 2 d 4 h)*. Status pill. Copy link.
  The two stubs show *Side A: She finishes, 4 people, 0.80 BOT* and *Side B: She does not finish,
  3 people, 0.60 BOT*.
- **The rope:** a full-width split bar under the stubs, with *1.40 BOT in the pool · fee 0.1% (captured
  at creation)*.
- **The action panel** (right column on desktop, directly under the slip on phones) changes with state:
  - Open, not joined: choose a stub, then the **confirm sheet** with: *You stake exactly 0.2 BOT on
    “She finishes”. Pool now 1.40 BOT. If your side wins you share the pot minus 0.1%. If it loses, your
    stake goes to the winners. The creator, 0x3f…9a2c, decides the result after Sat 18:00 UTC. If they
    don't within 72 hours, anyone can open refunds.* Then [Stake 0.2 BOT].
  - Open, joined: *You're on “She finishes” with 0.2 BOT.* with the join transaction link.
  - Awaiting result, creator: **Confirm the result**: pick a side, then confirm: *This is final and
    can't be changed.*
  - Awaiting result, others: *Waiting on 0x3f…9a2c. Refunds open to anyone at Tue 28 Oct, 18:00 UTC
    (in 2 d 20 h).*
  - Timeout passed: **Open refunds** (anyone).
  - Resolved: winner → **Claim 0.349650 BOT**. Loser → *Your side lost. Nothing to claim.* Claimed →
    the amount and transaction link.
  - Refundable: **Claim refund 0.2 BOT** / refunded amount and link.
  - Transaction states inline: *Confirm in your wallet* → *Pending, waiting for BOT Chain* (hash link)
    → *Confirmed* (receipt row), or *Rejected in wallet* / *Reverted: {reason}* / *Not enough BOT for
    stake and gas*.
- **Terms card:** stake, deadline, settlement timeout (72 h), fee bps, creator, contract, market ID.
- **Participants:** wallet, side, time and join-transaction link. Capped at 8 rows, then *Show all 23*.
- Not found: *There's no market #4410 on this contract. Check the link, or browse open markets.*

### 3.4 Markets `/markets`

**Question:** *What can I still join?*
- h1 *Markets*, with the subline computed from the rows: *14 open, 3 waiting on a result, 2
  refundable*. Primary: **Create a market**.
- Underline tabs: All · Open · Awaiting result · Resolved · Refundable (with counts).
- Toolbar: search the question text, total count, sort (Closing soonest / Newest / Largest pool).
- Table: Question (with the rope under it), Stake, People, Pool, Deadline, Status. Phone: two-line
  rows (*question / 0.2 BOT · 7 people · 1.40 BOT · closes in 2 d*) with the status pill on the right.
- *Load 25 more* at the end, with *1–25 of 61*.
- Empty filter: *No refundable markets. Good news for everyone.*

### 3.5 Create `/create`

**Question:** *Is my market right before I pay gas?*
- h1 *New market*. Subline: *Creating doesn't stake for you. Join your own market afterwards if you
  want a side.*
- Left: the form. Question (max 140 characters, with a counter). Side A and Side B (max 48 each; they
  must differ). Stake in BOT (min 0.001, max 100, set in config). Deadline as chips *1 hour · 1 day ·
  3 days · 1 week · Custom* (custom: date and time, 1 hour to 30 days).
- Right: **the live slip**, exactly as friends will see it, updating while you type, with the rope
  empty.
- Before the button, a terms block: *You decide the result after the deadline. Participants have to
  trust you. If you don't settle within 72 hours, anyone can refund everyone. A 0.1% fee comes out of
  settled pots. Everything you type is public on BOT Chain.*
- **Create market** → wallet → pending → success: *Market #{id} is live.* with **Copy link**, the link
  itself, **Open market** and **Pick your side**.

### 3.6 Portfolio `/portfolio`

**Question:** *Is there anything for me to claim?*
- Not connected: frame kept, *Connect a wallet to see your positions*, with the primary button.
- h1 *Portfolio*, with the address and *View on explorer*.
- Lead figure (32px): **Claimable now: 0.749300 BOT**, with the subline *from 2 markets* and a
  **Claim all** queue (one transaction per market, done in turn).
- Strip: Staked in open markets · Won (claimed) · Refunded · Record *4 won · 2 lost · 1 refunded*.
  The record is labelled *Past results don't predict future ones.*
- **Needs action** (claims and refunds) comes first, then **Open positions** (with the rope and the
  side you're on), then **History** (each settled or refunded market with its outcome, amount staked,
  amount claimed or refunded, and the transaction link).

### 3.7 Leaders `/leaders`

**Question:** *Who calls it right, and who runs the pools?*
- h1 *Leaders*. Subline: *From settled markets on this contract only. Refunded and open markets don't count.*
- Underline tabs, one per metric, never blended:
  - *Correct calls*: winning positions in settled markets (with *of N settled*)
  - *Markets settled*: markets created and then settled by this wallet
  - *Markets joined*: positions taken
  - *Net result*: claimed payouts minus stakes in settled markets, in BOT, signed
- Each tab carries a one-line definition. Table: rank, wallet (short, with an explorer link), the value
  (right-aligned), and a secondary figure. Top 50. Your wallet is pinned if connected.

---

## 4. Components

| Component | Desktop | Phone |
| --- | --- | --- |
| **Slip** (paper card, notched sides, perforated foot) | Centred or offset, 420–900px wide, 32px padding | Full width minus 16px margins. Notches kept. 20px padding |
| **Itinerary/receipt rows** (left text, dotted leader, right value) | One line, 16px, tabular figures | Long left text wraps under itself. The value stays right |
| **Rope** (Side A / Side B split bar, flag at the split) | 8px tall, labels above both ends | Same, full width |
| **Stubs** (two sides of a market) | Side by side at the slip's foot | Side by side down to 360px, then stacked |
| **Button** | Square, 48px (page) / 36px (app). Primary is a solid fill (tan on walnut page, bone in app). Secondary is a text link | 48px / 44px, full width in sheets |
| **Status pill** | 22px, 12px text, pale-on-dark pairs from §2.2 | Same |
| **Tabs** | Underline on a 1px rule, 2px bone indicator | Scroll sideways in their own row |
| **Table** | 12px grey sentence-case header, 52px rows, numbers right | Two-line rows. Fields move to line 2, never dropped |
| **Confirm sheet** | Inline panel in the action column | Bottom sheet over a 60% walnut scrim (shadow allowed: it floats) |
| **Transaction status** | Inline line under the action: wallet → pending (hash) → confirmed / failed | Same |
| **Wallet button and menu** | In the top bar behind the divider | Short form in the top bar. The menu is a sheet |
| **Stepper** (live receipt, create) | 44px − / value / + | Same |
| **Empty / error / loading** | Frame and header kept, one sentence. Loading uses flat bars at the real size, without shimmer | Same |
| **Fixture notice** (dev only) | Warning pill pair under the top bar | Same |

---

## 5. Avoid

- A centred hero with a pill badge above the headline, two buttons and a screenshot under it.
- Purple/indigo "crypto" palettes, neon on black, gradients, glows, glass panels and blurred nav.
- Rows of icon-topped feature cards, and three-up "Create / Share / Win" tiles.
- Small uppercase letter-spaced labels, eyebrows, `01 / 02 / 03`, and monospace for addresses.
- Hairline dividers and outlined boxes on the home page. Slips are filled shapes with cut edges.
- Invented numbers: user counts, volume, "10,000+ markets", testimonials, partner logos, fake
  leaderboards. A zero prints as 0. Missing data prints as a dash.
- KPI tiles with icons in tinted circles, sparklines and green "+12%" pills.
- Calling settlement "trustless", "oracle-verified" or "provably fair", or calling markets "private".
- Showing a pending transaction as done, or updating a claim before the receipt confirms it.
- Stock genre words: unlock, seamless, effortless, revolutionary, next-gen.
