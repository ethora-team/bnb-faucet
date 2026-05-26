// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./interfaces/IFaucetController.sol";
import "./interfaces/IMockToken.sol";
import "./FaucetRegistry.sol";

/**
 * @title FaucetController
 * @author Ethora Labs
 * @notice UUPS-upgradeable drip controller for the Ethora BNB Testnet Faucet.
 *
 * Responsibilities:
 *  - Enforces per-wallet cooldown windows (default: 24 h)
 *  - Enforces per-token daily rate limits (global)
 *  - Mints registered MockToken amounts to the requesting wallet
 *  - Emits structured events for the off-chain indexer
 *
 * Access roles:
 *  - DEFAULT_ADMIN_ROLE  — can upgrade, pause, and set parameters
 *  - OPERATOR_ROLE       — can call drip() programmatically (used by the API)
 *  - PAUSER_ROLE         — can pause/unpause without full admin
 */
contract FaucetController is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    IFaucetController
{
    // ─── Roles ────────────────────────────────────────────────────────────────

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE   = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ─── Storage ──────────────────────────────────────────────────────────────

    FaucetRegistry public registry;

    /// @notice Default cooldown period per wallet (seconds)
    uint256 public defaultCooldown;

    /// @notice Optional per-wallet cooldown override (0 = use defaultCooldown)
    mapping(address => uint256) public cooldownOverride;

    /// @notice Timestamp when the cooldown expires for a wallet
    mapping(address => uint256) public cooldownExpiry;

    /// @notice Rolling 24-h drip count per token (resets each epoch)
    mapping(address => uint256) public dailyDripCount;
    mapping(address => uint256) public dailyEpoch;

    /// @notice Maximum drips per token per 24-h window (0 = unlimited)
    mapping(address => uint256) public dailyLimit;

    // ─── Events ───────────────────────────────────────────────────────────────

    event Drip(
        address indexed wallet,
        address indexed token,
        uint256 amount,
        uint256 cooldownExpiry
    );
    event CooldownUpdated(uint256 oldValue, uint256 newValue);
    event DailyLimitSet(address indexed token, uint256 limit);
    event CooldownOverrideSet(address indexed wallet, uint256 duration);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error CooldownActive(address wallet, uint256 expiresAt);
    error TokenNotRegistered(address token);
    error DailyLimitExceeded(address token, uint256 limit);
    error ZeroAddress();

    // ─── Initializer ──────────────────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _registry,
        address _admin,
        uint256 _defaultCooldown
    ) external initializer {
        if (_registry == address(0) || _admin == address(0)) revert ZeroAddress();

        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        registry = FaucetRegistry(_registry);
        defaultCooldown = _defaultCooldown;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
    }

    // ─── Core Logic ───────────────────────────────────────────────────────────

    /**
     * @notice Drip tokens to a wallet. Called by the API operator.
     * @param wallet      Recipient address
     * @param tokenAddrs  Array of token contract addresses to mint
     */
    function drip(
        address wallet,
        address[] calldata tokenAddrs
    ) external nonReentrant whenNotPaused onlyRole(OPERATOR_ROLE) {
        if (wallet == address(0)) revert ZeroAddress();

        uint256 expiry = cooldownExpiry[wallet];
        if (expiry > block.timestamp) revert CooldownActive(wallet, expiry);

        uint256 len = tokenAddrs.length;
        uint256 cooldown = cooldownOverride[wallet] > 0
            ? cooldownOverride[wallet]
            : defaultCooldown;

        for (uint256 i; i < len; ) {
            address tokenAddr = tokenAddrs[i];
            if (!registry.isRegistered(tokenAddr)) revert TokenNotRegistered(tokenAddr);

            _checkAndIncrementDailyLimit(tokenAddr);

            FaucetRegistry.TokenInfo memory info = registry.getToken(tokenAddr);
            IMockToken(tokenAddr).mint(wallet, info.dripAmount);

            emit Drip(wallet, tokenAddr, info.dripAmount, block.timestamp + cooldown);

            unchecked { ++i; }
        }

        cooldownExpiry[wallet] = block.timestamp + cooldown;
    }

    /**
     * @notice Returns whether a wallet is currently on cooldown.
     */
    function isOnCooldown(address wallet) external view returns (bool) {
        return cooldownExpiry[wallet] > block.timestamp;
    }

    /**
     * @notice Returns seconds remaining in cooldown (0 if not on cooldown).
     */
    function cooldownRemaining(address wallet) external view returns (uint256) {
        uint256 expiry = cooldownExpiry[wallet];
        if (expiry <= block.timestamp) return 0;
        return expiry - block.timestamp;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setDefaultCooldown(uint256 _cooldown) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit CooldownUpdated(defaultCooldown, _cooldown);
        defaultCooldown = _cooldown;
    }

    function setCooldownOverride(
        address wallet,
        uint256 duration
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        cooldownOverride[wallet] = duration;
        emit CooldownOverrideSet(wallet, duration);
    }

    function setDailyLimit(
        address token,
        uint256 limit
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        dailyLimit[token] = limit;
        emit DailyLimitSet(token, limit);
    }

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _checkAndIncrementDailyLimit(address token) internal {
        uint256 epoch = block.timestamp / 1 days;
        if (dailyEpoch[token] < epoch) {
            dailyEpoch[token] = epoch;
            dailyDripCount[token] = 0;
        }
        uint256 limit = dailyLimit[token];
        if (limit > 0 && dailyDripCount[token] >= limit) {
            revert DailyLimitExceeded(token, limit);
        }
        unchecked { ++dailyDripCount[token]; }
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}
}
