// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title FaucetRegistry
 * @notice On-chain registry of tokens supported by the faucet.
 */
contract FaucetRegistry is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    struct TokenInfo {
        string  symbol;
        string  name;
        uint8   decimals;
        uint256 dripAmount;
        bool    active;
    }

    address[] public tokenList;
    mapping(address => TokenInfo) private _tokens;

    event TokenRegistered(address indexed token, string symbol, uint256 dripAmount);
    event TokenUpdated(address indexed token, uint256 dripAmount, bool active);

    error AlreadyRegistered(address token);
    error NotRegistered(address token);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    function registerToken(
        address token,
        string calldata symbol,
        string calldata name_,
        uint8 decimals_,
        uint256 dripAmount
    ) external onlyRole(REGISTRAR_ROLE) {
        if (_tokens[token].active) revert AlreadyRegistered(token);
        _tokens[token] = TokenInfo(symbol, name_, decimals_, dripAmount, true);
        tokenList.push(token);
        emit TokenRegistered(token, symbol, dripAmount);
    }

    function setDripAmount(address token, uint256 amount) external onlyRole(REGISTRAR_ROLE) {
        if (!_tokens[token].active) revert NotRegistered(token);
        _tokens[token].dripAmount = amount;
        emit TokenUpdated(token, amount, true);
    }

    function deactivateToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _tokens[token].active = false;
        emit TokenUpdated(token, 0, false);
    }

    function getToken(address token) external view returns (TokenInfo memory) {
        return _tokens[token];
    }

    function isRegistered(address token) external view returns (bool) {
        return _tokens[token].active;
    }

    function allTokens() external view returns (address[] memory) {
        return tokenList;
    }
}
