// Copies the compiled TrueUp ABI from contracts/out into web/src/lib/abi.ts.
// Run after `forge build` in contracts/:  node web/scripts/sync-abi.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const artifact = JSON.parse(readFileSync(join(root, "contracts", "out", "TrueUp.sol", "TrueUp.json"), "utf8"));
const header = `/*
 * GENERATED from contracts/out/TrueUp.sol/TrueUp.json by web/scripts/sync-abi.mjs. Do not edit by hand.
 * Sides: 1 = Option A, 2 = Option B (0 = none).
 * Status: 0 Open, 1 ResolvedA, 2 ResolvedB, 3 Refundable. "Awaiting result" is derived from time.
 */
`;
writeFileSync(join(root, "web", "src", "lib", "abi.ts"), `${header}export const trueUpAbi = ${JSON.stringify(artifact.abi, null, 2)} as const;\n`);
console.log(`wrote ${artifact.abi.length} ABI entries`);
