// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title TrueUp
/// @notice Two-outcome prediction pools between friends, staked in native BOT.
///
/// Lifecycle (status is monotonic; no market ever returns to Open):
///   Open ──(creator settles, after the deadline, within the settlement window)──▶ ResolvedA | ResolvedB
///   Open ──(anyone, after deadline + 72 h, or after the deadline if a side is empty)──▶ Refundable
/// "Awaiting result" is not stored: it is Open with the deadline passed.
///
/// Trust model: the creator reports the outcome. The contract enforces who may report, when, and how
/// the pot is paid out; it cannot check what happened in the real world.
///
/// Money rules:
///   - Every participant stakes exactly the market's fixed stake. One position per wallet per market.
///   - On settlement: fee = pot * feeBps / 10_000, with feeBps captured when the market was created.
///     Each winner may claim floor((pot - fee) / winners). The rounding remainder ("dust", at most
///     winners - 1 wei) is added to the protocol fee balance, so no wei is ever left unclaimable.
///   - Refundable markets pay no fee: each participant claims back exactly their stake.
///   - All payouts are pulled by the recipient, once. No loops over participants.
contract TrueUp {
    // ---------------------------------------------------------------- constants

    uint8 public constant OPEN = 0;
    uint8 public constant RESOLVED_A = 1;
    uint8 public constant RESOLVED_B = 2;
    uint8 public constant REFUNDABLE = 3;

    uint64 public constant SETTLEMENT_TIMEOUT = 72 hours;
    uint16 public constant MAX_FEE_BPS = 500; // 5%, hard cap
    uint64 public constant MIN_DURATION = 1 hours;
    uint64 public constant MAX_DURATION = 30 days;
    uint256 public constant MIN_STAKE = 0.001 ether;
    uint256 public constant MAX_QUESTION_BYTES = 280;
    uint256 public constant MAX_OPTION_BYTES = 96;

    // ---------------------------------------------------------------- storage

    struct Market {
        address creator;
        string question;
        string optionA;
        string optionB;
        uint256 stake;
        uint64 createdAt;
        uint64 deadline;
        uint64 settlementTimeout;
        uint8 status;
        uint32 countA;
        uint32 countB;
        uint256 totalEscrow;
        uint16 feeBps;
        bool creatorJoined;
    }

    struct Position {
        uint8 side; // 0 none, 1 option A, 2 option B
        bool claimed;
    }

    address public owner;
    address public pendingOwner;
    /// @notice Fee in basis points applied to markets created from now on. Existing markets keep theirs.
    uint16 public feeBps;
    /// @notice Largest stake a new market may set. Existing markets keep theirs.
    uint256 public maxStake;
    /// @notice Protocol fees (and settlement dust) not yet withdrawn.
    uint256 public accruedFees;
    uint256 public marketCount;

    mapping(uint256 => Market) private _markets;
    mapping(uint256 => mapping(address => Position)) private _positions;
    /// @notice What each winning position may claim, fixed at settlement.
    mapping(uint256 => uint256) public payoutPerWinner;

    uint256 private _locked = 1;

    // ---------------------------------------------------------------- events

    event MarketCreated(uint256 indexed marketId, address indexed creator, uint256 stake, uint64 deadline, uint16 feeBps);
    event ParticipantJoined(uint256 indexed marketId, address indexed account, uint8 side, uint256 amount);
    /// @param fee the protocol's take from this pot: the fee plus any rounding dust
    event MarketSettled(uint256 indexed marketId, uint8 outcome, uint256 fee);
    event RefundsOpened(uint256 indexed marketId, address indexed by);
    event WinningsClaimed(uint256 indexed marketId, address indexed account, uint256 amount);
    event StakeRefunded(uint256 indexed marketId, address indexed account, uint256 amount);
    event ProtocolFeeWithdrawn(address indexed to, uint256 amount);
    event FeeChanged(uint16 feeBps);
    event MaxStakeChanged(uint256 maxStake);
    event OwnershipTransferStarted(address indexed from, address indexed to);
    event OwnershipTransferred(address indexed from, address indexed to);

    // ---------------------------------------------------------------- errors

    error NotOwner();
    error NotPendingOwner();
    error ZeroAddress();
    error FeeTooHigh();
    error InvalidText();
    error SameOptions();
    error StakeOutOfRange();
    error DeadlineOutOfRange();
    error UnknownMarket();
    error MarketNotOpen();
    error EntriesClosed();
    error InvalidSide();
    error WrongStake();
    error AlreadyJoined();
    error NotCreator();
    error TooEarly();
    error SettlementWindowOver();
    error OneSidedMarket();
    error RefundsNotAvailable();
    error NotResolved();
    error NotRefundable();
    error NotAWinner();
    error NotParticipant();
    error AlreadyClaimed();
    error TransferFailed();
    error Reentrancy();

    // ---------------------------------------------------------------- modifiers

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (_locked != 1) revert Reentrancy();
        _locked = 2;
        _;
        _locked = 1;
    }

    constructor(address owner_, uint16 feeBps_, uint256 maxStake_) {
        if (owner_ == address(0)) revert ZeroAddress();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        if (maxStake_ < MIN_STAKE) revert StakeOutOfRange();
        owner = owner_;
        feeBps = feeBps_;
        maxStake = maxStake_;
        emit OwnershipTransferred(address(0), owner_);
        emit FeeChanged(feeBps_);
        emit MaxStakeChanged(maxStake_);
    }

    // ---------------------------------------------------------------- markets

    function createMarket(
        string calldata question,
        string calldata optionA,
        string calldata optionB,
        uint256 stake,
        uint64 deadline
    ) external returns (uint256 marketId) {
        _checkText(question, MAX_QUESTION_BYTES);
        _checkText(optionA, MAX_OPTION_BYTES);
        _checkText(optionB, MAX_OPTION_BYTES);
        if (_normalizedHash(optionA) == _normalizedHash(optionB)) revert SameOptions();
        if (stake < MIN_STAKE || stake > maxStake) revert StakeOutOfRange();
        if (deadline < block.timestamp + MIN_DURATION || deadline > block.timestamp + MAX_DURATION) {
            revert DeadlineOutOfRange();
        }

        marketId = ++marketCount;
        Market storage m = _markets[marketId];
        m.creator = msg.sender;
        m.question = question;
        m.optionA = optionA;
        m.optionB = optionB;
        m.stake = stake;
        m.createdAt = uint64(block.timestamp);
        m.deadline = deadline;
        m.settlementTimeout = SETTLEMENT_TIMEOUT;
        m.status = OPEN;
        m.feeBps = feeBps; // captured now; later fee changes never touch this market

        emit MarketCreated(marketId, msg.sender, stake, deadline, m.feeBps);
    }

    function join(uint256 marketId, uint8 side) external payable {
        Market storage m = _market(marketId);
        if (m.status != OPEN) revert MarketNotOpen();
        if (block.timestamp >= m.deadline) revert EntriesClosed();
        if (side != 1 && side != 2) revert InvalidSide();
        if (msg.value != m.stake) revert WrongStake();
        Position storage p = _positions[marketId][msg.sender];
        if (p.side != 0) revert AlreadyJoined();

        p.side = side;
        if (side == 1) m.countA += 1;
        else m.countB += 1;
        m.totalEscrow += msg.value;
        if (msg.sender == m.creator) m.creatorJoined = true;

        emit ParticipantJoined(marketId, msg.sender, side, msg.value);
    }

    /// @notice The creator reports the outcome: after the deadline, before deadline + 72 h, once.
    function settle(uint256 marketId, uint8 outcome) external {
        Market storage m = _market(marketId);
        if (msg.sender != m.creator) revert NotCreator();
        if (m.status != OPEN) revert MarketNotOpen();
        if (block.timestamp < m.deadline) revert TooEarly();
        if (block.timestamp >= m.deadline + m.settlementTimeout) revert SettlementWindowOver();
        if (outcome != 1 && outcome != 2) revert InvalidSide();
        if (m.countA == 0 || m.countB == 0) revert OneSidedMarket();

        uint256 pot = m.totalEscrow;
        uint256 fee = (pot * m.feeBps) / 10_000;
        uint256 distributable = pot - fee;
        uint256 winners = outcome == 1 ? m.countA : m.countB;
        uint256 each = distributable / winners;
        uint256 dust = distributable - each * winners;

        m.status = outcome; // RESOLVED_A == 1, RESOLVED_B == 2
        payoutPerWinner[marketId] = each;
        accruedFees += fee + dust;

        emit MarketSettled(marketId, outcome, fee + dust);
    }

    /// @notice Anyone may switch a market to refunds once the creator's window has passed, or as soon
    /// as the deadline passes if either side is empty.
    function openRefunds(uint256 marketId) public {
        Market storage m = _market(marketId);
        if (m.status != OPEN) revert MarketNotOpen();
        if (!_refundsAvailable(m)) revert RefundsNotAvailable();
        m.status = REFUNDABLE;
        emit RefundsOpened(marketId, msg.sender);
    }

    function claimWinnings(uint256 marketId) external nonReentrant {
        Market storage m = _market(marketId);
        if (m.status != RESOLVED_A && m.status != RESOLVED_B) revert NotResolved();
        Position storage p = _positions[marketId][msg.sender];
        if (p.side != m.status) revert NotAWinner();
        if (p.claimed) revert AlreadyClaimed();

        p.claimed = true;
        uint256 amount = payoutPerWinner[marketId];
        emit WinningsClaimed(marketId, msg.sender, amount);
        _send(msg.sender, amount);
    }

    /// @notice Take your stake back from a refundable market. If refunds are due but nobody has opened
    /// them yet, this opens them first.
    function claimRefund(uint256 marketId) external nonReentrant {
        Market storage m = _market(marketId);
        if (m.status == OPEN && _refundsAvailable(m)) {
            m.status = REFUNDABLE;
            emit RefundsOpened(marketId, msg.sender);
        }
        if (m.status != REFUNDABLE) revert NotRefundable();
        Position storage p = _positions[marketId][msg.sender];
        if (p.side == 0) revert NotParticipant();
        if (p.claimed) revert AlreadyClaimed();

        p.claimed = true;
        uint256 amount = m.stake;
        emit StakeRefunded(marketId, msg.sender, amount);
        _send(msg.sender, amount);
    }

    // ---------------------------------------------------------------- views

    function getMarket(uint256 marketId) external view returns (Market memory) {
        return _market(marketId);
    }

    function positionOf(uint256 marketId, address account) external view returns (uint8 side, bool claimed) {
        Position storage p = _positions[marketId][account];
        return (p.side, p.claimed);
    }

    // ---------------------------------------------------------------- owner

    /// @notice Changes the fee for markets created after this call. Capped at 5%.
    function setFeeBps(uint16 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        feeBps = newFeeBps;
        emit FeeChanged(newFeeBps);
    }

    function setMaxStake(uint256 newMaxStake) external onlyOwner {
        if (newMaxStake < MIN_STAKE) revert StakeOutOfRange();
        maxStake = newMaxStake;
        emit MaxStakeChanged(newMaxStake);
    }

    /// @notice Withdraws accrued protocol fees. Never touches stakes held for markets.
    function withdrawFees(address payable to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 amount = accruedFees;
        accruedFees = 0;
        emit ProtocolFeeWithdrawn(to, amount);
        _send(to, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }

    // ---------------------------------------------------------------- internals

    function _market(uint256 marketId) private view returns (Market storage m) {
        m = _markets[marketId];
        if (m.creator == address(0)) revert UnknownMarket();
    }

    function _refundsAvailable(Market storage m) private view returns (bool) {
        if (block.timestamp < m.deadline) return false;
        if (m.countA == 0 || m.countB == 0) return true;
        return block.timestamp >= m.deadline + m.settlementTimeout;
    }

    function _send(address to, uint256 amount) private {
        if (amount == 0) return;
        (bool ok,) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    /// @dev Non-empty after trimming ASCII whitespace, and within the byte limit.
    function _checkText(string calldata s, uint256 maxBytes) private pure {
        bytes calldata b = bytes(s);
        if (b.length == 0 || b.length > maxBytes) revert InvalidText();
        (uint256 start, uint256 end) = _trimmed(b);
        if (start >= end) revert InvalidText();
    }

    /// @dev Hash of the text with ASCII whitespace trimmed and ASCII letters lower-cased, so
    /// "Yes" and " yes " count as the same option.
    function _normalizedHash(string calldata s) private pure returns (bytes32) {
        bytes calldata b = bytes(s);
        (uint256 start, uint256 end) = _trimmed(b);
        bytes memory out = new bytes(end - start);
        for (uint256 i = start; i < end; i++) {
            bytes1 c = b[i];
            out[i - start] = (c >= 0x41 && c <= 0x5A) ? bytes1(uint8(c) + 32) : c;
        }
        return keccak256(out);
    }

    function _trimmed(bytes calldata b) private pure returns (uint256 start, uint256 end) {
        end = b.length;
        while (start < end && _isSpace(b[start])) start++;
        while (end > start && _isSpace(b[end - 1])) end--;
    }

    function _isSpace(bytes1 c) private pure returns (bool) {
        return c == 0x20 || c == 0x09 || c == 0x0A || c == 0x0D;
    }
}
