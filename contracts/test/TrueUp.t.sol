// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {TrueUp} from "../src/TrueUp.sol";

contract TrueUpTest is Test {
    TrueUp internal t;

    address internal owner = makeAddr("owner");
    address internal creator = makeAddr("creator");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");
    address internal dave = makeAddr("dave");
    address internal eve = makeAddr("eve");

    uint256 internal constant STAKE = 0.2 ether;
    uint64 internal constant DAY = 1 days;

    function setUp() public {
        vm.warp(1_760_000_000);
        t = new TrueUp(owner, 10, 100 ether);
        address[6] memory people = [creator, alice, bob, carol, dave, eve];
        for (uint256 i; i < people.length; i++) vm.deal(people[i], 100 ether);
    }

    // ---------------------------------------------------------------- helpers

    function _create() internal returns (uint256 id) {
        vm.prank(creator);
        id = t.createMarket("Will Maya finish the 5K on Saturday?", "She finishes", "She does not finish", STAKE, uint64(block.timestamp + DAY));
    }

    function _join(uint256 id, address who, uint8 side) internal {
        vm.prank(who);
        t.join{value: STAKE}(id, side);
    }

    /// alice, bob, carol on A; dave, eve on B
    function _createJoined() internal returns (uint256 id) {
        id = _create();
        _join(id, alice, 1);
        _join(id, bob, 1);
        _join(id, carol, 1);
        _join(id, dave, 2);
        _join(id, eve, 2);
    }

    function _afterDeadline(uint256 id) internal {
        vm.warp(t.getMarket(id).deadline);
    }

    function _afterTimeout(uint256 id) internal {
        TrueUp.Market memory m = t.getMarket(id);
        vm.warp(m.deadline + m.settlementTimeout);
    }

    // ---------------------------------------------------------------- create

    function test_create_recordsTermsAndCapturesFee() public {
        uint256 id = _create();
        assertEq(id, 1);
        assertEq(t.marketCount(), 1);
        TrueUp.Market memory m = t.getMarket(id);
        assertEq(m.creator, creator);
        assertEq(m.stake, STAKE);
        assertEq(m.deadline, block.timestamp + DAY);
        assertEq(m.settlementTimeout, 72 hours);
        assertEq(m.status, t.OPEN());
        assertEq(m.feeBps, 10);
        assertEq(m.countA + m.countB, 0);
        assertFalse(m.creatorJoined);
    }

    function test_create_doesNotJoinCreator() public {
        uint256 id = _create();
        (uint8 side,) = t.positionOf(id, creator);
        assertEq(side, 0);
        assertEq(address(t).balance, 0);
    }

    function test_create_rejectsBadText() public {
        vm.startPrank(creator);
        uint64 d = uint64(block.timestamp + DAY);
        vm.expectRevert(TrueUp.InvalidText.selector);
        t.createMarket("", "A", "B", STAKE, d);
        vm.expectRevert(TrueUp.InvalidText.selector);
        t.createMarket("   ", "A", "B", STAKE, d);
        vm.expectRevert(TrueUp.InvalidText.selector);
        t.createMarket("Q", "", "B", STAKE, d);
        vm.expectRevert(TrueUp.InvalidText.selector);
        t.createMarket(string(new bytes(281)), "A", "B", STAKE, d);
        vm.expectRevert(TrueUp.InvalidText.selector);
        t.createMarket("Q", "A", string(new bytes(97)), STAKE, d);
        vm.stopPrank();
    }

    function test_create_rejectsSameOptionsAfterNormalising() public {
        vm.prank(creator);
        vm.expectRevert(TrueUp.SameOptions.selector);
        t.createMarket("Q", "Yes", "  yes ", STAKE, uint64(block.timestamp + DAY));
    }

    function test_create_rejectsStakeOutOfRange() public {
        vm.startPrank(creator);
        uint64 d = uint64(block.timestamp + DAY);
        vm.expectRevert(TrueUp.StakeOutOfRange.selector);
        t.createMarket("Q", "A", "B", 0, d);
        vm.expectRevert(TrueUp.StakeOutOfRange.selector);
        t.createMarket("Q", "A", "B", 0.0009 ether, d);
        vm.expectRevert(TrueUp.StakeOutOfRange.selector);
        t.createMarket("Q", "A", "B", 100 ether + 1, d);
        vm.stopPrank();
    }

    function test_create_rejectsDeadlineOutOfRange() public {
        vm.startPrank(creator);
        vm.expectRevert(TrueUp.DeadlineOutOfRange.selector);
        t.createMarket("Q", "A", "B", STAKE, uint64(block.timestamp - 1));
        vm.expectRevert(TrueUp.DeadlineOutOfRange.selector);
        t.createMarket("Q", "A", "B", STAKE, uint64(block.timestamp + 59 minutes));
        vm.expectRevert(TrueUp.DeadlineOutOfRange.selector);
        t.createMarket("Q", "A", "B", STAKE, uint64(block.timestamp + 30 days + 1));
        vm.stopPrank();
    }

    // ---------------------------------------------------------------- join

    function test_join_holdsStakeInEscrow() public {
        uint256 id = _createJoined();
        TrueUp.Market memory m = t.getMarket(id);
        assertEq(m.countA, 3);
        assertEq(m.countB, 2);
        assertEq(m.totalEscrow, 5 * STAKE);
        assertEq(address(t).balance, 5 * STAKE);
        (uint8 side, bool claimed) = t.positionOf(id, dave);
        assertEq(side, 2);
        assertFalse(claimed);
    }

    function test_join_requiresExactStake() public {
        uint256 id = _create();
        vm.startPrank(alice);
        vm.expectRevert(TrueUp.WrongStake.selector);
        t.join{value: STAKE - 1}(id, 1);
        vm.expectRevert(TrueUp.WrongStake.selector);
        t.join{value: STAKE + 1}(id, 1);
        vm.stopPrank();
        assertEq(address(t).balance, 0);
    }

    function test_join_rejectsDuplicateAndOtherSide() public {
        uint256 id = _create();
        _join(id, alice, 1);
        vm.startPrank(alice);
        vm.expectRevert(TrueUp.AlreadyJoined.selector);
        t.join{value: STAKE}(id, 1);
        vm.expectRevert(TrueUp.AlreadyJoined.selector);
        t.join{value: STAKE}(id, 2);
        vm.stopPrank();
    }

    function test_join_rejectsAtAndAfterDeadline() public {
        uint256 id = _create();
        _afterDeadline(id);
        vm.prank(alice);
        vm.expectRevert(TrueUp.EntriesClosed.selector);
        t.join{value: STAKE}(id, 1);
    }

    function test_join_rejectsInvalidSideAndUnknownMarket() public {
        uint256 id = _create();
        vm.startPrank(alice);
        vm.expectRevert(TrueUp.InvalidSide.selector);
        t.join{value: STAKE}(id, 0);
        vm.expectRevert(TrueUp.InvalidSide.selector);
        t.join{value: STAKE}(id, 3);
        vm.expectRevert(TrueUp.UnknownMarket.selector);
        t.join{value: STAKE}(99, 1);
        vm.stopPrank();
    }

    function test_join_creatorJoinsLikeAnyoneElse() public {
        uint256 id = _create();
        _join(id, creator, 2);
        assertTrue(t.getMarket(id).creatorJoined);
    }

    // ---------------------------------------------------------------- settle

    function test_settle_onlyCreator_onlyAfterDeadline_onlyOnce() public {
        uint256 id = _createJoined();

        vm.prank(creator);
        vm.expectRevert(TrueUp.TooEarly.selector);
        t.settle(id, 1);

        _afterDeadline(id);
        vm.prank(alice);
        vm.expectRevert(TrueUp.NotCreator.selector);
        t.settle(id, 1);

        vm.prank(creator);
        vm.expectRevert(TrueUp.InvalidSide.selector);
        t.settle(id, 3);

        vm.prank(creator);
        t.settle(id, 1);
        assertEq(t.getMarket(id).status, t.RESOLVED_A());

        vm.prank(creator);
        vm.expectRevert(TrueUp.MarketNotOpen.selector);
        t.settle(id, 2);
        assertEq(t.getMarket(id).status, t.RESOLVED_A());
    }

    function test_settle_rejectedAfterSettlementWindow() public {
        uint256 id = _createJoined();
        _afterTimeout(id);
        vm.prank(creator);
        vm.expectRevert(TrueUp.SettlementWindowOver.selector);
        t.settle(id, 1);
    }

    function test_settle_rejectedForOneSidedMarket() public {
        uint256 id = _create();
        _join(id, alice, 1);
        _join(id, bob, 1);
        _afterDeadline(id);
        vm.prank(creator);
        vm.expectRevert(TrueUp.OneSidedMarket.selector);
        t.settle(id, 1);
    }

    function test_settle_paysWinnersEquallyAndFeeOnce() public {
        uint256 id = _createJoined(); // pot 1.0 BOT, 3 winners on A
        _afterDeadline(id);
        vm.prank(creator);
        t.settle(id, 1);

        uint256 pot = 5 * STAKE;
        uint256 fee = (pot * 10) / 10_000;
        uint256 each = (pot - fee) / 3;
        uint256 dust = pot - fee - each * 3;
        assertEq(t.payoutPerWinner(id), each);
        assertEq(t.accruedFees(), fee + dust);

        uint256 before = alice.balance;
        vm.prank(alice);
        t.claimWinnings(id);
        assertEq(alice.balance - before, each);
        vm.prank(bob);
        t.claimWinnings(id);
        vm.prank(carol);
        t.claimWinnings(id);

        // every wei is accounted for: three payouts plus the protocol's take
        assertEq(address(t).balance, t.accruedFees());
    }

    // ---------------------------------------------------------------- claims

    function test_claim_onlyOncePerWinner() public {
        uint256 id = _createJoined();
        _afterDeadline(id);
        vm.prank(creator);
        t.settle(id, 2);
        vm.prank(dave);
        t.claimWinnings(id);
        vm.prank(dave);
        vm.expectRevert(TrueUp.AlreadyClaimed.selector);
        t.claimWinnings(id);
        (, bool claimed) = t.positionOf(id, dave);
        assertTrue(claimed);
    }

    function test_claim_losersAndOutsidersGetNothing() public {
        uint256 id = _createJoined();
        _afterDeadline(id);
        vm.prank(creator);
        t.settle(id, 2);
        vm.prank(alice);
        vm.expectRevert(TrueUp.NotAWinner.selector);
        t.claimWinnings(id);
        vm.prank(creator);
        vm.expectRevert(TrueUp.NotAWinner.selector);
        t.claimWinnings(id);
    }

    function test_claim_notBeforeSettlement() public {
        uint256 id = _createJoined();
        _afterDeadline(id);
        vm.prank(alice);
        vm.expectRevert(TrueUp.NotResolved.selector);
        t.claimWinnings(id);
    }

    // ---------------------------------------------------------------- refunds

    function test_refunds_permissionlessAfterTimeout_noFee() public {
        uint256 id = _createJoined();

        _afterDeadline(id);
        vm.prank(eve);
        vm.expectRevert(TrueUp.RefundsNotAvailable.selector);
        t.openRefunds(id);

        _afterTimeout(id);
        address stranger = makeAddr("stranger");
        vm.prank(stranger);
        t.openRefunds(id);
        assertEq(t.getMarket(id).status, t.REFUNDABLE());

        address[5] memory people = [alice, bob, carol, dave, eve];
        for (uint256 i; i < people.length; i++) {
            uint256 before = people[i].balance;
            vm.prank(people[i]);
            t.claimRefund(id);
            assertEq(people[i].balance - before, STAKE);
        }
        assertEq(t.accruedFees(), 0);
        assertEq(address(t).balance, 0);
    }

    function test_refunds_onlyOnce_andOnlyParticipants() public {
        uint256 id = _createJoined();
        _afterTimeout(id);
        vm.prank(alice);
        t.claimRefund(id); // opens refunds and pays
        vm.prank(alice);
        vm.expectRevert(TrueUp.AlreadyClaimed.selector);
        t.claimRefund(id);
        vm.prank(creator);
        vm.expectRevert(TrueUp.NotParticipant.selector);
        t.claimRefund(id);
    }

    function test_refunds_oneSidedMarketAtDeadline() public {
        uint256 id = _create();
        _join(id, alice, 1);
        _join(id, bob, 1);

        vm.prank(alice);
        vm.expectRevert(TrueUp.NotRefundable.selector);
        t.claimRefund(id); // before the deadline nothing is refundable

        _afterDeadline(id);
        vm.prank(alice);
        t.claimRefund(id);
        assertEq(t.getMarket(id).status, t.REFUNDABLE());
        vm.prank(bob);
        t.claimRefund(id);
        assertEq(address(t).balance, 0);
        assertEq(t.accruedFees(), 0);
    }

    function test_refunds_emptyMarketCanBeClosed() public {
        uint256 id = _create();
        _afterDeadline(id);
        t.openRefunds(id);
        assertEq(t.getMarket(id).status, t.REFUNDABLE());
    }

    function test_settledMarketCannotBecomeRefundable() public {
        uint256 id = _createJoined();
        _afterDeadline(id);
        vm.prank(creator);
        t.settle(id, 1);
        _afterTimeout(id);
        vm.expectRevert(TrueUp.MarketNotOpen.selector);
        t.openRefunds(id);
        vm.prank(dave);
        vm.expectRevert(TrueUp.NotRefundable.selector);
        t.claimRefund(id);
    }

    function test_refundedMarketCannotBeSettled() public {
        uint256 id = _createJoined();
        _afterTimeout(id);
        t.openRefunds(id);
        vm.prank(creator);
        vm.expectRevert(TrueUp.MarketNotOpen.selector);
        t.settle(id, 1);
        vm.prank(alice);
        vm.expectRevert(TrueUp.NotResolved.selector);
        t.claimWinnings(id);
    }

    // ---------------------------------------------------------------- fees and owner

    function test_fee_changeIsNotRetroactive() public {
        uint256 first = _createJoined();
        vm.prank(owner);
        t.setFeeBps(500);
        uint256 second = _create();
        assertEq(t.getMarket(first).feeBps, 10);
        assertEq(t.getMarket(second).feeBps, 500);
    }

    function test_fee_capEnforced() public {
        vm.prank(owner);
        vm.expectRevert(TrueUp.FeeTooHigh.selector);
        t.setFeeBps(501);
        vm.expectRevert(TrueUp.FeeTooHigh.selector);
        new TrueUp(owner, 501, 100 ether);
    }

    function test_owner_onlyOwnerConfiguresAndWithdraws() public {
        vm.startPrank(alice);
        vm.expectRevert(TrueUp.NotOwner.selector);
        t.setFeeBps(20);
        vm.expectRevert(TrueUp.NotOwner.selector);
        t.setMaxStake(1 ether);
        vm.expectRevert(TrueUp.NotOwner.selector);
        t.withdrawFees(payable(alice));
        vm.stopPrank();
    }

    function test_withdrawFees_neverTouchesStakes() public {
        uint256 settled = _createJoined();
        uint256 stillOpen = _createJoined();
        _afterDeadline(settled);
        vm.prank(creator);
        t.settle(settled, 1);

        uint256 fees = t.accruedFees();
        address payable treasury = payable(makeAddr("treasury"));
        vm.prank(owner);
        t.withdrawFees(treasury);
        assertEq(treasury.balance, fees);
        assertEq(t.accruedFees(), 0);

        // the open market's escrow and the unclaimed winnings are all still here
        assertEq(address(t).balance, t.getMarket(stillOpen).totalEscrow + 3 * t.payoutPerWinner(settled));
    }

    function test_owner_guards() public {
        vm.expectRevert(TrueUp.ZeroAddress.selector);
        new TrueUp(address(0), 10, 100 ether);
        vm.expectRevert(TrueUp.StakeOutOfRange.selector);
        new TrueUp(owner, 10, 0);

        vm.startPrank(owner);
        vm.expectRevert(TrueUp.ZeroAddress.selector);
        t.withdrawFees(payable(address(0)));
        vm.expectRevert(TrueUp.ZeroAddress.selector);
        t.transferOwnership(address(0));
        vm.expectRevert(TrueUp.StakeOutOfRange.selector);
        t.setMaxStake(0.0001 ether);
        t.setMaxStake(1 ether);
        vm.stopPrank();
        assertEq(t.maxStake(), 1 ether);

        vm.prank(creator);
        vm.expectRevert(TrueUp.StakeOutOfRange.selector);
        t.createMarket("Q", "A", "B", 2 ether, uint64(block.timestamp + DAY));
    }

    function test_ownership_twoStep() public {
        vm.prank(owner);
        t.transferOwnership(alice);
        assertEq(t.owner(), owner);
        vm.prank(bob);
        vm.expectRevert(TrueUp.NotPendingOwner.selector);
        t.acceptOwnership();
        vm.prank(alice);
        t.acceptOwnership();
        assertEq(t.owner(), alice);
    }

    // ---------------------------------------------------------------- dust

    function test_dust_goesToProtocolNeverStuck() public {
        // 0.001 BOT stake, 3 people: pot 3_000_000_000_000_000 wei, fee 0.1% = 3_000_000_000_000 wei,
        // distributable 2_997_000_000_000_000, two winners → each 1_498_500_000_000_000, no dust;
        // with 7 people and 3 winners the split is uneven and leaves dust.
        vm.prank(creator);
        uint256 id = t.createMarket("Odd split?", "Yes", "No", 0.001 ether + 1, uint64(block.timestamp + DAY));
        address[7] memory people = [alice, bob, carol, dave, eve, creator, makeAddr("fred")];
        vm.deal(people[6], 1 ether);
        for (uint256 i; i < 7; i++) {
            vm.prank(people[i]);
            t.join{value: 0.001 ether + 1}(id, i < 3 ? 1 : 2);
        }
        _afterDeadline(id);
        vm.prank(creator);
        t.settle(id, 1);

        uint256 pot = 7 * (0.001 ether + 1);
        uint256 fee = (pot * 10) / 10_000;
        uint256 each = (pot - fee) / 3;
        uint256 dust = pot - fee - 3 * each;
        assertGt(dust, 0, "this split should leave a remainder");
        assertLt(dust, 3);
        assertEq(t.accruedFees(), fee + dust);

        for (uint256 i; i < 3; i++) {
            vm.prank(people[i]);
            t.claimWinnings(id);
        }
        assertEq(address(t).balance, t.accruedFees());
    }

    // ---------------------------------------------------------------- fuzz

    /// For any stake, fee and split, payouts plus the protocol's take equal the pot exactly.
    function testFuzz_settlementConservesValue(uint96 rawStake, uint8 rawA, uint8 rawB, uint16 rawFee, bool aWins) public {
        uint256 stake = bound(uint256(rawStake), 0.001 ether, 100 ether);
        uint256 countA = bound(uint256(rawA), 1, 25);
        uint256 countB = bound(uint256(rawB), 1, 25);
        uint16 fee = uint16(bound(uint256(rawFee), 0, 500));

        vm.prank(owner);
        t.setFeeBps(fee);
        vm.prank(creator);
        uint256 id = t.createMarket("Fuzz?", "A", "B", stake, uint64(block.timestamp + DAY));

        address[] memory a = new address[](countA);
        address[] memory b = new address[](countB);
        for (uint256 i; i < countA; i++) {
            a[i] = address(uint160(0x10000 + i));
            vm.deal(a[i], stake);
            vm.prank(a[i]);
            t.join{value: stake}(id, 1);
        }
        for (uint256 i; i < countB; i++) {
            b[i] = address(uint160(0x20000 + i));
            vm.deal(b[i], stake);
            vm.prank(b[i]);
            t.join{value: stake}(id, 2);
        }

        _afterDeadline(id);
        vm.prank(creator);
        t.settle(id, aWins ? 1 : 2);

        address[] memory winners = aWins ? a : b;
        uint256 paid;
        for (uint256 i; i < winners.length; i++) {
            uint256 before = winners[i].balance;
            vm.prank(winners[i]);
            t.claimWinnings(id);
            paid += winners[i].balance - before;
        }
        assertEq(paid + t.accruedFees(), stake * (countA + countB));
        assertEq(address(t).balance, t.accruedFees());
        assertLt(t.accruedFees() - (stake * (countA + countB) * fee) / 10_000, winners.length);
    }

    /// Refunds always return exactly what went in, with no fee.
    function testFuzz_refundsReturnEveryStake(uint96 rawStake, uint8 rawA, uint8 rawB) public {
        uint256 stake = bound(uint256(rawStake), 0.001 ether, 100 ether);
        uint256 countA = bound(uint256(rawA), 0, 20);
        uint256 countB = bound(uint256(rawB), 0, 20);
        vm.prank(creator);
        uint256 id = t.createMarket("Fuzz?", "A", "B", stake, uint64(block.timestamp + DAY));
        uint256 n = countA + countB;
        for (uint256 i; i < n; i++) {
            address p = address(uint160(0x30000 + i));
            vm.deal(p, stake);
            vm.prank(p);
            t.join{value: stake}(id, i < countA ? 1 : 2);
        }
        _afterTimeout(id);
        for (uint256 i; i < n; i++) {
            address p = address(uint160(0x30000 + i));
            vm.prank(p);
            t.claimRefund(id);
            assertEq(p.balance, stake);
        }
        assertEq(address(t).balance, 0);
        assertEq(t.accruedFees(), 0);
    }
}

