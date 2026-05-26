// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MockToken
 * @notice Mintable ERC-20 for BSC testnet. Only MINTER_ROLE can mint.
 */
contract MockToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint8 private immutable _decimals;
    string public tokenSymbol;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address admin
    ) ERC20(name_, symbol_) {
        _decimals = decimals_;
        tokenSymbol = symbol_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}
