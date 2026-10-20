/*
 * The interface the frontend expects from the TrueUp escrow contract (PRD section 12).
 * The contract is written in milestone M2; if its final ABI differs, change it here and in
 * src/lib/data/chain.ts only. Sides: 1 = Option A, 2 = Option B (0 = none).
 * Status: 0 Open, 1 ResolvedA, 2 ResolvedB, 3 Refundable. "Awaiting result" is derived from time.
 */
export const trueUpAbi = [
  { type: "function", name: "marketCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "feeBps", stateMutability: "view", inputs: [], outputs: [{ type: "uint16" }] },
  {
    type: "function",
    name: "getMarket",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "creator", type: "address" },
          { name: "question", type: "string" },
          { name: "optionA", type: "string" },
          { name: "optionB", type: "string" },
          { name: "stake", type: "uint256" },
          { name: "createdAt", type: "uint64" },
          { name: "deadline", type: "uint64" },
          { name: "settlementTimeout", type: "uint64" },
          { name: "status", type: "uint8" },
          { name: "countA", type: "uint32" },
          { name: "countB", type: "uint32" },
          { name: "totalEscrow", type: "uint256" },
          { name: "feeBps", type: "uint16" },
          { name: "creatorJoined", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "positionOf",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [
      { name: "side", type: "uint8" },
      { name: "claimed", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "createMarket",
    stateMutability: "nonpayable",
    inputs: [
      { name: "question", type: "string" },
      { name: "optionA", type: "string" },
      { name: "optionB", type: "string" },
      { name: "stake", type: "uint256" },
      { name: "deadline", type: "uint64" },
    ],
    outputs: [{ name: "marketId", type: "uint256" }],
  },
  { type: "function", name: "join", stateMutability: "payable", inputs: [{ name: "marketId", type: "uint256" }, { name: "side", type: "uint8" }], outputs: [] },
  { type: "function", name: "settle", stateMutability: "nonpayable", inputs: [{ name: "marketId", type: "uint256" }, { name: "outcome", type: "uint8" }], outputs: [] },
  { type: "function", name: "openRefunds", stateMutability: "nonpayable", inputs: [{ name: "marketId", type: "uint256" }], outputs: [] },
  { type: "function", name: "claimWinnings", stateMutability: "nonpayable", inputs: [{ name: "marketId", type: "uint256" }], outputs: [] },
  { type: "function", name: "claimRefund", stateMutability: "nonpayable", inputs: [{ name: "marketId", type: "uint256" }], outputs: [] },
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "stake", type: "uint256", indexed: false },
      { name: "deadline", type: "uint64", indexed: false },
      { name: "feeBps", type: "uint16", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ParticipantJoined",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "account", type: "address", indexed: true },
      { name: "side", type: "uint8", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MarketSettled",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "outcome", type: "uint8", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RefundsOpened",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "by", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "WinningsClaimed",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "account", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "StakeRefunded",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "account", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;