/// A winner whose receive hook tries to claim again in the same call.
contract Reenterer {
    TrueUp internal immutable t;
    uint256 internal id;
    bool internal tried;

    constructor(TrueUp t_) {
        t = t_;
    }

    function join(uint256 id_, uint8 side) external payable {
        id = id_;
        t.join{value: msg.value}(id_, side);
    }

    function claim() external {
        t.claimWinnings(id);
    }

    receive() external payable {
        if (!tried) {
            tried = true;
            t.claimWinnings(id); // must revert, which reverts the whole claim
        }
    }
}

contract TrueUpReentrancyTest is Test {
    function test_reentrantClaimCannotDoubleClaim() public {
        vm.warp(1_760_000_000);
        TrueUp t = new TrueUp(address(this), 10, 100 ether);
        address creator = makeAddr("creator");
        vm.prank(creator);
        uint256 id = t.createMarket("Q", "A", "B", 1 ether, uint64(block.timestamp + 1 days));

        Reenterer r = new Reenterer(t);
        vm.deal(address(this), 10 ether);
        r.join{value: 1 ether}(id, 1);
        address loser = makeAddr("loser");
        vm.deal(loser, 1 ether);
        vm.prank(loser);
        t.join{value: 1 ether}(id, 2);

        vm.warp(block.timestamp + 1 days);
        vm.prank(creator);
        t.settle(id, 1);

        vm.expectRevert(TrueUp.TransferFailed.selector);
        r.claim();
        (, bool claimed) = t.positionOf(id, address(r));
        assertFalse(claimed, "the failed claim left nothing behind");
        assertEq(address(t).balance, 2 ether);
    }
}
