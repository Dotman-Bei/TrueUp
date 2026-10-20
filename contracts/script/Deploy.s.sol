// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {TrueUp} from "../src/TrueUp.sol";

/// Deploys TrueUp.
///
///   OWNER      address that may change the fee for new markets and withdraw fees (required)
///   FEE_BPS    fee for new markets in basis points, default 10 (0.1%), max 500
///   MAX_STAKE  largest stake a new market may set, in wei, default 100 BOT
///
/// Bohr testnet (chain 968):
///   forge script script/Deploy.s.sol --rpc-url bohr --account <keystore-name> --broadcast --verify
/// Never pass a raw private key on the command line or commit one; use a Foundry keystore
/// (`cast wallet import <name> --interactive`).
contract Deploy is Script {
    function run() external returns (TrueUp trueUp) {
        // Refuse anything but the two BOT Chain networks and a local node, so a mis-set RPC can't
        // deploy somewhere unintended.
        require(block.chainid == 968 || block.chainid == 677 || block.chainid == 31337, "unexpected chain");

        address owner = vm.envAddress("OWNER");
        uint256 rawFee = vm.envOr("FEE_BPS", uint256(10));
        require(rawFee <= 500, "FEE_BPS above the 5% cap");
        // forge-lint: disable-next-line(unsafe-typecast)
        uint16 feeBps = uint16(rawFee); // checked above
        uint256 maxStake = vm.envOr("MAX_STAKE", uint256(100 ether));

        vm.startBroadcast();
        trueUp = new TrueUp(owner, feeBps, maxStake);
        vm.stopBroadcast();

        console2.log("TrueUp deployed at", address(trueUp));
        console2.log("chain id", block.chainid);
        console2.log("deploy block", block.number);
        console2.log("owner", owner);
        console2.log("fee bps", feeBps);
    }
}
